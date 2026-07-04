const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [
    {
      productId: String,
      name: String,
      price: Number,
      quantity: Number
    }
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
    default: "COD"
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
    enum: ["Placed", "Confirmed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"]
  }
}, { timestamps: true });

module.exports = mongoose.model("Order", OrderSchema);
