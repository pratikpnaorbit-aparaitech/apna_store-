const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 120 },
  category: {
    type: String,
    enum: ["order", "payment", "refund", "delivery", "account", "other"],
    default: "other",
  },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  orderNumber: { type: String, trim: true, maxlength: 80, default: "" },
  status: {
    type: String,
    enum: ["open", "in_progress", "resolved", "closed"],
    default: "open",
    index: true,
  },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  adminReply: { type: String, trim: true, maxlength: 2000, default: "" },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
