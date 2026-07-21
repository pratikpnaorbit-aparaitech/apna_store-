const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const { createBill } = require("../controllers/billingController");
const Transaction = require("../models/Transaction");
const TransactionItem = require("../models/TransactionItem");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const LoyaltyHistory = require("../models/LoyaltyHistory");
const { sendWhatsApp } = require("../utils/notificationService");
const mongoose = require("mongoose");
const { normalizePhone } = require("../utils/billingInput");

// Generate bill (already MongoDB)
router.post("/", verifyToken, allowRole(["admin", "staff", "super_admin"]), createBill);

// Refund / Cancel bill
router.post("/:id/refund", verifyToken, allowRole(["admin", "super_admin"]), async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid transaction ID" });
  const rawReason = req.body?.reason == null ? "Refunded by store" : req.body.reason;
  if (typeof rawReason !== "string") return res.status(400).json({ message: "Refund reason must be text" });
  const refundReason = rawReason.trim();
  if (refundReason.length < 3 || refundReason.length > 500)
    return res.status(400).json({ message: "Refund reason must be between 3 and 500 characters" });
  if (req.user.role === "admin" && !req.user.storeId)
    return res.status(403).json({ message: "No store is assigned to this account" });
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Claim this successful transaction inside the DB transaction so stock can
    // never be restored twice by concurrent refund requests.
    const transaction = await Transaction.findOneAndUpdate({
      _id: id,
      status: "SUCCESS",
      ...(req.user.role === "super_admin" ? {} : { storeId: req.user.storeId }),
    }, {
      $set: {
        status: "REVERSED",
        refundedAt: new Date(),
        refundedBy: req.user.id,
        refundReason,
        updated_at: new Date(),
      },
    }, { returnDocument: "after", session });
    if (!transaction) {
      const exists = await Transaction.exists({
        _id: id,
        ...(req.user.role === "super_admin" ? {} : { storeId: req.user.storeId }),
      }).session(session);
      const error = new Error(exists ? "Bill is already refunded" : "Transaction not found");
      error.statusCode = exists ? 409 : 404;
      throw error;
    }

    // Get transaction items
    const items = await TransactionItem.find({ transaction_id: id }).session(session);
    if (!items.length) throw Object.assign(new Error("No items found for this transaction"), { statusCode: 409 });

    // Restore stock for each item
    for (const item of items) {
      const restored = await Product.updateOne(
        { _id: item.product_id, ...(transaction.storeId ? { storeId: transaction.storeId } : {}) },
        { $inc: { stock: item.quantity } }
      ).session(session);
      if (restored.matchedCount !== 1)
        throw Object.assign(new Error("A billed product is missing; refund could not be completed"), { statusCode: 409 });
    }

    if (transaction.customer_id) {
      const earned = await LoyaltyHistory.find({
        transaction_id: transaction._id,
        type: "EARNED",
      }).session(session);
      const pointsToReverse = earned.reduce((sum, entry) => sum + Number(entry.points || 0), 0);
      await Customer.updateOne(
        { _id: transaction.customer_id },
        [{
          $set: {
            points: { $max: [0, { $subtract: ["$points", pointsToReverse] }] },
            total_spent: { $max: [0, { $subtract: ["$total_spent", transaction.total] }] },
          },
        }],
        { session, updatePipeline: true },
      );
      if (pointsToReverse > 0)
        await LoyaltyHistory.create([{
          customer_id: transaction.customer_id,
          transaction_id: transaction._id,
          points: pointsToReverse,
          type: "REVERSED",
        }], { session });
    }

    await session.commitTransaction();
    res.json({ success: true, message: "Bill refunded successfully", transaction });

  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    const conflict = err.code === 112 || err.hasErrorLabel?.("TransientTransactionError");
    if (!err.statusCode && !conflict && err.name !== "CastError") console.error("❌ REFUND ERROR:", err);
    res.status(err.statusCode || (conflict ? 409 : err.name === "CastError" ? 400 : 500)).json({
      message: err.statusCode || conflict || err.name === "CastError" ? err.message : "Refund failed. Please try again",
    });
  } finally {
    await session.endSession();
  }
});

// Send bill via WhatsApp (no DB changes)
router.post("/send-whatsapp", verifyToken, allowRole(["admin", "staff", "super_admin"]), async (req, res) => {
  try {
    if (req.user.role !== "super_admin" && !req.user.storeId)
      return res.status(403).json({ message: "No store is assigned to this account" });
    const phone = normalizePhone(req.body?.phone);
    if (!phone) return res.status(400).json({ message: "Customer phone is required" });
    const transactionId = req.body?.transactionId;
    const billNo = req.body?.billNo;
    if (transactionId != null && (typeof transactionId !== "string" || !mongoose.isValidObjectId(transactionId)))
      return res.status(400).json({ message: "Invalid transaction ID" });
    if (!transactionId && (typeof billNo !== "string" || !billNo.trim() || billNo.length > 100))
      return res.status(400).json({ message: "Transaction ID or bill number is required" });
    const transaction = await Transaction.findOne({
      ...(transactionId ? { _id: transactionId } : { bill_no: billNo.trim() }),
      ...(req.user.role === "super_admin" ? {} : { storeId: req.user.storeId }),
    });
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    const message = `
🧾 SmartStore Receipt

Bill No: ${transaction.bill_no}
Total Amount: ₹${Number(transaction.total).toFixed(2)}
Payment: ${transaction.payment_mode}
Status: ${transaction.status}

Thank you for shopping with us!
Visit again 🙏
    `;
    await sendWhatsApp(`+91${phone}`, message);
    res.json({ success: true });
  } catch (err) {
    console.error("WHATSAPP SEND ERROR:", err);
    res.status(500).json({ message: "Failed to send WhatsApp message" });
  }
});

module.exports = router;
