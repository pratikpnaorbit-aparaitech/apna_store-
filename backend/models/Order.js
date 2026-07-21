const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        productId: String,
        name: String,
        price: Number,
        quantity: Number,
        unit: { type: String, default: "piece" },
      },
    ],
    address: {
      name: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "Razorpay"],
      default: "COD",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },
    razorpayOrderId: { type: String, default: null, index: true },
    razorpayPaymentId: { type: String, default: null },
    paymentFailureReason: { type: String, default: null },
    deliveryPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPartner",
      default: null,
    },
    deliveryPartnerLocation: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
      updatedAt: { type: Date },
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null,
    },
    itemsTotal: Number,
    deliveryCharge: Number,
    gst: Number,
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
    totalAmount: Number,
    customerLocation: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
    },
    status: {
      type: String,
      default: "Placed",
      enum: [
        "Placed",
        "Confirmed",
        "Preparing",
        "Picked Up",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ],
    },
    cancellationReason: { type: String, default: null, maxlength: 500 },
    cancelledBy: {
      type: String,
      enum: ["user", "admin", "staff", "super_admin", "system", null],
      default: null,
    },
    cancelledAt: { type: Date, default: null },
    stockReserved: { type: Boolean, default: false },
    deliveredAt: { type: Date, default: null },
    deliveryOtpHash: { type: String, default: null, select: false },
    deliveryOtpExpiresAt: { type: Date, default: null },
    deliveryOtpVerifiedAt: { type: Date, default: null },
    deliveryOtpUsed: { type: Boolean, default: false },
    deliveryOtpAttempts: { type: Number, default: 0, min: 0 },
    deliveryOtpLastSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", OrderSchema);
