const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  collection: [{ type: mongoose.Schema.Types.ObjectId, ref: "HotWheel" }],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "HotWheel" }],
});

module.exports = mongoose.model("User", userSchema);
