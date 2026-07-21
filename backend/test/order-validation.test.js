const assert = require("node:assert/strict");
const test = require("node:test");
const {
  canAdminTransition,
  canDeliveryTransition,
  normalizeAddress,
  normalizeCustomerLocation,
  normalizeOrderItems,
  normalizePaymentMethod,
} = require("../utils/orderValidation");

test("order inputs normalize valid payment, address, location and quantities", () => {
  assert.equal(normalizePaymentMethod("cash on delivery"), "COD");
  assert.equal(normalizePaymentMethod("upi"), "Razorpay");
  assert.deepEqual(normalizeOrderItems([{ productId: "product-1", quantity: "2" }]), [{ productId: "product-1", quantity: 2 }]);
  assert.deepEqual(normalizeCustomerLocation({ lat: "18.15", lng: "74.58" }), { latitude: 18.15, longitude: 74.58 });
  assert.equal(normalizeAddress({ name: "A", phone: "+91 9876543210", street: "Main Road", pincode: "413102" }).phone, "9876543210");
});

test("order inputs reject objects, bad locations, duplicate lines and fractional quantities", () => {
  for (const action of [
    () => normalizePaymentMethod({ value: "COD" }),
    () => normalizeAddress({ street: { $ne: null }, pincode: "413102" }),
    () => normalizeAddress({ street: "Main Road", pincode: "ABC123" }),
    () => normalizeCustomerLocation({ latitude: 91, longitude: 74 }),
    () => normalizeOrderItems([{ productId: "p1", quantity: 1.5 }]),
    () => normalizeOrderItems([{ productId: "p1", quantity: 1 }, { productId: "p1", quantity: 2 }]),
  ]) assert.throws(action, (error) => error.statusCode === 400);
});

test("admin and delivery status transitions cannot skip, regress or bypass OTP delivery", () => {
  assert.equal(canAdminTransition("Placed", "Confirmed"), true);
  assert.equal(canAdminTransition("Confirmed", "Preparing"), true);
  assert.equal(canAdminTransition("Preparing", "Placed"), false);
  assert.equal(canAdminTransition("Placed", "Out for Delivery"), false);
  assert.equal(canAdminTransition("Out for Delivery", "Delivered"), false);
  assert.equal(canDeliveryTransition("Preparing", "Picked Up"), true);
  assert.equal(canDeliveryTransition("Confirmed", "Out for Delivery"), false);
  assert.equal(canDeliveryTransition("Picked Up", "Out for Delivery"), true);
  assert.equal(canDeliveryTransition("Out for Delivery", "Delivered"), false);
});
