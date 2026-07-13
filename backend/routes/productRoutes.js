const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const authMiddleware = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const uploadUrl = (req, filename) => `${req.protocol}://${req.get("host")}/uploads/${encodeURIComponent(filename)}`;

function normalizeStoredImageUrl(value, req) {
  if (!value || !/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    const localHost = ["localhost", "127.0.0.1", "0.0.0.0", "10.0.2.2"].includes(url.hostname);
    if (!localHost) return value;
    return url.pathname.startsWith("/uploads/")
      ? `${req.protocol}://${req.get("host")}${url.pathname}`
      : null;
  } catch {
    return null;
  }
}

function productResponse(product, req) {
  const data = product.toObject ? product.toObject() : product;
  const imageUrl =
    data.image_url && /^https?:\/\//i.test(data.image_url)
      ? normalizeStoredImageUrl(data.image_url, req)
      : data.image && /^https?:\/\//i.test(data.image)
        ? normalizeStoredImageUrl(data.image, req)
        : data.image
          ? uploadUrl(req, data.image)
          : data.image_url || null;

  return { ...data, image_url: imageUrl };
}

/* =========================
   GET ALL PRODUCTS — public
   (user shopping frontend uses this)
========================= */
router.get("/", async (req, res) => {
  try {
    const { category, storeId, search } = req.query;
    let query = { is_active: 1 };
    if (category) query.category = category;
    if (storeId)  query.storeId  = storeId;
    if (search)   query.name     = { $regex: search, $options: "i" };

    const products = await Product.find(query)
      .populate("storeId", "name categories")
      .sort({ is_featured: -1, created_at: -1 });

    res.json(products.map((product) => productResponse(product, req)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================
   GET BY CATEGORY — public
========================= */
router.get("/category/:category", async (req, res) => {
  try {
    const category = decodeURIComponent(req.params.category);
    const products = await Product.find({ category, is_active: 1 })
      .populate("storeId", "name categories");
    res.json(products.map((product) => productResponse(product, req)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================
   GET SINGLE PRODUCT — public
========================= */
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("storeId", "name categories");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(productResponse(product, req));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================
   ADD PRODUCT — protected
   FIX: was completely open, anyone could add products
========================= */
router.post(
  "/",
  authMiddleware,
  allowRoles(["admin", "super_admin"]),
  async (req, res) => {
    try {
      const { name, price, category, image, image_url, description, storeId, sku, stock } = req.body;

      if (!name || !price || !category) {
        return res.status(400).json({ message: "name, price and category are required" });
      }

      const newProduct = new Product({
        name, price, category,
        image:       image     || null,
        image_url:   image_url || null,
        description: description || null,
        storeId:     storeId   || null,
        sku:         sku       || `SKU-${Date.now()}`,
        stock:       stock     || 0,
        is_active:   1,
        createdBy:   req.user.id,
      });

      const saved = await newProduct.save();
      res.status(201).json(saved);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
