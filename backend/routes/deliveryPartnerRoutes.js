const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const DeliveryPartner = require("../models/DeliveryPartner");
const Order = require("../models/Order");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createNotification } = require("../utils/inAppNotifications");
const { validateDeliveryLoginInput } = require("../utils/authInput");
const { canDeliveryTransition } = require("../utils/orderValidation");
const { text, email, phone, boolean, objectId } = require("../utils/managementInput");

const formatDeliveryPartner = (partner) => ({
  id: partner._id,
  name: partner.name,
  phone: partner.phone,
  email: partner.email,
  vehicleType: partner.vehicleType,
  vehicleNumber: partner.vehicleNumber,
  storeId: partner.storeId,
  isAvailable: partner.isAvailable,
  role: "delivery_partner",
});

const updateDeliveryLocation = async (req, res) => {
  try {
    if (req.user.role !== "delivery_partner")
      return res.status(403).json({ success: false, message: "Delivery access required" });
    const latitude = Number(req.body.lat);
    const longitude = Number(req.body.lng);
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    )
      return res.status(400).json({ success: false, message: "Valid lat and lng are required" });

    const updatedAt = new Date();
    await DeliveryPartner.findByIdAndUpdate(req.user.id, {
      location: { lat: latitude, lng: longitude, updatedAt },
    });
    await Order.updateMany(
      {
        deliveryPartnerId: req.user.id,
        status: { $in: ["Picked Up", "Out for Delivery"] },
      },
      {
        $set: {
          deliveryPartnerLocation: { latitude, longitude, updatedAt },
        },
      },
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to update location" });
  }
};

// @desc  Get all delivery partners
// @route GET /api/delivery-partners
router.get(
  "/",
  verifyToken,
  allowRole(["super_admin", "admin"]),
  async (req, res) => {
    try {
      if (req.user.role === "admin" && !req.user.storeId)
        return res.status(403).json({ success: false, message: "No store is assigned to this account" });
      const query = req.user.role === "admin"
        ? { $or: [{ storeId: req.user.storeId }, { storeId: null }] }
        : {};
      const partners = await DeliveryPartner.find(query).sort({ createdAt: -1 });
      res.json({ success: true, count: partners.length, data: partners });
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch delivery partners" });
    }
  },
);

// This specific route must stay before PUT /:id so "location" is not treated
// as a delivery-partner record ID by the management route.
router.put("/location", verifyToken, updateDeliveryLocation);

// @desc  Create delivery partner
// @route POST /api/delivery-partners
router.post("/", verifyToken, allowRole(["super_admin"]), async (req, res) => {
  try {
    const { name, phone, email, vehicleType, vehicleNumber, storeId } = req.body;
    const normalizedPhone = phone ? require("../utils/managementInput").phone(phone, { required: true }) : null;
    const normalizedStoreId = storeId ? objectId(storeId, "store id") : null;
    if (normalizedStoreId && !await require("../models/Store").exists({ _id: normalizedStoreId }))
      return res.status(404).json({ success: false, message: "Store not found" });

    const partner = await DeliveryPartner.create({
      name: text(name, "Name", { required: true }),
      phone: normalizedPhone,
      email: require("../utils/managementInput").email(email),
      vehicleType: vehicleType || "bike",
      vehicleNumber: text(vehicleNumber, "Vehicle number", { max: 40 }),
      storeId: normalizedStoreId,
      createdBy: req.user.id,
      isActive: true,
    });
    res.status(201).json({
      success: true,
      message: "Delivery partner created",
      data: partner,
    });
  } catch (err) {
    if (err.status || err.name === "ValidationError") return res.status(err.status || 400).json({ success: false, message: err.message });
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
      if (!require("mongoose").isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid partner id" });
      const update = {};
      if (req.body.name !== undefined) update.name = text(req.body.name, "Name", { required: true });
      if (req.body.phone !== undefined) update.phone = phone(req.body.phone, { required: true });
      if (req.body.email !== undefined) update.email = email(req.body.email);
      if (req.body.vehicleNumber !== undefined) update.vehicleNumber = text(req.body.vehicleNumber, "Vehicle number", { max: 40 });
      if (req.body.vehicleType !== undefined) update.vehicleType = req.body.vehicleType;
      if (req.body.isActive !== undefined) update.isActive = boolean(req.body.isActive, "isActive");
      if (req.body.storeId !== undefined) {
        update.storeId = req.body.storeId ? objectId(req.body.storeId, "store id") : null;
        if (update.storeId && !await require("../models/Store").exists({ _id: update.storeId })) return res.status(404).json({ success: false, message: "Store not found" });
      }
      if (!Object.keys(update).length) return res.status(400).json({ success: false, message: "No supported fields supplied" });
      const partner = await DeliveryPartner.findByIdAndUpdate(
        req.params.id,
        update,
        { returnDocument: "after", runValidators: true },
      );
      if (!partner)
        return res
          .status(404)
          .json({ success: false, message: "Partner not found" });
      res.json({ success: true, message: "Partner updated", data: partner });
    } catch (err) {
      if (err.status || err.name === "ValidationError") return res.status(err.status || 400).json({ success: false, message: err.message });
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
      if (!require("mongoose").isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid partner id" });
      const partner = await DeliveryPartner.findById(req.params.id);
      if (!partner)
        return res
          .status(404)
          .json({ success: false, message: "Partner not found" });
      if (partner.currentOrderId || await Order.exists({ deliveryPartnerId: partner._id, status: { $in: ["Confirmed", "Picked Up", "Out for Delivery"] } }))
        return res.status(409).json({ success: false, message: "Partner has an active order. Reassign it before deleting the partner." });
      await partner.deleteOne();
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
    const { phone, password } = validateDeliveryLoginInput(req.body);

    const partner = await DeliveryPartner.findOne({ phone, isActive: true });
    if (!partner)
      return res
        .status(401)
        .json({ success: false, message: "Invalid phone or password" });

    if (!partner.password)
      return res
        .status(400)
        .json({ success: false, message: "Password not set. Contact admin." });

    const isMatch = await partner.matchPassword(password);
    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, message: "Invalid phone or password" });

    const token = jwt.sign(
      { id: partner._id, role: "delivery_partner" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      success: true,
      token,
      partner: formatDeliveryPartner(partner),
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: status === 400 ? err.message : "Login failed",
    });
  }
});

