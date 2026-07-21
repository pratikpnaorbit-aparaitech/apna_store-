const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const PDFDocument = require("pdfkit");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Store = require("../models/Store");
const DeliveryPartner = require("../models/DeliveryPartner");
const { sendOtpEmail } = require("../utils/emailService");
const authMiddleware = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const {
  createNotification,
  notifyAdmins,
  notifyStore,
} = require("../utils/inAppNotifications");
const {
  canAdminTransition,
  normalizeAddress,
  normalizeCouponCode,
  normalizeCustomerLocation,
  normalizeOrderItems,
  normalizePaymentMethod,
} = require("../utils/orderValidation");
const { sellableExpiryFilter } = require("../utils/productAvailability");

const router = express.Router();
const ORDER_STATUSES = [
  "Placed",
  "Confirmed",
  "Preparing",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];
const CUSTOMER_CANCELLABLE_STATUSES = ["Placed", "Confirmed"];
const DELIVERY_LOCKED_STATUSES = ["Picked Up", "Out for Delivery", "Delivered"];

const TRACKING_STEPS = [
  { key: "placed", label: "Order Placed" },
  { key: "accepted", label: "Accepted" },
  { key: "preparing", label: "Preparing" },
  { key: "assigned", label: "Assigned Delivery Partner" },
  { key: "pickedUp", label: "Picked Up" },
  { key: "outForDelivery", label: "Out For Delivery" },
  { key: "delivered", label: "Delivered" },
];

function buildTrackingTimeline(order) {
  const statusRank = {
    Placed: 0,
    Confirmed: 1,
    Preparing: 2,
    "Picked Up": 4,
    "Out for Delivery": 5,
    Delivered: 6,
  };
  const rank = statusRank[order.status] ?? 0;
  return TRACKING_STEPS.map((step, index) => ({
    ...step,
    completed:
      order.status !== "Cancelled" &&
      (index <= rank || (step.key === "assigned" && Boolean(order.deliveryPartnerId))),
    current: order.status !== "Cancelled" && index === rank,
  }));
}

function canAccessTracking(req, order) {
  if (req.user.role === "user") return String(order.userId) === req.user.id;
  if (req.user.role === "delivery_partner")
    return String(order.deliveryPartnerId?._id || order.deliveryPartnerId || "") === req.user.id;
  return req.user.role === "super_admin";
}

function getCustomerCancellationBlock(order) {
  if (!order) return { status: 404, message: "Order not found" };
  if (order.status === "Cancelled")
    return { status: 409, message: "Order is already cancelled." };
  if (DELIVERY_LOCKED_STATUSES.includes(order.status))
    return {
      status: 409,
      message: "Order cannot be cancelled because it has already been picked up for delivery.",
    };
  if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status))
    return {
      status: 409,
      message: "This order can no longer be cancelled because preparation or delivery has started",
    };
  if (order.paymentMethod === "Razorpay" && order.paymentStatus === "paid")
    return {
      status: 400,
      message: "Paid online orders require refund assistance. Please contact support.",
    };
  return null;
}

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
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw Object.assign(new Error("Invalid order request"), { statusCode: 400 });
  const customerLocation = normalizeCustomerLocation(body.customerLocation);
  const requestedItems = normalizeOrderItems(body.items);
  const address = normalizeAddress(body.address, customerLocation);
  const ids = requestedItems.map((item) => item.productId);
  if (!ids.every(mongoose.isValidObjectId))
    throw Object.assign(new Error("One or more product IDs are invalid"), { statusCode: 400 });
  const products = await Product.find({
    _id: { $in: ids },
    is_active: 1,
    ...sellableExpiryFilter(),
  });
  if (products.length !== ids.length)
    throw Object.assign(
      new Error("One or more products are no longer available"),
      { statusCode: 400 },
    );
  const storeIds = new Set(
    products.map((product) => String(product.storeId || "")),
  );
  if (storeIds.size !== 1 || storeIds.has(""))
    throw Object.assign(
      new Error("All products in an order must belong to the same store"),
      { statusCode: 400 },
    );
  const resolvedStoreId = [...storeIds][0];
  const activeStore = await Store.exists({ _id: resolvedStoreId, isActive: true });
  if (!activeStore)
    throw Object.assign(new Error("This store is currently unavailable"), { statusCode: 409 });
  if (body.storeId && String(body.storeId) !== resolvedStoreId)
    throw Object.assign(
      new Error("Cart store does not match the selected products"),
      { statusCode: 400 },
    );
  const productMap = new Map(
    products.map((product) => [String(product._id), product]),
  );
  const items = requestedItems.map((item) => {
    const product = productMap.get(String(item.productId));
    const quantity = item.quantity;
    if (!product || quantity > product.stock) {
      throw Object.assign(
        new Error(
          `Invalid or unavailable product: ${item.name || item.productId}`,
        ),
        { statusCode: 400 },
      );
    }
    return {
      productId: String(product._id),
      name: product.name,
      price: product.discount_price ?? product.price,
      quantity,
      unit: product.unit || "piece",
    };
  });
  const itemsTotal = Number(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2),
  );
  const deliveryCharge = 40;
  const gst = Number((itemsTotal * 0.05).toFixed(2));
  const couponCode = normalizeCouponCode(body.couponCode);
  const discount =
    couponCode === "TRY50" && itemsTotal >= 99
      ? Number(Math.min(itemsTotal * 0.5, 150).toFixed(2))
      : 0;
  return {
    userId,
    storeId: resolvedStoreId,
    items,
    address,
    itemsTotal,
    deliveryCharge,
    gst,
    discount,
    couponCode: discount ? couponCode : null,
    totalAmount: Number(
      (itemsTotal + deliveryCharge + gst - discount).toFixed(2),
    ),
    customerLocation,
  };
}

