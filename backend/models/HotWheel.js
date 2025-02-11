const mongoose = require("mongoose");

const hotWheelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  imageUrl: { type: String },
  year: { type: Number },
});

module.exports = mongoose.model("HotWheel", hotWheelSchema);
