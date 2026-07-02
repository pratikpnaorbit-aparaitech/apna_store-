const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const mongoose = require("mongoose");

router.post("/add", verifyToken, allowRole(["admin", "staff", "super_admin"]), async (req, res) => {
  const { product_id, quantity } = req.body;
  if (!product_id || !quantity) {
    return res.status(400).json({ message: "Product and quantity required" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Lock and get product
    const product = await Product.findById(product_id).session(session);
    if (!product) throw new Error("Product not found");
    if (product.stock < quantity) throw new Error("Not enough stock available");

    const total = product.price * quantity;

    // Create sale
    await Sale.create([{
      product_id,
      quantity,
      total,
      sale_date: new Date()
    }], { session });

    // Update stock
    product.stock -= quantity;
    await product.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: "Sale completed successfully", total });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("SALE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;