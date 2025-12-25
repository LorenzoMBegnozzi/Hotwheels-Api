const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: "/default-user.png" },
  collection: [{ type: mongoose.Schema.Types.ObjectId, ref: "HotWheel" }],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "HotWheel" }],
  // friendRequests: array of userIds who requested friendship (incoming requests)
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // friends: array of userIds who are accepted friends
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

module.exports = mongoose.model("User", userSchema);