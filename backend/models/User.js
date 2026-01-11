const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: "/default-user.png" },
  collection: [{ type: mongoose.Schema.Types.ObjectId, ref: "HotWheel" }],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "HotWheel" }],

  // Assinatura / Plano
  subscriptionPlan: {
    type: String,
    enum: ["FREE", "PLAN_990", "PLAN_1490", "PLAN_1990"],
    default: "FREE",
  },
  subscriptionStatus: {
    type: String,
    enum: ["ACTIVE", "INACTIVE", "PENDING", "EXPIRED"],
    default: "ACTIVE",
  },
  subscriptionValidUntil: { type: Date, default: null },
  subscriptionProvider: { type: String, default: null },
  subscriptionLastBillingId: { type: String, default: null },

  // Social
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
});

module.exports = mongoose.model("User", userSchema);