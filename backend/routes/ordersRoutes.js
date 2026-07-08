const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const PDFDocument = require("pdfkit");
const Order = require("../models/Order");
const Product = require("../models/Product");
const DeliveryPartner = require("../models/DeliveryPartner");
const { sendOtpEmail } = require("../utils/emailService");
const authMiddleware = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const {
  createNotification,
  notifyAdmins,
  notifyStore,
} = require("../utils/inAppNotifications");

const router = express.Router();
const ORDER_STATUSES = [
  "Placed",
  "Confirmed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

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
  if (!Array.isArray(body.items) || !body.items.length)
    throw Object.assign(new Error("Order items are required"), {
      statusCode: 400,
    });
  if (!body.address?.street || !body.address?.city)
    throw Object.assign(new Error("A complete delivery address is required"), {
      statusCode: 400,
    });
  const ids = body.items
    .map((item) => item.productId)
    .filter(mongoose.isValidObjectId);
  const products = await Product.find({ _id: { $in: ids }, is_active: 1 });
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
  if (body.storeId && String(body.storeId) !== resolvedStoreId)
    throw Object.assign(
      new Error("Cart store does not match the selected products"),
      { statusCode: 400 },
    );
  const productMap = new Map(
    products.map((product) => [String(product._id), product]),
  );
  const items = body.items.map((item) => {
    const product = productMap.get(String(item.productId));
    const quantity = Number(item.quantity);
    if (
      !product ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > product.stock
    ) {
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
  const couponCode = String(body.couponCode || "")
    .trim()
    .toUpperCase();
  const discount =
    couponCode === "TRY50" && itemsTotal >= 99
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
    totalAmount: Number(
      (itemsTotal + deliveryCharge + gst - discount).toFixed(2),
    ),
    customerLocation: body.customerLocation,
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
  await Promise.all(
    order.items.map((item) =>
      Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      }),
    ),
  );
  order.stockReserved = false;
}

async function orderCreatedNotifications(order) {
  await Promise.all([
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
}

router.post(
  "/place",
  authMiddleware,
  allowRole(["user"]),
  async (req, res, next) => {
    try {
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
        order.paymentStatus = "failed";
        order.paymentFailureReason = "Signature verification failed";
        await order.save();
        return res
          .status(400)
          .json({ message: "Payment signature verification failed" });
      }
      order.paymentStatus = "paid";
      order.razorpayPaymentId = razorpay_payment_id;
      order.paymentFailureReason = null;
      await order.save();
      await Promise.all([
        orderCreatedNotifications(order),
        createNotification({
          recipientType: "user",
          recipientId: order.userId,
          title: "Payment successful",
          message: `Payment of ₹${order.totalAmount.toFixed(2)} was verified.`,
          type: "payment",
          orderId: order._id,
        }),
      ]);
      res.json({ success: true, order });
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
    if (req.user.role === "user" && req.user.id !== req.params.userId)
      return res.status(403).json({ message: "Forbidden" });
    res.json(
      await Order.find({ userId: req.params.userId })
        .populate("deliveryPartnerId", "name phone vehicleType")
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
      const order = await Order.findOne({
        _id: req.params.id,
        userId: req.user.id,
      });
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.status === "Cancelled")
        return res.json({ success: true, order });
      if (!["Placed", "Confirmed"].includes(order.status)) {
        return res.status(400).json({
          message:
            "This order can no longer be cancelled because preparation or delivery has started",
        });
      }
      if (
        order.paymentMethod === "Razorpay" &&
        order.paymentStatus === "paid"
      ) {
        return res.status(400).json({
          message:
            "Paid online orders require refund assistance. Please contact support.",
        });
      }
      const cancellationReason = String(req.body.reason || "").trim();
      if (cancellationReason.length < 3)
        return res
          .status(400)
          .json({ message: "Please provide a cancellation reason" });
      order.status = "Cancelled";
      order.cancellationReason = cancellationReason.slice(0, 500);
      order.cancelledBy = "user";
      order.cancelledAt = new Date();
      if (order.paymentStatus === "pending") order.paymentStatus = "cancelled";
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
      if (order.status === "Delivered") {
        return res.status(400).json({ success: false, message: "Order is already delivered" });
      }

      const customerEmail = order.userId?.email;
      if (!customerEmail) {
        return res.status(400).json({ success: false, message: "Customer email is not available for this order" });
      }

      const otp = crypto.randomInt(100000, 1000000).toString();
      order.deliveryOtpHash = hashDeliveryOtp(otp);
      order.deliveryOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      order.deliveryOtpVerifiedAt = null;
      order.deliveryOtpUsed = false;
      await order.save();

      try {
        await sendOtpEmail({ email: customerEmail, otp, purpose: "delivery-verification" });
      } catch (error) {
        order.deliveryOtpHash = null;
        order.deliveryOtpExpiresAt = null;
        order.deliveryOtpVerifiedAt = null;
        order.deliveryOtpUsed = false;
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
      if (order.status === "Delivered") {
        return res.status(400).json({ success: false, message: "Order is already delivered" });
      }
      if (!order.deliveryOtpHash || !order.deliveryOtpExpiresAt) {
        return res.status(400).json({ success: false, message: "Delivery OTP was not requested" });
      }
      if (order.deliveryOtpUsed || order.deliveryOtpVerifiedAt) {
        return res.status(400).json({ success: false, message: "Delivery OTP is already used" });
      }
      if (order.deliveryOtpExpiresAt.getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: "Delivery OTP has expired" });
      }

      const suppliedHash = Buffer.from(hashDeliveryOtp(otp), "hex");
      const storedHash = Buffer.from(order.deliveryOtpHash, "hex");
      if (suppliedHash.length !== storedHash.length || !crypto.timingSafeEqual(suppliedHash, storedHash)) {
        return res.status(400).json({ success: false, message: "Invalid delivery OTP" });
      }

      order.deliveryOtpUsed = true;
      order.deliveryOtpVerifiedAt = new Date();
      order.status = "Delivered";
      order.deliveredAt = new Date();
      await order.save();

      await Promise.all([
        DeliveryPartner.findByIdAndUpdate(req.user.id, {
          isAvailable: true,
          currentOrderId: null,
          location: null,
        }),
        createNotification({
          recipientType: "user",
          recipientId: order.userId,
          title: "Delivery completed",
          message: "Your order was delivered successfully.",
          type: "status",
          orderId: order._id,
        }),
      ]);

      const safeOrder = await Order.findById(order._id).populate("deliveryPartnerId", "name phone vehicleType");
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
      if (!ORDER_STATUSES.includes(req.body.status))
        return res.status(400).json({ message: "Invalid status" });
      const update = { status: req.body.status };
      if (req.body.status === "Cancelled") {
        update.cancellationReason = String(
          req.body.reason || "Cancelled by store",
        ).slice(0, 500);
        update.cancelledBy = req.user.role;
        update.cancelledAt = new Date();
      }
      const order = await Order.findByIdAndUpdate(req.params.id, update, {
        returnDocument: "after",
      }).populate("deliveryPartnerId", "name phone vehicleType");
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (req.body.status === "Cancelled") {
        await restoreOrderStock(order);
        await order.save();
      }
      await createNotification({
        recipientType: "user",
        recipientId: order.userId,
        title: "Order status updated",
        message: `Your order is now ${order.status}.`,
        type: "status",
        orderId: order._id,
      });
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
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { deliveryPartnerId: req.body.deliveryPartnerId, status: "Confirmed" },
        { returnDocument: "after" },
      ).populate("deliveryPartnerId", "name phone vehicleType");
      if (!order) return res.status(404).json({ message: "Order not found" });
      await DeliveryPartner.findByIdAndUpdate(req.body.deliveryPartnerId, {
        isAvailable: false,
        currentOrderId: req.params.id,
      });
      await Promise.all([
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
