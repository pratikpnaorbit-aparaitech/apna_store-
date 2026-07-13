const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const inventoryController = require("../controllers/inventoryController");
const Product = require("../models/Product");
const upload = require("../middleware/uploadMiddleware");

const uploadOrigin = (req) => `${req.protocol}://${req.get("host")}`;
const uploadUrl = (req, filename) => `${uploadOrigin(req)}/uploads/${encodeURIComponent(filename)}`;

function normalizeStoredImageUrl(value, req) {
  if (!value || !/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    const localHost = ["localhost", "127.0.0.1", "0.0.0.0", "10.0.2.2"].includes(url.hostname);
    if (!localHost) return value;
    return url.pathname.startsWith("/uploads/") ? `${uploadOrigin(req)}${url.pathname}` : null;
  } catch {
    return null;
  }
}

/* =========================
   HELPER — resolve image to a usable URL
   Priority:
   1. image_url field — full URL pasted by admin (e.g. https://...)
   2. image field — filename from old multer upload (e.g. product_123.jpg)
   3. null — no image
========================= */
function resolveImageUrl(p, req) {
  // New field: full URL pasted or from Cloudinary
  if (p.image_url && p.image_url.startsWith("http")) {
    return normalizeStoredImageUrl(p.image_url, req);
  }
  // Old field: full URL somehow stored in image
  if (p.image && p.image.startsWith("http")) {
    return normalizeStoredImageUrl(p.image, req);
  }
  // Old field: just a filename saved by multer locally
  if (p.image && !p.image.startsWith("http")) {
    return uploadUrl(req, p.image);
  }
  return null;
}

/* =========================
   PUBLIC - no auth required
   GET /api/inventory/public
========================= */
router.get("/public", async (req, res) => {
  try {
    const { category, storeId, featured } = req.query;

    let query = { is_active: 1 };
    if (category) query.category = category;
    if (storeId) query.storeId = storeId;
    if (featured === "true") query.is_featured = true;
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: "i" };
    }

    const products = await Product.find(query)
      .populate("storeId", "name categories")
      .sort({ is_featured: -1, created_at: -1 })
      .limit(100);

    res.json(
      products.map((p) => ({
        _id: p._id,
        name: p.name,
        category: p.category,
        price: Number(p.price),
        discount_price: p.discount_price ?? null,
        stock: Number(p.stock),
        unit: p.unit || "piece",
        is_featured: p.is_featured,
        storeId: p.storeId,
        description: p.description || null,
        image_url: resolveImageUrl(p, req),
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

/* =========================
   PUBLIC SINGLE PRODUCT - no auth
   GET /api/inventory/public/:id
   ⚠ Must be BEFORE /:id (auth) route
========================= */
router.get("/public/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "storeId",
      "name categories",
    );

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({
      _id: product._id,
      name: product.name,
      category: product.category,
      price: Number(product.price),
      discount_price: product.discount_price ?? null,
      stock: Number(product.stock),
      unit: product.unit || "piece",
      is_featured: product.is_featured,
      is_active: product.is_active,
      storeId: product.storeId,
      description: product.description || null,
      image_url: resolveImageUrl(product, req),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch product" });
  }
});

/* =========================
   IMAGE UPLOAD — file upload only
   POST /api/inventory/upload-image
   Returns a URL the frontend can save as image_url
========================= */
router.post(
  "/upload-image",
  authMiddleware,
  allowRoles(["admin", "super_admin"]),
  upload.single("image"),
  (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: "No image uploaded" });

    // If using Cloudinary (multer-storage-cloudinary), req.file.path is the full URL
    // If using local multer (diskStorage), build the URL manually
    const imageUrl =
      req.file.path && req.file.path.startsWith("http")
        ? req.file.path
        : uploadUrl(req, req.file.filename);

    res.json({
      success: true,
      imageUrl,
    });
  },
);

/* =========================
   GET ALL PRODUCTS (auth)
   GET /api/inventory
========================= */
router.get(
  "/",
  authMiddleware,
  allowRoles(["admin", "staff", "super_admin"]),
  inventoryController.getAllProducts,
);

/* =========================
   GET SINGLE PRODUCT (auth)
   GET /api/inventory/:id
========================= */
router.get(
  "/:id",
  authMiddleware,
  allowRoles(["admin", "staff", "super_admin"]),
  inventoryController.getProductById,
);

/* =========================
   ADD PRODUCT
   POST /api/inventory
   Accepts: multipart/form-data (with image file) OR json (with image_url string)
========================= */
router.post(
  "/",
  authMiddleware,
  allowRoles(["admin", "super_admin"]),
  upload.single("image"),
  inventoryController.addProduct,
);

/* =========================
   UPDATE PRODUCT
   PUT /api/inventory/:id
   Accepts: multipart/form-data (with image file) OR json (with image_url string)
========================= */
router.put(
  "/:id",
  authMiddleware,
  allowRoles(["admin", "super_admin"]),
  upload.single("image"),
  inventoryController.updateProduct,
);

/* =========================
   ARCHIVE PRODUCT
   DELETE /api/inventory/:id
========================= */
router.delete(
  "/:id",
  authMiddleware,
  allowRoles(["admin", "super_admin"]),
  inventoryController.archiveProduct,
);

module.exports = router;