async function reserveOrderStock(order) {
  const reserved = [];
  try {
    for (const item of order.items) {
      const product = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity }, is_active: 1 },
        { $inc: { stock: -item.quantity } },
        { returnDocument: "after" },
      );
      if (!product)
        throw Object.assign(new Error(`Insufficient stock for ${item.name}`), {
          statusCode: 409,
        });
      reserved.push(item);
    }
    order.stockReserved = true;
    await order.save();
  } catch (error) {
    await Promise.all(
      reserved.map((item) =>
        Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity },
        }),
      ),
    );
    throw error;
  }
}

async function restoreOrderStock(order) {
  if (!order.stockReserved) return;
  const lockedOrder = await Order.findOneAndUpdate(
    { _id: order._id, stockReserved: true },
    { $set: { stockReserved: false } },
    { returnDocument: "before" },
  );
  order.stockReserved = false;
  if (!lockedOrder) return;
  await Promise.all(
    lockedOrder.items.map((item) =>
      Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      }),
    ),
  );
}

async function orderCreatedNotifications(order) {
  const outcomes = await Promise.allSettled([
    createNotification({
      recipientType: "user",
      recipientId: order.userId,
      title: "Order placed",
      message: `Your order #${String(order._id).slice(-6)} was placed.`,
      type: "order",
      orderId: order._id,
    }),
    notifyStore(order.storeId, {
      title: "New order",
      message: `A new order for ₹${order.totalAmount.toFixed(2)} needs attention.`,
      type: "order",
      orderId: order._id,
    }),
    notifyAdmins({
      title: "New order",
      message: `Order #${String(order._id).slice(-6)} was created.`,
      type: "order",
      orderId: order._id,
    }),
  ]);
  outcomes.forEach((outcome) => {
    if (outcome.status === "rejected")
      console.error("Order notification failed:", outcome.reason?.message || outcome.reason);
  });
}

