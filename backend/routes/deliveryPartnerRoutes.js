const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const DeliveryPartner = require("../models/DeliveryPartner");
const Order = require("../models/Order");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createNotification } = require("../utils/inAppNotifications");

// @desc  Get all delivery partners
// @route GET /api/delivery-partners
router.get(
  "/",
  verifyToken,
  allowRole(["super_admin", "admin"]),
  async (req, res) => {
    try {
      const partners = await DeliveryPartner.find().sort({ createdAt: -1 });
      res.json({ success: true, count: partners.length, data: partners });
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch delivery partners" });
    }
  },
);

// @desc  Create delivery partner
// @route POST /api/delivery-partners
router.post("/", verifyToken, allowRole(["super_admin"]), async (req, res) => {
  try {
    const { name, phone, email, vehicleType, vehicleNumber } = req.body;
    if (!name || !phone)
      return res
        .status(400)
        .json({ success: false, message: "Name and phone are required" });

    const partner = await DeliveryPartner.create({
      name,
      phone,
      email,
      vehicleType,
      vehicleNumber,
      createdBy: req.user.id,
      isActive: true,
    });
    res.status(201).json({
      success: true,
      message: "Delivery partner created",
      data: partner,
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to create delivery partner" });
  }
});

// @desc  Update delivery partner
// @route PUT /api/delivery-partners/:id
router.put(
  "/:id",
  verifyToken,
  allowRole(["super_admin"]),
  async (req, res) => {
    try {
      const partner = await DeliveryPartner.findByIdAndUpdate(
        req.params.id,
        req.body,
        { returnDocument: "after", runValidators: true },
      );
      if (!partner)
        return res
          .status(404)
          .json({ success: false, message: "Partner not found" });
      res.json({ success: true, message: "Partner updated", data: partner });
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: "Failed to update partner" });
    }
  },
);

// @desc  Delete delivery partner
// @route DELETE /api/delivery-partners/:id
router.delete(
  "/:id",
  verifyToken,
  allowRole(["super_admin"]),
  async (req, res) => {
    try {
      const partner = await DeliveryPartner.findByIdAndDelete(req.params.id);
      if (!partner)
        return res
          .status(404)
          .json({ success: false, message: "Partner not found" });
      res.json({ success: true, message: "Partner deleted" });
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: "Failed to delete partner" });
    }
  },
);

// ─── DELIVERY PARTNER LOGIN ───────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res
        .status(400)
        .json({ success: false, message: "Phone and password required" });

    const partner = await DeliveryPartner.findOne({ phone, isActive: true });
    if (!partner)
      return res
        .status(404)
        .json({ success: false, message: "Delivery partner not found" });

    if (!partner.password)
      return res
        .status(400)
        .json({ success: false, message: "Password not set. Contact admin." });

    const isMatch = await partner.matchPassword(password);
    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });

    const token = jwt.sign(
      { id: partner._id, role: "delivery_partner" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
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
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

// ─── SET / RESET PASSWORD ────────────────────────────────
router.put(
  "/:id/set-password",
  verifyToken,
  allowRole(["super_admin"]),
  async (req, res) => {
    try {
      const { password } = req.body;
      if (!password || password.length < 4)
        return res.status(400).json({
          success: false,
          message: "Password must be at least 4 characters",
        });

      const hashed = await bcrypt.hash(password, 10);
      const partner = await DeliveryPartner.findByIdAndUpdate(
        req.params.id,
        { password: hashed },
        { returnDocument: "after" },
      );
      if (!partner)
        return res
          .status(404)
          .json({ success: false, message: "Partner not found" });
      res.json({ success: true, message: "Password set successfully" });
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: "Failed to set password" });
    }
  },
);

// ─── GET MY ASSIGNED ORDERS ──────────────────────────────
router.get("/my-orders", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "delivery_partner")
      return res
        .status(403)
        .json({ success: false, message: "Delivery access required" });
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
    if (req.user.role !== "delivery_partner")
      return res
        .status(403)
        .json({ success: false, message: "Delivery access required" });
    const { status } = req.body;
    const allowed = ["Picked Up", "Out for Delivery"];
    if (status === "Delivered")
      return res.status(400).json({
        success: false,
        message: "Use delivery OTP verification to complete this order",
      });
    if (!allowed.includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });

    const allowedPreviousStatuses =
      status === "Picked Up"
        ? ["Confirmed", "Preparing"]
        : ["Confirmed", "Preparing", "Picked Up"];
    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.orderId,
        deliveryPartnerId: req.user.id,
        status: { $in: allowedPreviousStatuses },
      },
      { status },
      { returnDocument: "after" },
    );
    if (!order) {
      const currentOrder = await Order.findOne({
        _id: req.params.orderId,
        deliveryPartnerId: req.user.id,
      }).select("status");
      if (!currentOrder)
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      return res
        .status(409)
        .json({ success: false, message: "Order status changed. Refresh your assigned orders before updating it." });
    }

    if (status === "Delivered") {
      await DeliveryPartner.findByIdAndUpdate(req.user.id, {
        isAvailable: true,
        currentOrderId: null,
        location: null, // clear location on delivery
      });
    }

    await createNotification({
      recipientType: "user",
      recipientId: order.userId,
      title: "Delivery update",
      message: `Your order is now ${status}.`,
      type: "status",
      orderId: order._id,
    });

    res.json({ success: true, order });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update status" });
  }
});

// ─── UPDATE LIVE LOCATION (delivery partner pushes GPS) ──
// PUT /api/delivery-partners/location
// Body: { lat, lng }
router.put("/location", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "delivery_partner")
      return res
        .status(403)
        .json({ success: false, message: "Delivery access required" });
    const { lat, lng } = req.body;
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    )
      return res
        .status(400)
        .json({ success: false, message: "Valid lat and lng are required" });

    await DeliveryPartner.findByIdAndUpdate(req.user.id, {
      location: { lat: latitude, lng: longitude, updatedAt: new Date() },
    });
    await Order.updateMany(
      {
        deliveryPartnerId: req.user.id,
        status: { $in: ["Picked Up", "Out for Delivery"] },
      },
      {
        $set: {
          deliveryPartnerLocation: {
            latitude,
            longitude,
            updatedAt: new Date(),
          },
        },
      },
    );

    res.json({ success: true });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update location" });
  }
});

// ─── GET DELIVERY PARTNER LOCATION (user polls this) ─────
// GET /api/delivery-partners/:id/location
// No auth needed so user can poll it
router.get("/:id/location", verifyToken, async (req, res) => {
  try {
    const partner = await DeliveryPartner.findById(req.params.id).select(
      "location name vehicleType",
    );
    if (!partner)
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });

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
