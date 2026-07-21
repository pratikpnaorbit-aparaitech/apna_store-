const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const requireStoreContext = require("../middleware/storeContextMiddleware");
const Product = require("../models/Product");
const Store = require("../models/Store");
const mongoose = require("mongoose");
const { validateBulkProductRow } = require("../utils/productInput");

const MAX_ROWS = 1000;
const REQUIRED_HEADERS = ["name", "sku", "category", "price", "stock"];
const uploadsDirectory = path.join(__dirname, "..", "uploads");

const upload = multer({
  dest: uploadsDirectory,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (path.extname(file.originalname).toLowerCase() !== ".csv") {
      return callback(Object.assign(new Error("Only CSV files are supported"), { status: 400 }));
    }
    return callback(null, true);
  },
});

const receiveCsv = (req, res, next) => upload.single("file")(req, res, (error) => {
  if (!error) return next();
  if (req.file?.path) fs.unlink(req.file.path, () => {});
  const message = error.code === "LIMIT_FILE_SIZE" ? "CSV file must be 5 MB or smaller" : error.message;
  return res.status(error.status === 400 || error instanceof multer.MulterError ? 400 : 500).json({ message });
});

router.post("/inventory", verifyToken, allowRole(["admin", "super_admin"]), requireStoreContext, receiveCsv, async (req, res) => {
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

  const rows = [];
  let headers = [];
  let tooManyRows = false;
  let inserted = 0;
  let failed = 0;
  const errors = [];

  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv({ mapHeaders: ({ header }) => String(header || "").replace(/^\uFEFF/, "").trim() }))
        .on("headers", (value) => { headers = value; })
        .on("data", (row) => {
          if (rows.length >= MAX_ROWS) tooManyRows = true;
          else rows.push(row);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
    if (missingHeaders.length) {
      return res.status(400).json({ message: `Missing required CSV columns: ${missingHeaders.join(", ")}` });
    }
    if (tooManyRows) {
      return res.status(400).json({ message: `CSV cannot contain more than ${MAX_ROWS} product rows` });
    }
    if (!rows.length) {
      return res.status(400).json({ message: "CSV must contain at least one product row" });
    }

    for (const [index, row] of rows.entries()) {
      try {
        const input = validateBulkProductRow(row);
        if (await Product.exists({ sku: input.sku })) {
          throw Object.assign(new Error("Product with this SKU already exists"), { status: 409 });
        }
        await Product.create({
          name: input.name,
          sku: input.sku,
          category: input.category,
          price: input.price,
          discount_price: input.discountPrice,
          stock: input.stock,
          unit: input.unit,
          reorder_level: input.reorderLevel,
          expiry_date: input.expiryDate,
          is_featured: input.isFeatured,
          description: input.description,
          image_url: input.imageUrl,
          is_active: 1,
          storeId,
          createdBy: req.user.id,
        });
        inserted++;
      } catch (err) {
        failed++;
        if (errors.length < 20) {
          errors.push({ row: index + 2, sku: typeof row.sku === "string" ? row.sku.trim() : "", message: err.code === 11000 ? "Product with this SKU already exists" : err.message });
        }
      }
    }

    return res.json({ success: true, total: rows.length, inserted, failed, errors });

  } catch (err) {
    console.error("❌ BULK UPLOAD ERROR:", err);
    return res.status(400).json({ message: "CSV could not be parsed" });
  } finally {
    cleanup();
  }
});

module.exports = router;
