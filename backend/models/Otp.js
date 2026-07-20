const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: {
      type: String,
      enum: ["registration", "password-reset"],
      required: true,
    },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    lastSentAt: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
    registrationData: {
      name: { type: String, trim: true },
      mobile: { type: String, trim: true },
      passwordHash: { type: String, select: false },
    },
  },
  { timestamps: true }
);

otpSchema.index(
  { email: 1, purpose: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string" } },
  }
);

module.exports = mongoose.model("Otp", otpSchema);
