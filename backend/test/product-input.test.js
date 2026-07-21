const assert = require("node:assert/strict");
const test = require("node:test");

const {
  validateBulkProductRow,
  validateProductImageUrl,
  validateProductInput,
} = require("../utils/productInput");

const valid = {
  name: "  Test Product  ", sku: " SKU-1 ", category: " Grocery ",
  price: "0", discount_price: "0", stock: "0", unit: "piece",
  reorder_level: "0", is_featured: "false", expiryDate: "2027-01-01",
};

test("product input accepts zero values and normalizes multipart strings", () => {
  const result = validateProductInput(valid);
  assert.equal(result.name, "Test Product");
  assert.equal(result.sku, "SKU-1");
  assert.equal(result.price, 0);
  assert.equal(result.discountPrice, 0);
  assert.equal(result.stock, 0);
  assert.equal(result.reorderLevel, 0);
  assert.equal(result.isFeatured, false);
  assert.ok(result.expiryDate instanceof Date);
});

test("partial product updates preserve omitted values", () => {
  const result = validateProductInput(
    { is_featured: true },
    { ...valid, price: 50, discount_price: 40, stock: 8, reorder_level: 3 },
  );
  assert.equal(result.price, 50);
  assert.equal(result.discountPrice, 40);
  assert.equal(result.stock, 8);
  assert.equal(result.reorderLevel, 3);
  assert.equal(result.isFeatured, true);
});

test("product input rejects malformed and unsafe values", () => {
  for (const input of [
    { ...valid, name: { $ne: null } },
    { ...valid, sku: ["SKU-1"] },
    { ...valid, category: "" },
    { ...valid, price: "NaN" },
    { ...valid, price: -1 },
    { ...valid, price: 10, discount_price: 11 },
    { ...valid, stock: 1.5 },
    { ...valid, reorder_level: -1 },
    { ...valid, unit: "box" },
    { ...valid, is_featured: { $ne: false } },
    { ...valid, expiryDate: "not-a-date" },
  ]) {
    assert.throws(() => validateProductInput(input), (error) => error.status === 400);
  }
});

test("product image input allows HTTP URLs and rejects objects or script URLs", () => {
  assert.equal(validateProductImageUrl(" https://example.com/image.jpg "), "https://example.com/image.jpg");
  assert.equal(validateProductImageUrl(""), null);
  for (const value of [{ $ne: null }, "javascript:alert(1)", "not a url"]) {
    assert.throws(() => validateProductImageUrl(value), (error) => error.status === 400);
  }
});

test("bulk product rows share the same product validation and defaults", () => {
  const result = validateBulkProductRow({
    name: " Bulk Product ", sku: " BULK-1 ", category: " Grocery ",
    price: "0", discount_price: "", stock: "0", unit: "",
    reorder_level: "0", expiry: "2028-02-29", is_featured: "",
    image_url: "https://example.com/product.png",
  });
  assert.equal(result.name, "Bulk Product");
  assert.equal(result.price, 0);
  assert.equal(result.discountPrice, null);
  assert.equal(result.stock, 0);
  assert.equal(result.unit, "piece");
  assert.equal(result.reorderLevel, 0);
  assert.equal(result.isFeatured, false);
  assert.equal(result.imageUrl, "https://example.com/product.png");
});

test("bulk product rows reject fractional stock and unsafe optional data", () => {
  for (const row of [
    { ...valid, stock: "1.5" },
    { ...valid, discount_price: "20", price: "10" },
    { ...valid, image_url: "javascript:alert(1)" },
    { ...valid, is_featured: "sometimes" },
  ]) {
    assert.throws(() => validateBulkProductRow(row), (error) => error.status === 400);
  }
});
