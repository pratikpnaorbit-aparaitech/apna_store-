const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({

  name: {
    type: String,
    required: [true, "Product name is required"],
    trim: true
  },

  sku: {
    type: String,
    required: [true, "SKU is required"],
    unique: true,
    trim: true
  },

  category: {
    type: String,
    required: [true, "Category is required"],
    trim: true
  },

  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"]
  },

  discount_price: {
    type: Number,
    default: null,
    min: [0, "Discount price cannot be negative"]
  },

  stock: {
    type: Number,
    required: [true, "Stock is required"],
    min: [0, "Stock cannot be negative"],
    default: 0
  },

  reorder_level: {
    type: Number,
    default: 5,
    min: 0
  },

  expiry_date: {
    type: Date,
    default: null
  },

  is_active: {
    type: Number,
    default: 1,
    enum: [0, 1]
  },

  is_featured: {
    type: Boolean,
    default: false
  },

  /* legacy field — filename only (e.g. product_123.jpg) */
  image: {
    type: String,
    default: null
  },

  /* ⭐ new field — full URL (pasted by admin) */
  image_url: {
    type: String,
    default: null
  },

  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    default: null
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }

}, {
  timestamps: {
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
});

productSchema.index({ sku: 1 });
productSchema.index({ is_active: 1, created_at: -1 });
productSchema.index({ storeId: 1, is_active: 1 });

module.exports = mongoose.model("Product", productSchema);