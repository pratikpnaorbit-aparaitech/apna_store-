const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const { createBill } = require("../controllers/billingController");
const Transaction = require("../models/Transaction");
const TransactionItem = require("../models/TransactionItem");
const Product = require("../models/Product");
const { sendWhatsApp } = require("../utils/notificationService");
const mongoose = require("mongoose");

// Generate bill (already MongoDB)
router.post("/", verifyToken, allowRole(["admin", "staff", "super_admin"]), createBill);

// Refund / Cancel bill
router.post("/:id/refund", verifyToken, allowRole(["admin", "super_admin"]), async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find transaction with lock (using session)
    const transaction = await Transaction.findById(id).session(session);
    if (!transaction) throw new Error("Transaction not found");
    if (transaction.status !== "SUCCESS") throw new Error("Bill already refunded or invalid");

    // Get transaction items
    const items = await TransactionItem.find({ transaction_id: id }).session(session);
    if (!items.length) throw new Error("No items found for this transaction");

    // Restore stock for each item
    for (const item of items) {
      await Product.updateOne(
        { _id: item.product_id },
        { $inc: { stock: item.quantity } }
      ).session(session);

      // await StockAudit.create([{ product_id: item.product_id, change_qty: item.quantity, reason: 'REFUND', reference: `REFUND-${id}` }], { session });
    }

    // Mark transaction as reversed
    transaction.status = "REVERSED";
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: "Bill refunded successfully" });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ REFUND ERROR:", err);
    res.status(400).json({ message: err.message });
  }
});

// Send bill via WhatsApp (no DB changes)
router.post("/send-whatsapp", verifyToken, allowRole(["admin", "staff", "super_admin"]), async (req, res) => {
  const { phone, billNo, total } = req.body;
  if (!phone || !billNo || !total) {
    return res.status(400).json({ message: "Phone, bill number and total are required" });
  }

  try {
    const message = `
🧾 SmartStore Receipt

Bill No: ${billNo}
Total Amount: ₹${total}

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