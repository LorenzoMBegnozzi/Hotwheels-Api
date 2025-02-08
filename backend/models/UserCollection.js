const mongoose = require("mongoose");

const UserCollectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  collection: [{ type: mongoose.Schema.Types.ObjectId, ref: "HotWheel" }],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "HotWheel" }],
});

module.exports = mongoose.model("UserCollection", UserCollectionSchema);
