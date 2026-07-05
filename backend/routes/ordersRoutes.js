const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const Order = require("../models/Order");
const Product = require("../models/Product");
const DeliveryPartner = require("../models/DeliveryPartner");
const authMiddleware = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const { createNotification, notifyAdmins, notifyStore } = require("../utils/inAppNotifications");

const router = express.Router();
const ORDER_STATUSES = ["Placed", "Confirmed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"];

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    const error = new Error("Online payment is not configured");
    error.statusCode = 503;
    throw error;
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

async function buildOrderPayload(body, userId) {
  if (!Array.isArray(body.items) || !body.items.length) throw Object.assign(new Error("Order items are required"), { statusCode: 400 });
  if (!body.address?.street || !body.address?.city) throw Object.assign(new Error("A complete delivery address is required"), { statusCode: 400 });
  const ids = body.items.map((item) => item.productId).filter(mongoose.isValidObjectId);
  const products = await Product.find({ _id: { $in: ids }, is_active: 1 });
  if (products.length !== ids.length) throw Object.assign(new Error("One or more products are no longer available"), { statusCode: 400 });
  const storeIds = new Set(products.map((product) => String(product.storeId || "")));
  if (storeIds.size !== 1 || storeIds.has("")) throw Object.assign(new Error("All products in an order must belong to the same store"), { statusCode: 400 });
  const resolvedStoreId = [...storeIds][0];
  if (body.storeId && String(body.storeId) !== resolvedStoreId) throw Object.assign(new Error("Cart store does not match the selected products"), { statusCode: 400 });
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const items = body.items.map((item) => {
    const product = productMap.get(String(item.productId));
    const quantity = Number(item.quantity);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) {
      throw Object.assign(new Error(`Invalid or unavailable product: ${item.name || item.productId}`), { statusCode: 400 });
    }
    return { productId: String(product._id), name: product.name, price: product.discount_price ?? product.price, quantity };
  });
  const itemsTotal = Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
  const deliveryCharge = 40;
  const gst = Number((itemsTotal * 0.05).toFixed(2));
  const couponCode = String(body.couponCode || "").trim().toUpperCase();
  const discount = couponCode === "TRY50" && itemsTotal >= 99
    ? Number(Math.min(itemsTotal * 0.5, 150).toFixed(2))
    : 0;
  return {
    userId,
    storeId: resolvedStoreId,
    items,
    address: body.address,
    itemsTotal,
    deliveryCharge,
    gst,
    discount,
    couponCode: discount ? couponCode : null,
    totalAmount: Number((itemsTotal + deliveryCharge + gst - discount).toFixed(2)),
    customerLocation: body.customerLocation,
  };
}

async function orderCreatedNotifications(order) {
  await Promise.all([
    createNotification({ recipientType: "user", recipientId: order.userId, title: "Order placed", message: `Your order #${String(order._id).slice(-6)} was placed.`, type: "order", orderId: order._id }),
    notifyStore(order.storeId, { title: "New order", message: `A new order for ₹${order.totalAmount.toFixed(2)} needs attention.`, type: "order", orderId: order._id }),
    notifyAdmins({ title: "New order", message: `Order #${String(order._id).slice(-6)} was created.`, type: "order", orderId: order._id }),
  ]);
}

router.post("/place", authMiddleware, allowRole(["user"]), async (req, res, next) => {
  try {
    const payload = await buildOrderPayload(req.body, req.user.id);
    const order = await Order.create({ ...payload, paymentMethod: "COD", paymentStatus: "pending" });
    await orderCreatedNotifications(order);
    res.status(201).json({ success: true, message: "Order placed successfully", order });
  } catch (error) { next(error); }
});

router.post("/payment/create", authMiddleware, allowRole(["user"]), async (req, res, next) => {
  try {
    const payload = await buildOrderPayload(req.body, req.user.id);
    const order = await Order.create({ ...payload, paymentMethod: "Razorpay", paymentStatus: "pending" });
    try {
      const razorpayOrder = await getRazorpay().orders.create({
        amount: Math.round(order.totalAmount * 100), currency: "INR", receipt: String(order._id),
        notes: { appOrderId: String(order._id) },
      });
      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
      res.status(201).json({ success: true, keyId: process.env.RAZORPAY_KEY_ID, orderId: order._id, razorpayOrderId: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency });
    } catch (error) {
      order.paymentStatus = "failed";
      order.paymentFailureReason = error.message;
      await order.save();
      throw error;
    }
  } catch (error) { next(error); }
});

