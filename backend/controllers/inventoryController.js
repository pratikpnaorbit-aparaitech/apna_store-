const Product = require("../models/Product");
const Store = require("../models/Store");
const mongoose = require("mongoose");
const {
  validateProductImageUrl,
  validateProductInput,
} = require("../utils/productInput");

function scopedProductFilter(req, filter = {}) {
  if (req.user.role === "super_admin") return filter;
  if (!req.user.storeId) return { ...filter, storeId: { $in: [] } };
  return { ...filter, storeId: req.user.storeId };
}

/* ── helpers ── */
function calcExpiry(p) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let expiryStatus = "SAFE",
    discountPercent = 0;

  if (p.expiry_date) {
    const exp = new Date(p.expiry_date);
    exp.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      expiryStatus = "EXPIRED";
    } else if (daysLeft <= 7) {
      expiryStatus = "NEAR_EXPIRY";
      discountPercent = daysLeft <= 1 ? 50 : daysLeft <= 3 ? 30 : 15;
    }
  }

  return { expiryStatus, discountPercent };
}

function resolvedImageUrl(p, req) {
  const stored = p.image_url || p.image;
  if (!stored) return null;
  if (/^https?:\/\//i.test(stored)) return stored;
  return `${req.protocol}://${req.get("host")}/uploads/${encodeURIComponent(stored)}`;
}

function normalize(p, req) {
  const { expiryStatus, discountPercent } = calcExpiry(p);

  return {
    id: p._id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    price: Number(p.price),
    discount_price: p.discount_price ?? null,
    stock: Number(p.stock),
    unit: p.unit || "piece",
    reorder_level: p.reorder_level ?? 5,
    expiryDate: p.expiry_date,
    is_featured: p.is_featured || false,
    storeId: p.storeId,
    createdBy: p.createdBy,
    description: p.description || null,
    image: p.image || null,
    image_url: resolvedImageUrl(p, req),
    expiryStatus,
    discountPercent,
    isLowStock: Number(p.stock) <= (p.reorder_level ?? 5),
  };
}

function imageFilenameFromInput(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) return raw;

  try {
    const url = new URL(raw);
    const uploadMarker = "/uploads/";
    const markerIndex = url.pathname.indexOf(uploadMarker);
    if (markerIndex >= 0) {
      return decodeURIComponent(url.pathname.slice(markerIndex + uploadMarker.length));
    }
  } catch {
    return raw;
  }

  return raw;
}

function productDefaults(product) {
  return {
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: product.price,
    discount_price: product.discount_price,
    stock: product.stock,
    unit: product.unit,
    reorder_level: product.reorder_level,
    expiryDate: product.expiry_date,
    is_featured: product.is_featured,
    description: product.description,
  };
}

function productWriteError(res, error, fallbackMessage) {
  if (error.status === 400 || error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "Product with this SKU already exists" });
  }
  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
}

/* =========================
   GET ALL PRODUCTS
========================= */
exports.getAllProducts = async (req, res) => {
  try {
    const { role, storeId } = req.user;

    let query = { is_active: 1 };

    if (role === "admin" || role === "staff") {
      query.storeId = storeId;
    } else if (role === "super_admin") {
      if (req.query.storeId) {
        if (!mongoose.isValidObjectId(req.query.storeId)) {
          return res.status(400).json({ message: "Invalid store ID" });
        }
        query.storeId = req.query.storeId;
      }
    }

    const products = await Product.find(query)
      .populate("storeId", "name")
      .populate("createdBy", "name")
      .sort({ created_at: -1 });

    res.json(products.map((product) => normalize(product, req)));
  } catch (err) {
    console.error("FETCH INVENTORY ERROR:", err);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
};

/* =========================
   GET SINGLE PRODUCT
========================= */
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findOne(scopedProductFilter(req, {
      _id: req.params.id,
      is_active: 1,
    }));

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(normalize(product, req));
  } catch (err) {
    console.error("FETCH PRODUCT ERROR:", err);

    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    res.status(500).json({ message: "Failed to fetch product" });
  }
};

/* =========================
   ADD PRODUCT
========================= */
exports.addProduct = async (req, res) => {
  try {
    const input = validateProductInput(req.body);
    const storeId = req.user.role === "super_admin" ? req.body.storeId : req.user.storeId;
    if (!storeId || !mongoose.isValidObjectId(storeId)) {
      return res.status(400).json({ message: "A store is required for this product" });
    }
    if (!(await Store.exists({ _id: storeId, isActive: true }))) {
      return res.status(400).json({ message: "Choose a valid active store" });
    }
    if (await Product.exists({ sku: input.sku })) {
      return res.status(409).json({ message: "Product with this SKU already exists" });
    }

    const imageUrl = Object.prototype.hasOwnProperty.call(req.body, "image_url")
      ? validateProductImageUrl(req.body.image_url)
      : null;

    const newProduct = await Product.create({
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
      is_active: 1,
      storeId,
      createdBy: req.user.id,
      image: req.file
        ? req.file.filename
        : imageUrl
          ? imageFilenameFromInput(imageUrl)
          : null,
    });

    return res.status(201).json({
      success: true,
      id: newProduct._id,
      product: normalize(newProduct, req),
    });
  } catch (err) {
    return productWriteError(res, err, "Failed to add product");
  }
};

/* =========================
   UPDATE PRODUCT
========================= */
exports.updateProduct = async (req, res) => {
  try {
    const target = await Product.findOne(scopedProductFilter(req, {
      _id: req.params.id,
      is_active: 1,
    }));
    if (!target) return res.status(404).json({ message: "Product not found" });

    const input = validateProductInput(req.body, productDefaults(target));
    if (input.sku !== target.sku) {
      const existing = await Product.findOne({
        sku: input.sku,
        _id: { $ne: req.params.id },
      });

      if (existing) {
        return res.status(400).json({
          message: "SKU already exists for another product",
        });
      }
    }

    const updateData = {
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
    };

    // Update image if new image uploaded
    if (req.file) {
      updateData.image = req.file.filename;
      updateData.image_url = null;
    } else if (Object.prototype.hasOwnProperty.call(req.body, "image_url")) {
      const imageUrl = validateProductImageUrl(req.body.image_url);
      updateData.image = imageUrl ? imageFilenameFromInput(imageUrl) : null;
      updateData.image_url = null;
    }

    const updated = await Product.findOneAndUpdate(scopedProductFilter(req, {
      _id: req.params.id,
      is_active: 1,
    }), updateData, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json({ success: true, product: normalize(updated, req) });
  } catch (err) {
    return productWriteError(res, err, "Failed to update product");
  }
};

/* =========================
   ARCHIVE PRODUCT
========================= */
exports.archiveProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      scopedProductFilter(req, { _id: req.params.id, is_active: 1 }),
      { is_active: 0 },
      { returnDocument: "after" },
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("ARCHIVE PRODUCT ERROR:", err);

    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    res.status(500).json({
      message: "Failed to archive product",
    });
  }
};
