const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const Product = require("../models/Product");
const mongoose = require("mongoose");

const upload = multer({ dest: "uploads/" });

router.post("/inventory", verifyToken, allowRole(["admin", "super_admin"]), upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "CSV file required" });
  }

  const results = [];
  let inserted = 0;
  let failed = 0;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Read CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => results.push(row))
        .on("end", resolve)
        .on("error", reject);
    });

    // Process each row
    for (const row of results) {
      const { name, sku, category, price, stock, expiry } = row;

      if (!name || !sku || !price || !stock) {
        failed++;
        continue;
      }

      try {
        await Product.create([{
          name,
          sku,
          category: category || null,
          price: Number(price),
          stock: Number(stock),
          expiry_date: expiry || null,
          is_active: 1
        }], { session });
        inserted++;
      } catch (err) {
        // Duplicate SKU or validation error
        failed++;
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, inserted, failed });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ BULK UPLOAD ERROR:", err);
    res.status(500).json({ message: err.message });
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

module.exports = router;