const mongoose = require("mongoose");

const verificationCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    code: { type: String, required: true },
    type: { type: String, enum: ["signup", "reset"], required: true },
    expiresAt: { type: Date, required: true },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

verificationCodeSchema.index({ email: 1, type: 1, consumed: 1 });

module.exports = mongoose.model("VerificationCode", verificationCodeSchema);
