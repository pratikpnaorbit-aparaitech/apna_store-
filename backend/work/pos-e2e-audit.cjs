const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Store = require("../models/Store");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Transaction = require("../models/Transaction");
const TransactionItem = require("../models/TransactionItem");
const LoyaltyHistory = require("../models/LoyaltyHistory");
const Sale = require("../models/Sale");

const BASE = "http://127.0.0.1:5007/api";
const SECRET = "pos-audit-secret";
const token = (id, role) => jwt.sign({ id: String(id), role }, SECRET, { expiresIn: "2h" });
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
  await mongoose.connect("mongodb://127.0.0.1:27018/smartstore_pos_audit?replicaSet=smartstore-pos-rs");
  await Promise.all([
    Sale.deleteMany({}), LoyaltyHistory.deleteMany({}), TransactionItem.deleteMany({}),
    Transaction.deleteMany({}), Customer.deleteMany({}), Product.deleteMany({}),
    Store.deleteMany({}), User.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash("audit-pass-123", 10);
  const [superUser, adminA, adminB, staffA, unassigned, customerUser] = await User.create([
    { name: "POS Super", email: "pos-super@audit.com", password: passwordHash, role: "super_admin", isActive: true },
    { name: "POS Admin A", email: "pos-admin-a@audit.com", password: passwordHash, role: "admin", isActive: true },
    { name: "POS Admin B", email: "pos-admin-b@audit.com", password: passwordHash, role: "admin", isActive: true },
    { name: "POS Staff A", email: "pos-staff-a@audit.com", password: passwordHash, role: "staff", isActive: true },
    { name: "POS Unassigned", email: "pos-unassigned@audit.com", password: passwordHash, role: "admin", isActive: true },
    { name: "POS Customer User", email: "pos-user@audit.com", password: passwordHash, role: "user", isActive: true },
  ]);
  const [storeA, storeB, inactiveStore] = await Store.create([
    { name: "POS Store A", admin: adminA._id, createdBy: superUser._id, storeType: "General / Grocery Store", isActive: true },
    { name: "POS Store B", admin: adminB._id, createdBy: superUser._id, storeType: "General / Grocery Store", isActive: true },
    { name: "POS Inactive", admin: adminB._id, createdBy: superUser._id, storeType: "General / Grocery Store", isActive: false },
  ]);
  adminA.storeId = storeA._id; adminB.storeId = storeB._id; staffA.storeId = storeA._id;
  await Promise.all([adminA.save(), adminB.save(), staffA.save()]);

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const today = new Date();
  const [productA, nearExpiry, expired, productB, inactiveProduct, raceProduct, saleRaceProduct] = await Product.create([
    { name: "POS Rice", sku: "POS-A-RICE", category: "Grocery", price: 100, stock: 20, storeId: storeA._id, createdBy: adminA._id },
    { name: "POS Near Expiry", sku: "POS-A-NEAR", category: "Grocery", price: 100, stock: 5, expiry_date: tomorrow, storeId: storeA._id, createdBy: adminA._id },
    { name: "POS Expired", sku: "POS-A-EXPIRED", category: "Grocery", price: 100, stock: 5, expiry_date: today, storeId: storeA._id, createdBy: adminA._id },
    { name: "POS Store B Product", sku: "POS-B-ITEM", category: "Grocery", price: 200, stock: 10, storeId: storeB._id, createdBy: adminB._id },
    { name: "POS Inactive Product", sku: "POS-I-ITEM", category: "Grocery", price: 50, stock: 5, storeId: inactiveStore._id, createdBy: adminB._id },
    { name: "POS Billing Race", sku: "POS-A-RACE", category: "Grocery", price: 25, stock: 1, storeId: storeA._id, createdBy: adminA._id },
    { name: "POS Sale Race", sku: "POS-A-SALE-RACE", category: "Grocery", price: 15, stock: 1, storeId: storeA._id, createdBy: adminA._id },
  ]);

  const auth = {
    super: token(superUser._id, "super_admin"), adminA: token(adminA._id, "admin"), adminB: token(adminB._id, "admin"),
    staffA: token(staffA._id, "staff"), unassigned: token(unassigned._id, "admin"), user: token(customerUser._id, "user"),
  };
  const bill = (who, items, extra = {}) => request("POST", "/billing", who, { paymentMode: "CASH", items, cashReceived: 10000, ...extra });

  await expectStatus("unauthenticated billing is blocked", 401, bill(null, [{ productId: String(productA._id), qty: 1 }]));
  await expectStatus("customer role cannot access POS", 403, bill(auth.user, [{ productId: String(productA._id), qty: 1 }]));
  await expectStatus("unassigned admin cannot bill", 403, bill(auth.unassigned, [{ productId: String(productA._id), qty: 1 }]));
  await expectStatus("reject query-object payment mode", 400, request("POST", "/billing", auth.adminA, { paymentMode: { $ne: null }, items: [{ productId: String(productA._id), qty: 1 }], cashReceived: 1000 }));
  await expectStatus("reject duplicate bill lines", 400, bill(auth.adminA, [{ productId: String(productA._id), qty: 1 }, { productId: String(productA._id), qty: 1 }]));
  await expectStatus("reject fractional bill quantity", 400, bill(auth.adminA, [{ productId: String(productA._id), qty: 1.5 }]));
  await expectStatus("admin cannot bill another store product", 400, bill(auth.adminA, [{ productId: String(productB._id), qty: 1 }]));
  await expectStatus("super cannot mix stores in one bill", 400, bill(auth.super, [{ productId: String(productA._id), qty: 1 }, { productId: String(productB._id), qty: 1 }]));
  await expectStatus("super forged store selection is rejected", 400, bill(auth.super, [{ productId: String(productA._id), qty: 1 }], { storeId: String(storeB._id) }));
  await expectStatus("inactive store cannot be billed", 400, bill(auth.super, [{ productId: String(inactiveProduct._id), qty: 1 }]));
  await expectStatus("expired product cannot be billed", 409, bill(auth.adminA, [{ productId: String(expired._id), qty: 1 }]));
  await expectStatus("insufficient cash rolls bill back", 400, bill(auth.adminA, [{ productId: String(productA._id), qty: 1 }], { cashReceived: 10 }));
  assert.equal((await Product.findById(productA._id)).stock, 20);

  const validBill = await expectStatus("valid cash bill commits authoritative totals", 200, bill(auth.adminA, [
    { productId: String(productA._id), qty: 2 },
    { productId: String(nearExpiry._id), qty: 1 },
  ], { cashReceived: 300 }));
  assert.equal(validBill.subtotal, 250);
  assert.equal(validBill.gst, 45);
  assert.equal(validBill.total, 295);
  assert.equal(validBill.changeReturned, 5);
  assert.equal((await Product.findById(productA._id)).stock, 18);
  assert.equal((await Product.findById(nearExpiry._id)).stock, 4);
  assert.equal(await TransactionItem.countDocuments({ transaction_id: validBill.transactionId }), 2);

  const raceResults = await Promise.all([
    bill(auth.adminA, [{ productId: String(raceProduct._id), qty: 1 }]),
    bill(auth.adminA, [{ productId: String(raceProduct._id), qty: 1 }]),
  ]);
  assert.deepEqual(raceResults.map((result) => result.status).sort(), [200, 409]);
  assert.equal((await Product.findById(raceProduct._id)).stock, 0);
  assert.equal(await TransactionItem.countDocuments({ product_id: raceProduct._id }), 1);
  console.log("PASS concurrent POS bills cannot oversell one stock unit (200/409)");

  const loyaltyBillA = await expectStatus("create loyalty customer with first bill", 200, bill(auth.adminA, [{ productId: String(productA._id), qty: 1 }], {
    phone: "9888812345", joinLoyalty: true, newCustomer: { name: "POS Loyalty Customer", email: "loyalty@audit.com" }, cashReceived: 200,
  }));
  let loyaltyCustomer = await Customer.findOne({ phone: "9888812345" });
  assert.ok(loyaltyCustomer.storeIds.some((id) => String(id) === String(storeA._id)));
  assert.equal(loyaltyCustomer.points, 1);
  assert.equal(loyaltyCustomer.total_spent, 118);
  const loyaltyBillB = await expectStatus("same loyalty customer works at second store", 200, bill(auth.adminB, [{ productId: String(productB._id), qty: 1 }], { phone: "9888812345", cashReceived: 300 }));
  loyaltyCustomer = await Customer.findById(loyaltyCustomer._id);
  assert.equal(loyaltyCustomer.storeIds.length, 2);
  assert.equal(loyaltyCustomer.points, 3);
  assert.equal(loyaltyCustomer.total_spent, 354);
  await expectStatus("store A can find linked loyalty customer", 200, request("GET", "/customers/check?phone=9888812345", auth.adminA));
  await expectStatus("store B can find linked loyalty customer", 200, request("GET", "/customers/check?phone=9888812345", auth.adminB));
  await expectStatus("customer lookup rejects query-object injection", 400, request("GET", "/customers/check?phone[$ne]=x", auth.adminA));
  await expectStatus("cross-store admin cannot refund bill", 404, request("POST", `/billing/${loyaltyBillA.transactionId}/refund`, auth.adminB, { reason: "Wrong store" }));
  await expectStatus("staff cannot refund bill", 403, request("POST", `/billing/${loyaltyBillA.transactionId}/refund`, auth.staffA, { reason: "Not allowed" }));
  const riceBeforeRefund = (await Product.findById(productA._id)).stock;
  await expectStatus("admin refund reverses bill atomically", 200, request("POST", `/billing/${loyaltyBillA.transactionId}/refund`, auth.adminA, { reason: "Customer return" }));
  assert.equal((await Product.findById(productA._id)).stock, riceBeforeRefund + 1);
  loyaltyCustomer = await Customer.findById(loyaltyCustomer._id);
  assert.equal(loyaltyCustomer.points, 2);
  assert.equal(loyaltyCustomer.total_spent, 236);
  assert.equal(await LoyaltyHistory.countDocuments({ transaction_id: loyaltyBillA.transactionId, type: "REVERSED" }), 1);
  await expectStatus("repeat refund is conflict", 409, request("POST", `/billing/${loyaltyBillA.transactionId}/refund`, auth.adminA, { reason: "Repeat refund" }));

  const refundRaceBill = await expectStatus("create bill for refund race", 200, bill(auth.adminA, [{ productId: String(productA._id), qty: 1 }], { phone: "9888812345", cashReceived: 200 }));
  const stockBeforeRefundRace = (await Product.findById(productA._id)).stock;
  const refundRace = await Promise.all([
    request("POST", `/billing/${refundRaceBill.transactionId}/refund`, auth.adminA, { reason: "Concurrent return" }),
    request("POST", `/billing/${refundRaceBill.transactionId}/refund`, auth.adminA, { reason: "Concurrent return" }),
  ]);
  assert.deepEqual(refundRace.map((result) => result.status).sort(), [200, 409]);
  assert.equal((await Product.findById(productA._id)).stock, stockBeforeRefundRace + 1);
  assert.equal(await LoyaltyHistory.countDocuments({ transaction_id: refundRaceBill.transactionId, type: "REVERSED" }), 1);
  console.log("PASS concurrent refund restores stock and loyalty exactly once (200/409)");

  const reportsA = await expectStatus("store report remains scoped", 200, request("GET", "/reports", auth.adminA));
  assert.ok(!reportsA.some((row) => row.bill_number === loyaltyBillB.billNo));
  assert.ok(reportsA.some((row) => row.bill_number === loyaltyBillA.billNo && row.audit_status === "REVERSED"));
  const reportStats = await expectStatus("report revenue excludes reversed bills", 200, request("GET", "/reports/stats", auth.adminA));
  const expectedRevenueA = await Transaction.aggregate([
    { $match: { storeId: storeA._id, status: "SUCCESS" } },
    { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
  ]);
  assert.equal(reportStats.totalRevenue, expectedRevenueA[0].total);
  assert.equal(reportStats.totalOrders, expectedRevenueA[0].count);
  const paymentChart = await expectStatus("dashboard payment chart excludes refunds", 200, request("GET", "/dashboard/payment-chart", auth.adminA));
  assert.equal(paymentChart.reduce((sum, row) => sum + row.count, 0), expectedRevenueA[0].count);
  await expectStatus("receipt resend uses authoritative transaction", 200, request("POST", "/billing/send-whatsapp", auth.adminA, { phone: "9888812345", billNo: validBill.billNo, total: 1 }));
  await expectStatus("receipt resend is store scoped", 404, request("POST", "/billing/send-whatsapp", auth.adminB, { phone: "9888812345", billNo: validBill.billNo, total: 1 }));

  const saleRace = await Promise.all([
    request("POST", "/sales/add", auth.staffA, { product_id: String(saleRaceProduct._id), quantity: 1 }),
    request("POST", "/sales/add", auth.staffA, { product_id: String(saleRaceProduct._id), quantity: 1 }),
  ]);
  assert.deepEqual(saleRace.map((result) => result.status).sort(), [200, 409]);
  assert.equal((await Product.findById(saleRaceProduct._id)).stock, 0);
  assert.equal(await Sale.countDocuments({ product_id: saleRaceProduct._id }), 1);
  console.log("PASS legacy sale route is store-scoped and cannot oversell (200/409)");

  console.log(JSON.stringify({
    ids: { storeA: String(storeA._id), adminA: String(adminA._id), productA: String(productA._id), validTransaction: String(validBill.transactionId), loyaltyCustomer: String(loyaltyCustomer._id) },
    logins: { adminEmail: adminA.email, password: "audit-pass-123" },
  }));
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error(error);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
