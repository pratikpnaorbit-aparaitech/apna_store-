const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizePhone, validateBillingInput } = require("../utils/billingInput");

const productId = "507f1f77bcf86cd799439011";

test("billing input normalizes a valid POS bill", () => {
  assert.equal(normalizePhone("+91 98765-43210"), "9876543210");
  assert.deepEqual(validateBillingInput({
    paymentMode: "cash",
    items: [{ productId, qty: "2" }],
    phone: "9876543210",
    joinLoyalty: true,
    newCustomer: { name: "Audit Customer", email: "AUDIT@example.com" },
    cashReceived: "500",
  }), {
    paymentMode: "CASH",
    items: [{ productId, qty: 2 }],
    phone: "9876543210",
    joinLoyalty: true,
    newCustomer: { name: "Audit Customer", email: "audit@example.com" },
    cashReceived: 500,
    storeId: "",
  });
});

test("billing input rejects query objects, duplicates and fractional quantities", () => {
  for (const action of [
    () => validateBillingInput({ paymentMode: { $ne: null }, items: [{ productId, qty: 1 }], cashReceived: 100 }),
    () => validateBillingInput({ paymentMode: "CASH", items: [{ productId, qty: 1.5 }], cashReceived: 100 }),
    () => validateBillingInput({ paymentMode: "CASH", items: [{ productId, qty: 1 }, { productId, qty: 2 }], cashReceived: 100 }),
    () => validateBillingInput({ paymentMode: "CASH", items: [{ productId, qty: 1 }], phone: { $gt: "" }, cashReceived: 100 }),
    () => validateBillingInput({ paymentMode: "UPI", items: [{ productId, qty: 1 }], joinLoyalty: "true" }),
    () => validateBillingInput({ paymentMode: "UPI", items: [{ productId, qty: 1 }], joinLoyalty: true, phone: "9876543210", newCustomer: { name: { $ne: null } } }),
  ]) assert.throws(action, (error) => error.statusCode === 400);
});
