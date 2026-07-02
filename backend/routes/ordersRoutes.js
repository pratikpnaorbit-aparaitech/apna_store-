const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const authMiddleware = require("../middleware/authMiddleware");

/* ── PLACE ORDER (FIX: added authMiddleware — was completely unprotected) ── */
router.post("/place", authMiddleware, async (req, res) => {
  try {
    console.log("ORDER RECEIVED:", req.body);
    const order = new Order(req.body);
    await order.save();
    res.json({ success: true, message: "Order placed successfully" });
  } catch (err) {
    console.error("ORDER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ── GET USER ORDERS ── */
router.get("/user/:userId", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .populate("deliveryPartnerId", "name phone vehicleType")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET ALL ORDERS (SUPER ADMIN) ── */
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name mobile email")
      .populate("deliveryPartnerId", "name phone vehicleType")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET ORDERS BY STORE ── */
router.get("/store/:storeId", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ storeId: req.params.storeId })
      .populate("userId", "name mobile email")
      .populate("deliveryPartnerId", "name phone vehicleType vehicleNumber")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── UPDATE ORDER STATUS (FIX: removed duplicate route — only one now) ── */
router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["Placed", "Confirmed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status))
      return res.status(400).json({ error: "Invalid status" });

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("deliveryPartnerId", "name phone vehicleType");

    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── ASSIGN DELIVERY PARTNER ── */
router.put("/:id/assign-delivery", authMiddleware, async (req, res) => {
  try {
    const { deliveryPartnerId } = req.body;
    const DeliveryPartner = require("../models/DeliveryPartner");

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { deliveryPartnerId, status: "Confirmed" },
      { new: true }
    ).populate("deliveryPartnerId", "name phone vehicleType");

    if (!order) return res.status(404).json({ error: "Order not found" });

    await DeliveryPartner.findByIdAndUpdate(deliveryPartnerId, {
      isAvailable: false,
      currentOrderId: req.params.id
    });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
