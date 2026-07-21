const assert = require("node:assert/strict");
const crypto = require("crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Store = require("../models/Store");
const Product = require("../models/Product");
const Order = require("../models/Order");
const DeliveryPartner = require("../models/DeliveryPartner");

const BASE = "http://127.0.0.1:5006/api";
const JWT_SECRET = "bulk-audit-secret";
const RAZORPAY_SECRET = "bulk-razor-secret";
const STORE_A = "6a5efd496097570747514430";
const STORE_B = "6a5efd496097570747514431";
const INACTIVE_STORE = "6a5efd496097570747514432";
const ADMIN_A = "6a5efd49609757074751442c";
const SUPER = "6a5efd49609757074751442b";

const token = (id, role) => jwt.sign({ id: String(id), role }, JWT_SECRET, { expiresIn: "2h" });
const request = async (method, path, auth, body) => {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data };
};
const expectStatus = async (label, expected, promise) => {
  const result = await promise;
  assert.equal(result.status, expected, `${label}: expected ${expected}, got ${result.status}: ${JSON.stringify(result.data)}`);
  console.log(`PASS ${label} (${expected})`);
  return result.data;
};

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/smartstore_bulk_audit_20260721");
  const prefix = "ORDER-E2E-20260721";
  await Order.deleteMany({ couponCode: prefix });
  await Product.deleteMany({ sku: { $regex: `^${prefix}` } });
  await DeliveryPartner.deleteMany({ phone: { $in: ["9888800011", "9888800022"] } });
  await User.deleteMany({ email: { $in: ["order-customer-a@audit.com", "order-customer-b@audit.com"] } });

  const password = await bcrypt.hash("audit-pass-123", 10);
  const [customerA, customerB] = await User.create([
    { name: "Order Customer A", email: "order-customer-a@audit.com", mobile: "9888800033", password, role: "user", isActive: true, isEmailVerified: true },
    { name: "Order Customer B", email: "order-customer-b@audit.com", mobile: "9888800044", password, role: "user", isActive: true, isEmailVerified: true },
  ]);
  const partnerA = await DeliveryPartner.create({ name: "Order Rider A", phone: "9888800011", email: "rider-a@audit.com", password: "audit-pass-123", storeId: STORE_A, createdBy: SUPER, isActive: true, isAvailable: true });
  const partnerB = await DeliveryPartner.create({ name: "Order Rider B", phone: "9888800022", email: "rider-b@audit.com", password: "audit-pass-123", storeId: STORE_B, createdBy: SUPER, isActive: true, isAvailable: true });
  const [productA, productA2, productB, productInactive] = await Product.create([
    { name: "Order Audit Rice", sku: `${prefix}-A1`, category: "Grocery", price: 100, stock: 30, unit: "kg", storeId: STORE_A, createdBy: ADMIN_A },
    { name: "Order Audit Oil", sku: `${prefix}-A2`, category: "Grocery", price: 80, stock: 20, unit: "litre", storeId: STORE_A, createdBy: ADMIN_A },
    { name: "Order Audit Other Store", sku: `${prefix}-B1`, category: "Grocery", price: 50, stock: 10, storeId: STORE_B, createdBy: SUPER },
    { name: "Order Audit Inactive Store", sku: `${prefix}-I1`, category: "Grocery", price: 50, stock: 10, storeId: INACTIVE_STORE, createdBy: SUPER },
  ]);

  const userA = token(customerA._id, "user");
  const userB = token(customerB._id, "user");
  const adminA = token(ADMIN_A, "admin");
  const superToken = token(SUPER, "super_admin");
  const riderA = token(partnerA._id, "delivery_partner");
  const address = { name: "Audit Customer", phone: "9876543210", street: "42 Audit Main Road", city: "Baramati", state: "Maharashtra", pincode: "413102" };
  const place = (items, extra = {}) => request("POST", "/orders/place", userA, { items, address, paymentMethod: "COD", couponCode: prefix, ...extra });

  await expectStatus("reject duplicate product lines", 400, place([{ productId: String(productA._id), quantity: 1 }, { productId: String(productA._id), quantity: 1 }]));
  await expectStatus("reject fractional quantity", 400, place([{ productId: String(productA._id), quantity: 1.5 }]));
  await expectStatus("reject mixed-store cart", 400, place([{ productId: String(productA._id), quantity: 1 }, { productId: String(productB._id), quantity: 1 }]));
  await expectStatus("reject forged store", 400, place([{ productId: String(productA._id), quantity: 1 }], { storeId: STORE_B }));
  await expectStatus("reject inactive store", 409, place([{ productId: String(productInactive._id), quantity: 1 }]));

  const cancellable = await expectStatus("place COD and reserve stock", 201, place([{ productId: String(productA._id), quantity: 2 }]));
  assert.equal((await Product.findById(productA._id)).stock, 28);
  await expectStatus("other customer cannot list orders", 403, request("GET", `/orders/user/${customerA._id}`, userB));
  await expectStatus("other customer cannot cancel order", 404, request("PUT", `/orders/${cancellable.order._id}/cancel`, userB, { reason: "Not mine" }));
  await expectStatus("owner cancels order", 200, request("PUT", `/orders/${cancellable.order._id}/cancel`, userA, { reason: "Changed mind" }));
  assert.equal((await Product.findById(productA._id)).stock, 30);
  await expectStatus("repeat cancellation is conflict", 409, request("PUT", `/orders/${cancellable.order._id}/cancel`, userA, { reason: "Again" }));
  assert.equal((await Product.findById(productA._id)).stock, 30);

  const delivery = await expectStatus("place delivery lifecycle order", 201, place([{ productId: String(productA._id), quantity: 2 }, { productId: String(productA2._id), quantity: 1 }]));
  const deliveryId = delivery.order._id;
  await expectStatus("admin cannot skip confirmation", 409, request("PUT", `/orders/${deliveryId}/status`, adminA, { status: "Preparing" }));
  await expectStatus("admin confirms order", 200, request("PUT", `/orders/${deliveryId}/status`, adminA, { status: "Confirmed" }));
  await expectStatus("super cannot assign rider from other store", 400, request("PUT", `/orders/${deliveryId}/assign-delivery`, superToken, { deliveryPartnerId: String(partnerB._id) }));
  const assigned = await expectStatus("admin assigns store rider", 200, request("PUT", `/orders/${deliveryId}/assign-delivery`, adminA, { deliveryPartnerId: String(partnerA._id) }));
  assert.equal(assigned.order.status, "Confirmed");
  assert.equal((await DeliveryPartner.findById(partnerA._id)).isAvailable, false);
  await expectStatus("rider cannot skip pickup", 409, request("PUT", `/delivery-partners/order/${deliveryId}/status`, riderA, { status: "Out for Delivery" }));
  await expectStatus("customer tracking hides early rider location", 200, request("GET", `/orders/${deliveryId}/location`, userA));
  await expectStatus("unrelated customer cannot track", 403, request("GET", `/orders/${deliveryId}/location`, userB));
  await expectStatus("OTP unavailable before out-for-delivery", 409, request("POST", `/orders/${deliveryId}/delivery-otp/request`, riderA, {}));
  await expectStatus("rider marks picked up", 200, request("PUT", `/delivery-partners/order/${deliveryId}/status`, riderA, { status: "Picked Up" }));
  await expectStatus("admin cannot cancel after pickup", 409, request("PUT", `/orders/${deliveryId}/status`, adminA, { status: "Cancelled", reason: "Too late" }));
  await expectStatus("rider publishes valid GPS", 200, request("PUT", "/delivery-partners/location", riderA, { lat: 18.1512, lng: 74.5789 }));
  await expectStatus("assigned customer can read rider GPS", 200, request("GET", `/delivery-partners/${partnerA._id}/location`, userA));
  await expectStatus("unrelated customer cannot read rider GPS", 403, request("GET", `/delivery-partners/${partnerA._id}/location`, userB));
  await expectStatus("rider marks out for delivery", 200, request("PUT", `/delivery-partners/order/${deliveryId}/status`, riderA, { status: "Out for Delivery" }));

  const otpHash = crypto.createHash("sha256").update("123456").digest("hex");
  await Order.findByIdAndUpdate(deliveryId, { deliveryOtpHash: otpHash, deliveryOtpExpiresAt: new Date(Date.now() + 600000), deliveryOtpAttempts: 0, deliveryOtpUsed: false });
  for (let attempt = 1; attempt <= 5; attempt += 1)
    await expectStatus(`wrong OTP attempt ${attempt}`, 400, request("POST", `/orders/${deliveryId}/delivery-otp/verify`, riderA, { otp: "654321" }));
  const lockedOtpOrder = await Order.findById(deliveryId).select("+deliveryOtpHash deliveryOtpAttempts");
  assert.equal(lockedOtpOrder.deliveryOtpAttempts, 5);
  assert.equal(lockedOtpOrder.deliveryOtpHash, null);
  await Order.findByIdAndUpdate(deliveryId, { deliveryOtpHash: otpHash, deliveryOtpExpiresAt: new Date(Date.now() + 600000), deliveryOtpAttempts: 0, deliveryOtpUsed: false });
  const verifyResults = await Promise.all([
    request("POST", `/orders/${deliveryId}/delivery-otp/verify`, riderA, { otp: "123456" }),
    request("POST", `/orders/${deliveryId}/delivery-otp/verify`, riderA, { otp: "123456" }),
  ]);
  assert.deepEqual(verifyResults.map((result) => result.status).sort(), [200, 409]);
  console.log("PASS concurrent delivery OTP can complete only once (200/409)");
  assert.equal((await Order.findById(deliveryId)).status, "Delivered");
  assert.equal((await DeliveryPartner.findById(partnerA._id)).isAvailable, true);
  await expectStatus("admin cannot regress delivered order", 409, request("PUT", `/orders/${deliveryId}/status`, adminA, { status: "Preparing" }));

  const assignedCancel = await expectStatus("place assigned cancellation order", 201, place([{ productId: String(productA._id), quantity: 1 }]));
  await expectStatus("confirm assigned cancellation order", 200, request("PUT", `/orders/${assignedCancel.order._id}/status`, adminA, { status: "Confirmed" }));
  await expectStatus("assign rider before cancellation", 200, request("PUT", `/orders/${assignedCancel.order._id}/assign-delivery`, adminA, { deliveryPartnerId: String(partnerA._id) }));
  await expectStatus("admin cancellation restores stock", 200, request("PUT", `/orders/${assignedCancel.order._id}/status`, adminA, { status: "Cancelled", reason: "Store unavailable" }));
  assert.equal((await DeliveryPartner.findById(partnerA._id)).isAvailable, true);
  assert.equal((await Product.findById(productA._id)).stock, 28);

  const raceOne = await expectStatus("place assignment race order one", 201, place([{ productId: String(productA2._id), quantity: 1 }]));
  const raceTwo = await expectStatus("place assignment race order two", 201, place([{ productId: String(productA2._id), quantity: 1 }]));
  await expectStatus("confirm race order one", 200, request("PUT", `/orders/${raceOne.order._id}/status`, adminA, { status: "Confirmed" }));
  await expectStatus("confirm race order two", 200, request("PUT", `/orders/${raceTwo.order._id}/status`, adminA, { status: "Confirmed" }));
  const assignmentRace = await Promise.all([
    request("PUT", `/orders/${raceOne.order._id}/assign-delivery`, adminA, { deliveryPartnerId: String(partnerA._id) }),
    request("PUT", `/orders/${raceTwo.order._id}/assign-delivery`, adminA, { deliveryPartnerId: String(partnerA._id) }),
  ]);
  assert.deepEqual(assignmentRace.map((result) => result.status).sort(), [200, 400]);
  console.log("PASS one available rider cannot be claimed by two orders (200/400)");
  const winner = assignmentRace[0].status === 200 ? raceOne.order._id : raceTwo.order._id;
  const loser = String(winner) === String(raceOne.order._id) ? raceTwo.order._id : raceOne.order._id;
  await expectStatus("cancel assignment race winner", 200, request("PUT", `/orders/${winner}/status`, adminA, { status: "Cancelled", reason: "Race cleanup" }));
  await expectStatus("cancel assignment race loser", 200, request("PUT", `/orders/${loser}/status`, adminA, { status: "Cancelled", reason: "Race cleanup" }));

  const paymentBase = {
    userId: customerA._id, storeId: STORE_A,
    items: [{ productId: String(productA._id), name: productA.name, price: 100, quantity: 1, unit: "kg" }],
    address, itemsTotal: 100, deliveryCharge: 40, gst: 5, discount: 0, totalAmount: 145,
    paymentMethod: "Razorpay", paymentStatus: "pending", stockReserved: true, couponCode: prefix,
  };
  await Product.findByIdAndUpdate(productA._id, { $inc: { stock: -1 } });
  const failedPayment = await Order.create({ ...paymentBase, razorpayOrderId: `${prefix}-PAY-FAIL` });
  const invalidRace = await Promise.all([
    request("POST", "/orders/payment/verify", userA, { orderId: String(failedPayment._id), razorpay_order_id: failedPayment.razorpayOrderId, razorpay_payment_id: "pay_bad", razorpay_signature: "0".repeat(64) }),
    request("POST", "/orders/payment/verify", userA, { orderId: String(failedPayment._id), razorpay_order_id: failedPayment.razorpayOrderId, razorpay_payment_id: "pay_bad", razorpay_signature: "0".repeat(64) }),
  ]);
  assert.deepEqual(invalidRace.map((result) => result.status).sort(), [400, 409]);
  console.log("PASS invalid payment signature fails once under concurrency (400/409)");
  assert.equal((await Order.findById(failedPayment._id)).paymentStatus, "failed");
  assert.equal((await Order.findById(failedPayment._id)).status, "Cancelled");
  assert.equal((await Order.findById(failedPayment._id)).stockReserved, false);
  await expectStatus("failed online order cannot enter admin workflow", 409, request("PUT", `/orders/${failedPayment._id}/status`, adminA, { status: "Confirmed" }));
  assert.equal((await Product.findById(productA._id)).stock, 28);

  await Product.findByIdAndUpdate(productA._id, { $inc: { stock: -1 } });
  const paidPayment = await Order.create({ ...paymentBase, razorpayOrderId: `${prefix}-PAY-OK` });
  const paymentId = "pay_order_e2e_ok";
  const signature = crypto.createHmac("sha256", RAZORPAY_SECRET).update(`${paidPayment.razorpayOrderId}|${paymentId}`).digest("hex");
  await expectStatus("valid payment signature verifies", 200, request("POST", "/orders/payment/verify", userA, { orderId: String(paidPayment._id), razorpay_order_id: paidPayment.razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature }));
  await expectStatus("paid verification is idempotent", 200, request("POST", "/orders/payment/verify", userA, { orderId: String(paidPayment._id), razorpay_order_id: paidPayment.razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature }));
  assert.equal((await Product.findById(productA._id)).stock, 27);

  const uiOrder = await expectStatus("leave one placed order for Web/Mobile UI sync", 201, place([{ productId: String(productA._id), quantity: 1 }]));
  await Order.findByIdAndUpdate(uiOrder.order._id, { couponCode: prefix });
  console.log(JSON.stringify({
    ids: { customerA: String(customerA._id), customerB: String(customerB._id), partnerA: String(partnerA._id), productA: String(productA._id), uiOrder: String(uiOrder.order._id), deliveryOrder: String(deliveryId) },
    logins: { customerEmail: customerA.email, customerPassword: "audit-pass-123", riderPhone: partnerA.phone, riderPassword: "audit-pass-123" },
  }));
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error(error);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
