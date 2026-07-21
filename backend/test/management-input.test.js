const test = require("node:test");
const assert = require("node:assert/strict");
const { text, email, phone, boolean, money, objectId } = require("../utils/managementInput");

test("management inputs normalize safe values", () => {
  assert.equal(text("  Shop A  ", "Name", { required: true }), "Shop A");
  assert.equal(email(" ADMIN@EXAMPLE.COM "), "admin@example.com");
  assert.equal(phone("98765-43210", { required: true }), "9876543210");
  assert.equal(boolean(false, "isActive"), false);
  assert.equal(money("12.5"), 12.5);
  assert.equal(objectId("507f1f77bcf86cd799439011", "id"), "507f1f77bcf86cd799439011");
});

test("management inputs reject invalid shapes and values", () => {
  assert.throws(() => phone({ $ne: null }, { required: true }), /Phone number must be text/);
  assert.throws(() => phone("123", { required: true }), /10-digit/);
  assert.throws(() => email("not-an-email"), /valid email/);
  assert.throws(() => boolean("true", "isActive"), /true or false/);
  assert.throws(() => money(-1), /non-negative/);
  assert.throws(() => objectId("not-an-id", "id"), /valid id/);
});
