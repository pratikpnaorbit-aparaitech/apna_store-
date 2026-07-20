const Product = require("../models/Product");
const User = require("../models/User");
const Store = require("../models/Store");

function scopedProductFilter(req, filter = {}) {
  if (req.user.role === "super_admin") return filter;
  return { ...filter, storeId: req.user.storeId || null };
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

/* =========================
   GET ALL PRODUCTS
========================= */
exports.getAllProducts = async (req, res) => {
  try {
    const { role, id: userId } = req.user;

    let query = { is_active: 1 };

    if (role === "admin" || role === "staff") {
      const user = await User.findById(userId).select("storeId");

      if (!user?.storeId) {
        return res.json([]);
      }

      query.storeId = user.storeId;
    } else if (role === "super_admin") {
      if (req.query.storeId) {
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
  const {
    name,
    sku,
    category,
    price,
    discount_price,
    stock,
    unit,
    reorder_level,
    expiryDate,
    is_featured,
  } = req.body;

  if (!name || !sku || !category || price == null || stock == null) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const existingProduct = await Product.findOne({ sku });

    if (existingProduct) {
      return res.status(400).json({
        message: "Product with this SKU already exists",
      });
    }

    const user = await User.findById(req.user.id).select("storeId role");
    const storeId = user?.role === "super_admin" ? req.body.storeId : user?.storeId;
    if (!storeId) {
      return res.status(400).json({ message: "A store is required for this product" });
    }
    if (!(await Store.exists({ _id: storeId, isActive: true }))) {
      return res.status(400).json({ message: "Choose a valid active store" });
    }

    const newProduct = await Product.create({
      name,
      sku,
      category,

      price: Number(price),

      discount_price: discount_price ? Number(discount_price) : null,

      stock: Number(stock),
      unit: unit || "piece",

      reorder_level: reorder_level ? Number(reorder_level) : 5,

      expiry_date: expiryDate || null,

      is_featured: is_featured || false,

      is_active: 1,

      storeId,

      createdBy: req.user.id,

      image: req.file
        ? req.file.filename
        : req.body.image_url
          ? imageFilenameFromInput(req.body.image_url)
          : null,
    });

    res.json({
      success: true,
      id: newProduct._id,
    });
  } catch (err) {
    console.error("ADD PRODUCT ERROR:", err);

    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: err.message,
      });
    }

    res.status(500).json({
      message: "Failed to add product",
    });
  }
};

/* =========================
   UPDATE PRODUCT
========================= */
exports.updateProduct = async (req, res) => {
  const {
    name,
    sku,
    category,
    price,
    discount_price,
    stock,
    unit,
    reorder_level,
    expiryDate,
    is_featured,
  } = req.body;

  try {
    const target = await Product.findOne(scopedProductFilter(req, {
      _id: req.params.id,
      is_active: 1,
    })).select("_id");
    if (!target) return res.status(404).json({ message: "Product not found" });

    if (sku) {
      const existing = await Product.findOne({
        sku,
        _id: { $ne: req.params.id },
      });

      if (existing) {
        return res.status(400).json({
          message: "SKU already exists for another product",
        });
      }
    }

    const updateData = {
      name,
      sku,
      category,
      price: Number(price),
      discount_price: discount_price ? Number(discount_price) : null,
      stock: Number(stock),
      unit: unit || "piece",
      reorder_level: reorder_level ? Number(reorder_level) : 5,
      expiry_date: expiryDate || null,
      is_featured: is_featured || false,
    };

    // Update image if new image uploaded
    if (req.file) {
      updateData.image = req.file.filename;
    } else if (req.body.image_url) {
      updateData.image = imageFilenameFromInput(req.body.image_url);
    }

    const updated = await Product.findOneAndUpdate(scopedProductFilter(req, { _id: req.params.id }), updateData, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);

    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    res.status(500).json({
      message: "Failed to update product",
    });
  }
};

/* =========================
   ARCHIVE PRODUCT
========================= */
exports.archiveProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      scopedProductFilter(req, { _id: req.params.id }),
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
