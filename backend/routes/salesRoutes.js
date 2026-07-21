const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const mongoose = require("mongoose");

router.post("/add", verifyToken, allowRole(["admin", "staff", "super_admin"]), async (req, res) => {
  const { product_id, quantity } = req.body;
  if (typeof product_id !== "string" || !mongoose.isValidObjectId(product_id.trim()))
    return res.status(400).json({ message: "Choose a valid product" });
  const normalizedQuantity = Number(quantity);
  if ((typeof quantity !== "string" && typeof quantity !== "number") || quantity === "" || !Number.isInteger(normalizedQuantity) || normalizedQuantity < 1 || normalizedQuantity > 100000)
    return res.status(400).json({ message: "Quantity must be a positive whole number" });
  if (req.user.role !== "super_admin" && !req.user.storeId)
    return res.status(403).json({ message: "No store is assigned to this account" });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Lock and get product
    const product = await Product.findOne({
      _id: product_id.trim(),
      is_active: 1,
      ...(req.user.role === "super_admin" ? {} : { storeId: req.user.storeId }),
    }).session(session);
    if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });
    if (!product.storeId) throw Object.assign(new Error("Product is not assigned to a store"), { statusCode: 409 });
    if (req.body.storeId && String(req.body.storeId) !== String(product.storeId))
      throw Object.assign(new Error("Selected store does not match the product"), { statusCode: 400 });

    const unitPrice = Number(product.discount_price ?? product.price);
    const total = Number((unitPrice * normalizedQuantity).toFixed(2));

    const stockUpdate = await Product.updateOne(
      { _id: product._id, storeId: product.storeId, is_active: 1, stock: { $gte: normalizedQuantity } },
      { $inc: { stock: -normalizedQuantity } },
      { session },
    );
    if (stockUpdate.matchedCount !== 1)
      throw Object.assign(new Error("Not enough stock available"), { statusCode: 409 });

    // Create sale
    await Sale.create([{
      product_id,
      storeId: product.storeId,
      createdBy: req.user.id,
      unit_price: unitPrice,
      quantity: normalizedQuantity,
      total,
      sale_date: new Date()
    }], { session });

    await session.commitTransaction();
    res.json({ success: true, message: "Sale completed successfully", total });
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    const conflict = err.code === 112 || err.hasErrorLabel?.("TransientTransactionError");
    if (!err.statusCode && !conflict && err.name !== "ValidationError") console.error("SALE ERROR:", err);
    res.status(err.statusCode || (conflict ? 409 : err.name === "ValidationError" ? 400 : 500)).json({
      message: err.statusCode || conflict || err.name === "ValidationError" ? err.message : "Sale failed. Please try again",
    });
  } finally {
    await session.endSession();
  }
});

module.exports = router;
