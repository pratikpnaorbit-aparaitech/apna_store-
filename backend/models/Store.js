const mongoose = require("mongoose");

// Store types where expiry dates are relevant on products
const EXPIRY_STORE_TYPES = ["General / Grocery Store", "Pharmacy / Medical"];

const STORE_TYPES = [
  "Restaurant / Food Court",
  "General / Grocery Store",
  "Clothing & Fashion",
  "Pharmacy / Medical",
  "Sports & Fitness",
  "Electronics",
];

// Maps category strings → storeType (auto-detect fallback)
const CATEGORY_TO_STORE_TYPE = {
  "Food & Beverages":     "Restaurant / Food Court",
  "Grocery & Essentials": "General / Grocery Store",
  "Grocery":              "General / Grocery Store",
  "Pharmacy":             "Pharmacy / Medical",
  "Medical":              "Pharmacy / Medical",
  "Clothing & Fashion":   "Clothing & Fashion",
  "Sports & Fitness":     "Sports & Fitness",
  "Electronics":          "Electronics",
};

function detectStoreType(categories = []) {
  for (const cat of categories) {
    if (CATEGORY_TO_STORE_TYPE[cat]) return CATEGORY_TO_STORE_TYPE[cat];
  }
  return null;
}

function storeRequiresExpiry(storeType) {
  return EXPIRY_STORE_TYPES.includes(storeType);
}

const storeSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */
    name: {
      type: String,
      required: [true, "Please add a store name"],
      trim: true,
    },

    /* ================= STORE TYPE ================= */
    storeType: {
      type: String,
      enum: [...STORE_TYPES, null],
      default: null,
    },

    /* ================= CATEGORIES (multiple) ================= */
    categories: {
      type: [String],
      default: [],
    },

    address: {
      street:  { type: String, trim: true },
      city:    { type: String, trim: true },
      state:   { type: String, trim: true },
      pincode: { type: String, trim: true },
    },

    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },

    /* ================= RELATIONSHIPS ================= */
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    /* ================= STATUS ================= */
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* Virtual: does this store need expiry dates on products? */
storeSchema.virtual("requiresExpiry").get(function () {
  return storeRequiresExpiry(this.storeType);
});

/* Pre-save hook: auto-detect storeType from categories if not set */
storeSchema.pre("save", function () {
  if (!this.storeType && this.categories?.length > 0) {
    this.storeType = detectStoreType(this.categories);
  }
});

/* Pre-update hook for findByIdAndUpdate */
storeSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();
  if (!update.storeType && update.categories?.length > 0) {
    update.storeType = detectStoreType(update.categories);
  }
});

module.exports = mongoose.model("Store", storeSchema);
module.exports.STORE_TYPES = STORE_TYPES;
module.exports.EXPIRY_STORE_TYPES = EXPIRY_STORE_TYPES;
module.exports.detectStoreType = detectStoreType;
module.exports.storeRequiresExpiry = storeRequiresExpiry;
