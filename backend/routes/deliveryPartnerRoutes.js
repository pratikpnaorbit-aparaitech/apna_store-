const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const DeliveryPartner = require("../models/DeliveryPartner");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// @desc  Get all delivery partners
// @route GET /api/delivery-partners
router.get("/", verifyToken, allowRole(["super_admin", "admin"]), async (req, res) => {
  const partners = await DeliveryPartner.find().sort({ createdAt: -1 });
  res.json({ success: true, count: partners.length, data: partners });
  try {
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch delivery partners" });
  }
});

// @desc  Create delivery partner
// @route POST /api/delivery-partners
router.post("/", verifyToken, allowRole(["super_admin"]), async (req, res) => {
  try {
    const { name, phone, email, vehicleType, vehicleNumber } = req.body;
    if (!name || !phone)
      return res.status(400).json({ success: false, message: "Name and phone are required" });

    const partner = await DeliveryPartner.create({
      name, phone, email, vehicleType, vehicleNumber,
      createdBy: req.user.id,
      isActive: true,
    });
    res.status(201).json({ success: true, message: "Delivery partner created", data: partner });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create delivery partner" });
  }
});

// @desc  Update delivery partner
// @route PUT /api/delivery-partners/:id
router.put("/:id", verifyToken, allowRole(["super_admin"]), async (req, res) => {
  try {
    const partner = await DeliveryPartner.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!partner) return res.status(404).json({ success: false, message: "Partner not found" });
    res.json({ success: true, message: "Partner updated", data: partner });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update partner" });
  }
});

// @desc  Delete delivery partner
// @route DELETE /api/delivery-partners/:id
router.delete("/:id", verifyToken, allowRole(["super_admin"]), async (req, res) => {
  try {
    const partner = await DeliveryPartner.findByIdAndDelete(req.params.id);
    if (!partner) return res.status(404).json({ success: false, message: "Partner not found" });
    res.json({ success: true, message: "Partner deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete partner" });
  }
});

// ─── DELIVERY PARTNER LOGIN ───────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res.status(400).json({ success: false, message: "Phone and password required" });

    const partner = await DeliveryPartner.findOne({ phone, isActive: true });
    if (!partner)
      return res.status(404).json({ success: false, message: "Delivery partner not found" });

    if (!partner.password)
      return res.status(400).json({ success: false, message: "Password not set. Contact admin." });

    const isMatch = await partner.matchPassword(password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Invalid password" });

    const token = jwt.sign(
      { id: partner._id, role: "delivery_partner" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      partner: {
        id: partner._id,
        name: partner.name,
        phone: partner.phone,
        email: partner.email,
        vehicleType: partner.vehicleType,
        vehicleNumber: partner.vehicleNumber,
        storeId: partner.storeId,
        isAvailable: partner.isAvailable,
        role: "delivery_partner",
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

// ─── SET / RESET PASSWORD ────────────────────────────────
router.put("/:id/set-password", verifyToken, allowRole(["super_admin"]), async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 4)
      return res.status(400).json({ success: false, message: "Password must be at least 4 characters" });

    const hashed = await bcrypt.hash(password, 10);
    const partner = await DeliveryPartner.findByIdAndUpdate(
      req.params.id, { password: hashed }, { new: true }
    );
    if (!partner) return res.status(404).json({ success: false, message: "Partner not found" });
    res.json({ success: true, message: "Password set successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to set password" });
  }
});

// ─── GET MY ASSIGNED ORDERS ──────────────────────────────
router.get("/my-orders", verifyToken, async (req, res) => {
  try {
    const Order = require("../models/Order");
    const orders = await Order.find({ deliveryPartnerId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("userId", "name mobile");
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

// ─── UPDATE ORDER STATUS ─────────────────────────────────
router.put("/order/:orderId/status", verifyToken, async (req, res) => {
  try {
    const Order = require("../models/Order");
    const { status } = req.body;
    const allowed = ["Out for Delivery", "Delivered"];
    if (!allowed.includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });

    const order = await Order.findByIdAndUpdate(
      req.params.orderId, { status }, { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (status === "Delivered") {
      await DeliveryPartner.findByIdAndUpdate(req.user.id, {
        isAvailable: true,
        currentOrderId: null,
        location: null, // clear location on delivery
      });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
});

// ─── UPDATE LIVE LOCATION (delivery partner pushes GPS) ──
// PUT /api/delivery-partners/location
// Body: { lat, lng }
router.put("/location", verifyToken, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng)
      return res.status(400).json({ success: false, message: "lat and lng required" });

    await DeliveryPartner.findByIdAndUpdate(req.user.id, {
      location: { lat: Number(lat), lng: Number(lng), updatedAt: new Date() }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update location" });
  }
});

// ─── GET DELIVERY PARTNER LOCATION (user polls this) ─────
// GET /api/delivery-partners/:id/location
// No auth needed so user can poll it
router.get("/:id/location", async (req, res) => {
  try {
    const partner = await DeliveryPartner.findById(req.params.id).select("location name vehicleType");
    if (!partner) return res.status(404).json({ success: false, message: "Partner not found" });

    res.json({
      success: true,
      location: partner.location || null,
      name: partner.name,
      vehicleType: partner.vehicleType,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to get location" });
  }
});

module.exports = router;