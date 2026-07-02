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
    default: "COD"
  },
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
  totalAmount: Number,
  status: {
    type: String,
    default: "Placed",
    enum: ["Placed", "Confirmed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"]
  }
}, { timestamps: true });

module.exports = mongoose.model("Order", OrderSchema);