router.post("/payment/verify", authMiddleware, allowRole(["user"]), async (req, res, next) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const order = await Order.findOne({ _id: orderId, userId: req.user.id, razorpayOrderId: razorpay_order_id });
    if (!order) return res.status(404).json({ message: "Payment order not found" });
    if (order.paymentStatus === "paid") return res.json({ success: true, order });
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "").update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    const valid = expected.length === String(razorpay_signature || "").length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(razorpay_signature || "")));
    if (!valid) {
      order.paymentStatus = "failed";
      order.paymentFailureReason = "Signature verification failed";
      await order.save();
      return res.status(400).json({ message: "Payment signature verification failed" });
    }
    order.paymentStatus = "paid";
    order.razorpayPaymentId = razorpay_payment_id;
    order.paymentFailureReason = null;
    await order.save();
    await Promise.all([
      orderCreatedNotifications(order),
      createNotification({ recipientType: "user", recipientId: order.userId, title: "Payment successful", message: `Payment of ₹${order.totalAmount.toFixed(2)} was verified.`, type: "payment", orderId: order._id }),
    ]);
    res.json({ success: true, order });
  } catch (error) { next(error); }
});

router.post("/payment/:orderId/failure", authMiddleware, allowRole(["user"]), async (req, res, next) => {
  try {
    const state = req.body.state === "cancelled" ? "cancelled" : "failed";
    const order = await Order.findOneAndUpdate(
      { _id: req.params.orderId, userId: req.user.id, paymentStatus: "pending" },
      { paymentStatus: state, paymentFailureReason: String(req.body.reason || state).slice(0, 300) }, { returnDocument: "after" }
    );
    if (!order) return res.status(404).json({ message: "Pending payment order not found" });
    await createNotification({ recipientType: "user", recipientId: order.userId, title: state === "cancelled" ? "Payment cancelled" : "Payment failed", message: "No payment was confirmed. You can try again.", type: "payment", orderId: order._id });
    res.json({ success: true, order });
  } catch (error) { next(error); }
});

router.get("/user/:userId", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role === "user" && req.user.id !== req.params.userId) return res.status(403).json({ message: "Forbidden" });
    res.json(await Order.find({ userId: req.params.userId }).populate("deliveryPartnerId", "name phone vehicleType").sort({ createdAt: -1 }));
  } catch (error) { next(error); }
});

router.get("/all", authMiddleware, allowRole(["super_admin"]), async (req, res, next) => {
  try { res.json(await Order.find().populate("userId", "name mobile email").populate("deliveryPartnerId", "name phone vehicleType").sort({ createdAt: -1 })); }
  catch (error) { next(error); }
});

router.get("/store/:storeId", authMiddleware, allowRole(["admin", "staff", "super_admin"]), async (req, res, next) => {
  try {
    if (req.user.role !== "super_admin" && String(req.user.storeId || "") !== req.params.storeId) {
      const User = require("../models/User");
      const actor = await User.findById(req.user.id).select("storeId");
      if (String(actor?.storeId || "") !== req.params.storeId) return res.status(403).json({ message: "Forbidden" });
    }
    res.json(await Order.find({ storeId: req.params.storeId }).populate("userId", "name mobile email").populate("deliveryPartnerId", "name phone vehicleType vehicleNumber").sort({ createdAt: -1 }));
  } catch (error) { next(error); }
});

router.put("/:id/status", authMiddleware, allowRole(["admin", "staff", "super_admin"]), async (req, res, next) => {
  try {
    if (!ORDER_STATUSES.includes(req.body.status)) return res.status(400).json({ message: "Invalid status" });
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { returnDocument: "after" }).populate("deliveryPartnerId", "name phone vehicleType");
    if (!order) return res.status(404).json({ message: "Order not found" });
    await createNotification({ recipientType: "user", recipientId: order.userId, title: "Order status updated", message: `Your order is now ${order.status}.`, type: "status", orderId: order._id });
    res.json({ success: true, order });
  } catch (error) { next(error); }
});

router.put("/:id/assign-delivery", authMiddleware, allowRole(["admin", "super_admin"]), async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { deliveryPartnerId: req.body.deliveryPartnerId, status: "Confirmed" }, { returnDocument: "after" }).populate("deliveryPartnerId", "name phone vehicleType");
    if (!order) return res.status(404).json({ message: "Order not found" });
    await DeliveryPartner.findByIdAndUpdate(req.body.deliveryPartnerId, { isAvailable: false, currentOrderId: req.params.id });
    await Promise.all([
      createNotification({ recipientType: "delivery", recipientId: req.body.deliveryPartnerId, title: "Delivery assigned", message: `Order #${String(order._id).slice(-6)} is ready for you.`, type: "order", orderId: order._id }),
      createNotification({ recipientType: "user", recipientId: order.userId, title: "Delivery partner assigned", message: `${order.deliveryPartnerId?.name || "A delivery partner"} will deliver your order.`, type: "status", orderId: order._id }),
    ]);
    res.json({ success: true, order });
  } catch (error) { next(error); }
});

module.exports = router;
