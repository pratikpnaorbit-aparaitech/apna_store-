const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const Product = require("../models/Product");
const Store = require("../models/Store");
const mongoose = require("mongoose");

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, path.extname(file.originalname).toLowerCase() === ".csv");
  },
});

router.post("/inventory", verifyToken, allowRole(["admin", "super_admin"]), upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "CSV file required" });
  }

  const cleanup = () => fs.unlink(req.file.path, () => {});
  const storeId = req.user.role === "super_admin" ? req.body.storeId : req.user.storeId;
  if (!storeId || !mongoose.isValidObjectId(storeId)) {
    cleanup();
    return res.status(400).json({ message: "A store is required for bulk inventory" });
  }
  let storeExists;
  try {
    storeExists = await Store.exists({ _id: storeId, isActive: true });
  } catch (error) {
    cleanup();
    return res.status(500).json({ message: "Unable to validate the selected store" });
  }
  if (!storeExists) {
    cleanup();
    return res.status(400).json({ message: "Choose a valid active store" });
  }

  const results = [];
  let inserted = 0;
  let failed = 0;

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

      if (!name || !sku || !category || price === "" || price == null || stock === "" || stock == null || Number(price) < 0 || Number(stock) < 0) {
        failed++;
        continue;
      }

      try {
        await Product.create({
          name,
          sku,
          category,
          price: Number(price),
          stock: Number(stock),
          expiry_date: expiry || null,
          is_active: 1,
          storeId,
          createdBy: req.user.id,
        });
        inserted++;
      } catch (err) {
        // Duplicate SKU or validation error
        failed++;
      }
    }

    res.json({ success: true, inserted, failed });

  } catch (err) {
    console.error("❌ BULK UPLOAD ERROR:", err);
    res.status(500).json({ message: err.message });
  } finally {
    cleanup();
  }
});

module.exports = router;
