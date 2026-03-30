const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePicture: { type: String, default: "/default-user.png" },
    collection: [{ type: mongoose.Schema.Types.ObjectId, ref: "HotWheel" }],
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "HotWheel" }],

    // Social
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],

    // Atividade
    lastSeen: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);