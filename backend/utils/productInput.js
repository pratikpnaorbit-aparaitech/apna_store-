const PRODUCT_UNITS = ["piece", "kg", "gram", "litre", "ml", "pack"];

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const owns = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const text = (value, label, maxLength) => {
  if (typeof value !== "string") throw badRequest(`${label} is required`);
  const normalized = value.trim();
  if (!normalized) throw badRequest(`${label} is required`);
  if (normalized.length > maxLength) throw badRequest(`${label} is too long`);
  return normalized;
};

const number = (value, label, { integer = false } = {}) => {
  if ((typeof value !== "number" && typeof value !== "string") || value === "") {
    throw badRequest(`${label} is required`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) {
    throw badRequest(`${label} must be a non-negative${integer ? " whole" : ""} number`);
  }
  if (parsed > 1_000_000_000) throw badRequest(`${label} is too large`);
  return parsed;
};

const boolean = (value, label) => {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  throw badRequest(`${label} must be true or false`);
};

const optionalText = (value, label, maxLength) => {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw badRequest(`${label} must be text`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw badRequest(`${label} is too long`);
  return normalized || null;
};

const expiryDate = (value) => {
  if (value == null || value === "") return null;
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw badRequest("Expiry date is invalid");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw badRequest("Expiry date is invalid");
  return parsed;
};

const valueOr = (body, defaults, key) => owns(body, key) ? body[key] : defaults[key];

const validateProductInput = (body = {}, defaults = {}) => {
  const name = text(valueOr(body, defaults, "name"), "Product name", 120);
  const sku = text(valueOr(body, defaults, "sku"), "SKU", 80);
  const category = text(valueOr(body, defaults, "category"), "Category", 80);
  const price = number(valueOr(body, defaults, "price"), "Price");
  const stock = number(valueOr(body, defaults, "stock"), "Stock", { integer: true });
  const rawDiscount = valueOr(body, defaults, "discount_price");
  const discountPrice = rawDiscount == null || rawDiscount === ""
    ? null
    : number(rawDiscount, "Discount price");
  if (discountPrice != null && discountPrice > price) {
    throw badRequest("Discount price cannot be greater than the regular price");
  }

  const rawUnit = valueOr(body, defaults, "unit") ?? "piece";
  if (typeof rawUnit !== "string" || !PRODUCT_UNITS.includes(rawUnit)) {
    throw badRequest("Choose a valid stock unit");
  }

  const rawReorder = valueOr(body, defaults, "reorder_level");
  const reorderLevel = rawReorder == null || rawReorder === ""
    ? 5
    : number(rawReorder, "Reorder level", { integer: true });
  const rawFeatured = valueOr(body, defaults, "is_featured");
  const isFeatured = rawFeatured == null ? false : boolean(rawFeatured, "Featured status");
  const rawExpiry = owns(body, "expiryDate")
    ? body.expiryDate
    : owns(body, "expiry_date")
      ? body.expiry_date
      : (defaults.expiryDate ?? defaults.expiry_date);

  return {
    name,
    sku,
    category,
    price,
    discountPrice,
    stock,
    unit: rawUnit,
    reorderLevel,
    expiryDate: expiryDate(rawExpiry),
    isFeatured,
    description: optionalText(valueOr(body, defaults, "description"), "Description", 2000),
  };
};

const validateProductImageUrl = (value) => {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048 || !/^https?:\/\/[^\s]+$/i.test(value.trim())) {
    throw badRequest("Enter a valid HTTP or HTTPS image URL");
  }
  return value.trim();
};

const validateBulkProductRow = (row = {}) => {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw badRequest("CSV row is invalid");
  }

  const optional = (key) => {
    const value = row[key];
    return typeof value === "string" && value.trim() === "" ? undefined : value;
  };
  const expiry = optional("expiry") ?? optional("expiry_date") ?? optional("expiryDate");
  const input = validateProductInput({
    name: row.name,
    sku: row.sku,
    category: row.category,
    price: row.price,
    discount_price: optional("discount_price"),
    stock: row.stock,
    unit: optional("unit"),
    reorder_level: optional("reorder_level"),
    expiryDate: expiry,
    is_featured: optional("is_featured"),
    description: optional("description"),
  });
  const imageUrl = validateProductImageUrl(optional("image_url"));

  return { ...input, imageUrl };
};

module.exports = {
  PRODUCT_UNITS,
  validateBulkProductRow,
  validateProductImageUrl,
  validateProductInput,
};