router.post(
  "/place",
  authMiddleware,
  allowRole(["user"]),
  async (req, res, next) => {
    try {
      const paymentMethod = normalizePaymentMethod(req.body.paymentMethod || req.body.paymentType);
      if (paymentMethod !== "COD") {
        return res.status(400).json({
          message: "Use /api/orders/payment/create for Razorpay orders",
        });
      }
      const payload = await buildOrderPayload(req.body, req.user.id);
      const order = await Order.create({
        ...payload,
        paymentMethod: "COD",
        paymentStatus: "pending",
      });
      try {
        await reserveOrderStock(order);
      } catch (error) {
        await Order.findByIdAndDelete(order._id);
        throw error;
      }
      await orderCreatedNotifications(order);
      res
        .status(201)
        .json({ success: true, message: "Order placed successfully", order });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/payment/create",
  authMiddleware,
  allowRole(["user"]),
  async (req, res, next) => {
    try {
      const payload = await buildOrderPayload(req.body, req.user.id);
      const order = await Order.create({
        ...payload,
        paymentMethod: "Razorpay",
        paymentStatus: "pending",
      });
      try {
        await reserveOrderStock(order);
      } catch (error) {
        await Order.findByIdAndDelete(order._id);
        throw error;
      }
      try {
        const razorpayOrder = await getRazorpay().orders.create({
          amount: Math.round(order.totalAmount * 100),
          currency: "INR",
          receipt: String(order._id),
          notes: { appOrderId: String(order._id) },
        });
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();
        res.status(201).json({
          success: true,
          keyId: process.env.RAZORPAY_KEY_ID,
          orderId: order._id,
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
        });
      } catch (error) {
        order.paymentStatus = "failed";
        order.paymentFailureReason = error.message;
        order.status = "Cancelled";
        order.cancellationReason = "Online payment could not be started";
        order.cancelledBy = "system";
        order.cancelledAt = new Date();
        await restoreOrderStock(order);
        await order.save();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/payment/verify",
  authMiddleware,
  allowRole(["user"]),
  async (req, res, next) => {
    try {
      const {
        orderId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body;
      const order = await Order.findOne({
        _id: orderId,
        userId: req.user.id,
        razorpayOrderId: razorpay_order_id,
      });
      if (!order)
        return res.status(404).json({ message: "Payment order not found" });
      if (order.paymentStatus === "paid")
        return res.json({ success: true, order });
      if (order.paymentStatus !== "pending")
        return res.status(409).json({ message: "This payment is no longer pending" });
      if (!process.env.RAZORPAY_KEY_SECRET)
        return res.status(503).json({ message: "Online payment is not configured" });
      if (
        typeof razorpay_order_id !== "string" ||
        typeof razorpay_payment_id !== "string" ||
        typeof razorpay_signature !== "string" ||
        !razorpay_payment_id.trim() ||
        !razorpay_signature.trim()
      )
        return res.status(400).json({ message: "Complete payment verification details are required" });
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      const valid =
        expected.length === String(razorpay_signature || "").length &&
        crypto.timingSafeEqual(
          Buffer.from(expected),
          Buffer.from(String(razorpay_signature || "")),
        );
      if (!valid) {
        const failedOrder = await Order.findOneAndUpdate(
          { _id: order._id, paymentStatus: "pending" },
          {
            $set: {
              paymentStatus: "failed",
              paymentFailureReason: "Signature verification failed",
              status: "Cancelled",
              cancellationReason: "Online payment verification failed",
              cancelledBy: "system",
              cancelledAt: new Date(),
            },
          },
          { returnDocument: "after" },
        );
        if (!failedOrder)
          return res.status(409).json({ message: "Payment state changed. Refresh the order" });
        await restoreOrderStock(failedOrder);
        return res
          .status(400)
          .json({ message: "Payment signature verification failed" });
      }
      const paidOrder = await Order.findOneAndUpdate(
        { _id: order._id, paymentStatus: "pending", stockReserved: true },
        {
          $set: {
            paymentStatus: "paid",
            razorpayPaymentId: razorpay_payment_id,
            paymentFailureReason: null,
          },
        },
        { returnDocument: "after" },
      );
      if (!paidOrder)
        return res.status(409).json({ message: "Payment state changed. Refresh the order" });
      await Promise.allSettled([
        orderCreatedNotifications(paidOrder),
        createNotification({
          recipientType: "user",
          recipientId: paidOrder.userId,
          title: "Payment successful",
          message: `Payment of ₹${paidOrder.totalAmount.toFixed(2)} was verified.`,
          type: "payment",
          orderId: paidOrder._id,
        }),
      ]);
      res.json({ success: true, order: paidOrder });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/payment/:orderId/failure",
  authMiddleware,
  allowRole(["user"]),
  async (req, res, next) => {
    try {
      const state = req.body.state === "cancelled" ? "cancelled" : "failed";
      const order = await Order.findOneAndUpdate(
        {
          _id: req.params.orderId,
          userId: req.user.id,
          paymentStatus: "pending",
        },
        {
          paymentStatus: state,
          paymentFailureReason: String(req.body.reason || state).slice(0, 300),
          status: "Cancelled",
          cancellationReason: state === "cancelled" ? "Online payment was cancelled" : "Online payment failed",
          cancelledBy: "system",
          cancelledAt: new Date(),
        },
        { returnDocument: "after" },
      );
      if (!order)
        return res
          .status(404)
          .json({ message: "Pending payment order not found" });
      await restoreOrderStock(order);
      await order.save();
      await createNotification({
        recipientType: "user",
        recipientId: order.userId,
        title: state === "cancelled" ? "Payment cancelled" : "Payment failed",
        message: "No payment was confirmed. You can try again.",
        type: "payment",
        orderId: order._id,
      });
      res.json({ success: true, order });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/user/:userId", authMiddleware, async (req, res, next) => {
  try {
    const canRead =
      (req.user.role === "user" && req.user.id === req.params.userId) ||
      req.user.role === "super_admin";
    if (!canRead)
      return res.status(403).json({ message: "Forbidden" });
    res.json(
      await Order.find({ userId: req.params.userId })
        .select("-deliveryPartnerLocation")
        .populate("deliveryPartnerId", "name phone vehicleType vehicleNumber")
        .sort({ createdAt: -1 }),
    );
  } catch (error) {
    next(error);
  }
});

router.put(
  "/:id/cancel",
  authMiddleware,
  allowRole(["user"]),
  async (req, res, next) => {
    try {
      const cancellationReason = String(req.body.reason || "").trim();
      if (cancellationReason.length < 3)
        return res
          .status(400)
          .json({ message: "Please provide a cancellation reason" });

      const currentOrder = await Order.findOne({
        _id: req.params.id,
        userId: req.user.id,
      });
      const initialBlock = getCustomerCancellationBlock(currentOrder);
      if (initialBlock)
        return res.status(initialBlock.status).json({ message: initialBlock.message });

      const now = new Date();
      const order = await Order.findOneAndUpdate(
        {
          _id: req.params.id,
          userId: req.user.id,
          status: { $in: CUSTOMER_CANCELLABLE_STATUSES },
          $nor: [{ paymentMethod: "Razorpay", paymentStatus: "paid" }],
        },
        {
          $set: {
            status: "Cancelled",
            cancellationReason: cancellationReason.slice(0, 500),
            cancelledBy: "user",
            cancelledAt: now,
            ...(currentOrder.paymentStatus === "pending" ? { paymentStatus: "cancelled" } : {}),
          },
        },
        { returnDocument: "after" },
      );

      if (!order) {
        const latestOrder = await Order.findOne({
          _id: req.params.id,
          userId: req.user.id,
        });
        const latestBlock = getCustomerCancellationBlock(latestOrder);
        return res.status(latestBlock?.status || 409).json({
          message: latestBlock?.message || "Order status changed before cancellation. Please refresh and try again.",
        });
      }

      await restoreOrderStock(order);
      await order.save();
      if (order.deliveryPartnerId) {
        await DeliveryPartner.findByIdAndUpdate(order.deliveryPartnerId, {
          isAvailable: true,
          currentOrderId: null,
        });
      }
      await Promise.all([
        createNotification({
          recipientType: "user",
          recipientId: order.userId,
          title: "Order cancelled",
          message: `Order #${String(order._id).slice(-6)} was cancelled.`,
          type: "status",
          orderId: order._id,
        }),
        notifyStore(order.storeId, {
          title: "Order cancelled",
          message: `Customer cancelled order #${String(order._id).slice(-6)}: ${order.cancellationReason}`,
          type: "status",
          orderId: order._id,
        }),
        notifyAdmins({
          title: "Order cancelled",
          message: `Order #${String(order._id).slice(-6)} was cancelled: ${order.cancellationReason}`,
          type: "status",
          orderId: order._id,
        }),
      ]);
      res.json({
        success: true,
        message: "Order cancelled successfully",
        order,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:id/tracking", authMiddleware, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "deliveryPartnerId",
      "name phone vehicleType vehicleNumber",
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!canAccessTracking(req, order))
      return res.status(403).json({ message: "Forbidden" });

    const locationVisible = ["Picked Up", "Out for Delivery"].includes(order.status);
    const safeOrder = order.toObject();
    if (!locationVisible) delete safeOrder.deliveryPartnerLocation;
    return res.json({
      success: true,
      order: safeOrder,
      timeline: buildTrackingTimeline(order),
      locationVisible,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/location", authMiddleware, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "deliveryPartnerId",
      "name location vehicleType vehicleNumber",
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!canAccessTracking(req, order))
      return res.status(403).json({ message: "Forbidden" });

    const visible = ["Picked Up", "Out for Delivery"].includes(order.status);
    if (!visible) {
      return res.json({ success: true, visible: false, location: null });
    }

    const saved = order.deliveryPartnerLocation;
    const fallback = order.deliveryPartnerId?.location;
    const location = Number.isFinite(saved?.latitude) && Number.isFinite(saved?.longitude)
      ? saved
      : Number.isFinite(fallback?.lat) && Number.isFinite(fallback?.lng)
        ? {
            latitude: fallback.lat,
            longitude: fallback.lng,
            updatedAt: fallback.updatedAt,
          }
        : null;
    return res.json({
      success: true,
      visible: true,
      location,
      customerLocation: order.customerLocation || null,
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/all",
  authMiddleware,
  allowRole(["super_admin"]),
  async (req, res, next) => {
    try {
      res.json(
        await Order.find()
          .populate("userId", "name mobile email")
          .populate("deliveryPartnerId", "name phone vehicleType")
          .sort({ createdAt: -1 }),
      );
    } catch (error) {
      next(error);
    }
  },
);


const hashDeliveryOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

router.post(
  "/:orderId/delivery-otp/request",
  authMiddleware,
  allowRole(["delivery_partner"]),
  async (req, res, next) => {
    try {
      const order = await Order.findOne({
        _id: req.params.orderId,
        deliveryPartnerId: req.user.id,
      }).populate("userId", "name email mobile");

      if (!order) return res.status(404).json({ success: false, message: "Order not found" });
      if (order.status !== "Out for Delivery")
        return res.status(409).json({ success: false, message: "Delivery OTP can be requested only when the order is out for delivery" });
      if (order.deliveryOtpLastSentAt && Date.now() - order.deliveryOtpLastSentAt.getTime() < 60_000)
        return res.status(429).json({ success: false, message: "Please wait one minute before requesting another OTP" });

      const customerEmail = order.userId?.email;
      if (!customerEmail) {
        return res.status(400).json({ success: false, message: "Customer email is not available for this order" });
      }

      const otp = crypto.randomInt(100000, 1000000).toString();
      order.deliveryOtpHash = hashDeliveryOtp(otp);
      order.deliveryOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      order.deliveryOtpVerifiedAt = null;
      order.deliveryOtpUsed = false;
      order.deliveryOtpAttempts = 0;
      order.deliveryOtpLastSentAt = new Date();
      await order.save();

      try {
        await sendOtpEmail({ email: customerEmail, otp, purpose: "delivery-verification" });
      } catch (error) {
        order.deliveryOtpHash = null;
        order.deliveryOtpExpiresAt = null;
        order.deliveryOtpVerifiedAt = null;
        order.deliveryOtpUsed = false;
        order.deliveryOtpAttempts = 0;
        order.deliveryOtpLastSentAt = null;
        await order.save();
        throw error;
      }

      res.json({ success: true, message: "OTP sent to customer email" });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:orderId/delivery-otp/verify",
  authMiddleware,
  allowRole(["delivery_partner"]),
  async (req, res, next) => {
    try {
      const otp = String(req.body.otp || "").trim();
      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({ success: false, message: "Enter a valid 6-digit OTP" });
      }

      const order = await Order.findOne({
        _id: req.params.orderId,
        deliveryPartnerId: req.user.id,
      }).select("+deliveryOtpHash");

      if (!order) return res.status(404).json({ success: false, message: "Order not found" });
      if (order.status !== "Out for Delivery")
        return res.status(409).json({ success: false, message: "Delivery OTP can be verified only when the order is out for delivery" });
      if (!order.deliveryOtpHash || !order.deliveryOtpExpiresAt) {
        return res.status(400).json({ success: false, message: "Delivery OTP was not requested" });
      }
      if (order.deliveryOtpUsed || order.deliveryOtpVerifiedAt) {
        return res.status(400).json({ success: false, message: "Delivery OTP is already used" });
      }
      if (order.deliveryOtpExpiresAt.getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: "Delivery OTP has expired" });
      }
      if (order.deliveryOtpAttempts >= 5)
        return res.status(429).json({ success: false, message: "Too many incorrect attempts. Request a new OTP" });

      const suppliedHash = Buffer.from(hashDeliveryOtp(otp), "hex");
      const storedHash = Buffer.from(order.deliveryOtpHash, "hex");
      if (suppliedHash.length !== storedHash.length || !crypto.timingSafeEqual(suppliedHash, storedHash)) {
        order.deliveryOtpAttempts += 1;
        if (order.deliveryOtpAttempts >= 5) {
          order.deliveryOtpHash = null;
          order.deliveryOtpExpiresAt = null;
        }
        await order.save();
        return res.status(400).json({ success: false, message: "Invalid delivery OTP" });
      }

      const completedAt = new Date();
      const completedOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          deliveryPartnerId: req.user.id,
          status: "Out for Delivery",
          deliveryOtpUsed: false,
          deliveryOtpHash: order.deliveryOtpHash,
        },
        {
          $set: {
            deliveryOtpUsed: true,
            deliveryOtpVerifiedAt: completedAt,
            deliveryOtpHash: null,
            deliveryOtpExpiresAt: null,
            status: "Delivered",
            deliveredAt: completedAt,
          },
        },
        { returnDocument: "after" },
      );
      if (!completedOrder)
        return res.status(409).json({ success: false, message: "Order status changed. Refresh before verifying the OTP" });

      await Promise.allSettled([
        DeliveryPartner.findByIdAndUpdate(req.user.id, {
          isAvailable: true,
          currentOrderId: null,
          location: null,
        }),
        createNotification({
          recipientType: "user",
          recipientId: completedOrder.userId,
          title: "Delivery completed",
          message: "Your order was delivered successfully.",
          type: "status",
          orderId: completedOrder._id,
        }),
      ]);

      const safeOrder = await Order.findById(completedOrder._id).populate("deliveryPartnerId", "name phone vehicleType");
      res.json({ success: true, message: "Delivery completed successfully", order: safeOrder });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/:id/invoice",
  authMiddleware,
  allowRole(["admin", "staff", "super_admin"]),
  async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id)
        .populate("userId", "name email mobile")
        .populate("storeId", "name");
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (
        req.user.role !== "super_admin" &&
        String(req.user.storeId || "") !==
          String(order.storeId?._id || order.storeId)
      ) {
        const User = require("../models/User");
        const actor = await User.findById(req.user.id).select("storeId");
        if (
          String(actor?.storeId || "") !==
          String(order.storeId?._id || order.storeId)
        )
          return res.status(403).json({ message: "Forbidden" });
      }
      const invoiceNo = `INV-${String(order._id).slice(-8).toUpperCase()}`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${invoiceNo}.pdf`,
      );
      const doc = new PDFDocument({ margin: 46 });
      doc.pipe(res);
      doc
        .fontSize(22)
        .fillColor("#159b49")
        .text("SmartStore Invoice", { align: "center" });
      doc.moveDown().fontSize(10).fillColor("#334155");
      doc
        .text(`Invoice: ${invoiceNo}`)
        .text(`Order: #${String(order._id).slice(-6).toUpperCase()}`)
        .text(`Date: ${new Date(order.createdAt).toLocaleString("en-IN")}`)
        .text(`Store: ${order.storeId?.name || "SmartStore"}`)
        .text(
          `Customer: ${order.userId?.name || order.address?.name || "Customer"}`,
        )
        .text(
          `Payment: ${order.paymentMethod || "COD"} (${order.paymentStatus})`,
        );
      doc
        .moveDown()
        .fontSize(13)
        .fillColor("#0f172a")
        .text("Items", { underline: true })
        .moveDown(0.5);
      order.items.forEach((item, index) =>
        doc
          .fontSize(10)
          .text(
            `${index + 1}. ${item.name} - ${item.quantity} ${item.unit || "piece"} x INR ${Number(item.price).toFixed(2)} = INR ${(item.quantity * item.price).toFixed(2)}`,
          ),
      );
      doc
        .moveDown()
        .fontSize(10)
        .text(`Items total: INR ${Number(order.itemsTotal || 0).toFixed(2)}`, {
          align: "right",
        })
        .text(`Delivery: INR ${Number(order.deliveryCharge || 0).toFixed(2)}`, {
          align: "right",
        })
        .text(`GST: INR ${Number(order.gst || 0).toFixed(2)}`, {
          align: "right",
        });
      if (order.discount)
        doc.text(`Discount: - INR ${Number(order.discount).toFixed(2)}`, {
          align: "right",
        });
      doc
        .fontSize(14)
        .fillColor("#159b49")
        .text(`Grand Total: INR ${Number(order.totalAmount || 0).toFixed(2)}`, {
          align: "right",
        });
      if (order.cancellationReason)
        doc
          .moveDown()
          .fontSize(10)
          .fillColor("#dc2626")
          .text(`Cancelled: ${order.cancellationReason}`);
      doc.end();
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/store/:storeId",
  authMiddleware,
  allowRole(["admin", "staff", "super_admin"]),
  async (req, res, next) => {
    try {
      if (
        req.user.role !== "super_admin" &&
        String(req.user.storeId || "") !== req.params.storeId
      ) {
        const User = require("../models/User");
        const actor = await User.findById(req.user.id).select("storeId");
        if (String(actor?.storeId || "") !== req.params.storeId)
          return res.status(403).json({ message: "Forbidden" });
      }
      res.json(
        await Order.find({ storeId: req.params.storeId })
          .populate("userId", "name mobile email")
          .populate("deliveryPartnerId", "name phone vehicleType vehicleNumber")
          .sort({ createdAt: -1 }),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id/status",
  authMiddleware,
  allowRole(["admin", "staff", "super_admin"]),
  async (req, res, next) => {
    try {
      const nextStatus = typeof req.body.status === "string" ? req.body.status.trim() : "";
      if (!ORDER_STATUSES.includes(nextStatus))
        return res.status(400).json({ message: "Invalid status" });
      if (nextStatus === "Delivered") {
        return res.status(400).json({ message: "Delivery must be completed with OTP verification" });
      }
      if (req.user.role !== "super_admin" && !req.user.storeId)
        return res.status(403).json({ message: "No store is assigned to this account" });
      const scope = {
        _id: req.params.id,
        ...(req.user.role === "super_admin" ? {} : { storeId: req.user.storeId }),
      };
      const currentOrder = await Order.findOne(scope).select("status deliveryPartnerId paymentMethod paymentStatus");
      if (!currentOrder) return res.status(404).json({ message: "Order not found" });
      if (currentOrder.paymentMethod === "Razorpay" && currentOrder.paymentStatus !== "paid")
        return res.status(409).json({ message: "An online order can be processed only after payment is verified" });
      if (!canAdminTransition(currentOrder.status, nextStatus))
        return res.status(409).json({
          message: `Order cannot move from ${currentOrder.status} to ${nextStatus}`,
        });

      const update = { status: nextStatus };
      if (nextStatus === "Cancelled") {
        const rawReason = req.body.reason == null ? "Cancelled by store" : req.body.reason;
        if (typeof rawReason !== "string")
          return res.status(400).json({ message: "Cancellation reason must be text" });
        const cancellationReason = rawReason.trim();
        if (cancellationReason.length < 3)
          return res.status(400).json({ message: "Please provide a cancellation reason" });
        update.cancellationReason = cancellationReason.slice(0, 500);
        update.cancelledBy = req.user.role;
        update.cancelledAt = new Date();
      }
      const order = await Order.findOneAndUpdate({
        ...scope,
        status: currentOrder.status,
      }, update, {
        returnDocument: "after",
      }).populate("deliveryPartnerId", "name phone vehicleType");
      if (!order)
        return res.status(409).json({ message: "Order status changed. Refresh before updating it" });
      if (nextStatus === "Cancelled") {
        await restoreOrderStock(order);
        await order.save();
        if (currentOrder.deliveryPartnerId)
          await DeliveryPartner.findOneAndUpdate(
            { _id: currentOrder.deliveryPartnerId, currentOrderId: order._id },
            { $set: { isAvailable: true, currentOrderId: null, location: null } },
          );
      }
      await Promise.allSettled([createNotification({
        recipientType: "user",
        recipientId: order.userId,
        title: "Order status updated",
        message: `Your order is now ${order.status}.`,
        type: "status",
        orderId: order._id,
      })]);
      res.json({ success: true, order });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id/assign-delivery",
  authMiddleware,
  allowRole(["admin", "super_admin"]),
  async (req, res, next) => {
    try {
      if (req.user.role !== "super_admin" && !req.user.storeId)
        return res.status(403).json({ message: "No store is assigned to this account" });
      if (!mongoose.isValidObjectId(req.body.deliveryPartnerId))
        return res.status(400).json({ message: "Choose a valid delivery partner" });
      const currentOrder = await Order.findOne({
        _id: req.params.id,
        ...(req.user.role === "super_admin" ? {} : { storeId: req.user.storeId }),
      }).select("deliveryPartnerId status storeId paymentMethod paymentStatus");
      if (!currentOrder) return res.status(404).json({ message: "Order not found" });
      if (currentOrder.paymentMethod === "Razorpay" && currentOrder.paymentStatus !== "paid")
        return res.status(409).json({ message: "Delivery cannot be assigned until online payment is verified" });
      if (!["Placed", "Confirmed", "Preparing"].includes(currentOrder.status))
        return res.status(409).json({ message: `A delivery partner cannot be assigned while an order is ${currentOrder.status}` });

      const partner = await DeliveryPartner.findOneAndUpdate(
        {
          _id: req.body.deliveryPartnerId,
          isActive: true,
          $and: [
            { $or: [{ storeId: currentOrder.storeId }, { storeId: null }] },
            { $or: [{ isAvailable: true }, { currentOrderId: currentOrder._id }] },
          ],
        },
        { $set: { isAvailable: false, currentOrderId: currentOrder._id } },
        { returnDocument: "before" },
      );
      if (!partner)
        return res.status(400).json({ message: "Choose an active delivery partner available to this store" });

      const previousPartnerId = currentOrder.deliveryPartnerId;
      const newlyClaimed = String(partner.currentOrderId || "") !== String(currentOrder._id);
      const nextOrderStatus = currentOrder.status === "Placed" ? "Confirmed" : currentOrder.status;
      const order = await Order.findOneAndUpdate(
        {
          _id: req.params.id,
          status: currentOrder.status,
          deliveryPartnerId: previousPartnerId || null,
          ...(req.user.role === "super_admin" ? {} : { storeId: req.user.storeId }),
        },
        {
          $set: { deliveryPartnerId: req.body.deliveryPartnerId, status: nextOrderStatus },
          $unset: { deliveryPartnerLocation: 1 },
        },
        { returnDocument: "after" },
      ).populate("deliveryPartnerId", "name phone vehicleType vehicleNumber");
      if (!order) {
        if (newlyClaimed)
          await DeliveryPartner.findOneAndUpdate(
            { _id: partner._id, currentOrderId: currentOrder._id },
            { $set: { isAvailable: true, currentOrderId: null } },
          );
        return res.status(409).json({ message: "Order changed. Refresh before assigning delivery" });
      }
      if (previousPartnerId && String(previousPartnerId) !== String(partner._id))
        await DeliveryPartner.findOneAndUpdate(
          { _id: previousPartnerId, currentOrderId: currentOrder._id },
          { $set: { isAvailable: true, currentOrderId: null, location: null } },
        );
      await Promise.allSettled([
        createNotification({
          recipientType: "delivery",
          recipientId: req.body.deliveryPartnerId,
          title: "Delivery assigned",
          message: `Order #${String(order._id).slice(-6)} is ready for you.`,
          type: "order",
          orderId: order._id,
        }),
        createNotification({
          recipientType: "user",
          recipientId: order.userId,
          title: "Delivery partner assigned",
          message: `${order.deliveryPartnerId?.name || "A delivery partner"} will deliver your order.`,
          type: "status",
          orderId: order._id,
        }),
      ]);
      res.json({ success: true, order });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