// ─── GET CURRENT DELIVERY PARTNER ───────────────────────
router.get("/me", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "delivery_partner") {
      return res
        .status(403)
        .json({ success: false, message: "Delivery access required" });
    }

    const partner = await DeliveryPartner.findById(req.user.id)
      .select("name phone email vehicleType vehicleNumber storeId isAvailable");

    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery partner not found" });
    }

    return res.json({
      success: true,
      partner: formatDeliveryPartner(partner),
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to restore delivery session" });
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

    const currentOrder = await Order.findOne({
      _id: req.params.orderId,
      deliveryPartnerId: req.user.id,
    }).select("status userId");
    if (!currentOrder)
      return res.status(404).json({ success: false, message: "Order not found" });
    if (!canDeliveryTransition(currentOrder.status, status))
      return res.status(409).json({
        success: false,
        message: `Order cannot move from ${currentOrder.status} to ${status}`,
      });
    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.orderId,
        deliveryPartnerId: req.user.id,
        status: currentOrder.status,
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

    await Promise.allSettled([createNotification({
      recipientType: "user",
      recipientId: order.userId,
      title: "Delivery update",
      message: `Your order is now ${status}.`,
      type: "status",
      orderId: order._id,
    })]);

    res.json({ success: true, order });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update status" });
  }
});

// ─── GET DELIVERY PARTNER LOCATION (user polls this) ─────
// GET /api/delivery-partners/:id/location
// No auth needed so user can poll it
router.get("/:id/location", verifyToken, async (req, res) => {
  try {
    const partner = await DeliveryPartner.findById(req.params.id).select(
      "location name vehicleType storeId",
    );
    if (!partner)
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });

    let canRead = req.user.role === "super_admin";
    if (req.user.role === "delivery_partner") canRead = req.user.id === String(partner._id);
    if (["admin", "staff"].includes(req.user.role) && req.user.storeId)
      canRead =
        String(req.user.storeId) === String(partner.storeId || "") ||
        Boolean(await Order.exists({
          storeId: req.user.storeId,
          deliveryPartnerId: partner._id,
          status: { $in: ["Picked Up", "Out for Delivery"] },
        }));
    if (req.user.role === "user")
      canRead = Boolean(await Order.exists({
        userId: req.user.id,
        deliveryPartnerId: partner._id,
        status: { $in: ["Picked Up", "Out for Delivery"] },
      }));
    if (!canRead)
      return res.status(403).json({ success: false, message: "Forbidden" });

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
