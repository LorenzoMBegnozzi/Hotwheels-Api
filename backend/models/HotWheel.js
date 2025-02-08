const mongoose = require("mongoose");

const HotWheelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  imageUrl: { type: String, required: true },
  year: { type: Number, required: true },
});

module.exports = mongoose.model("HotWheel", HotWheelSchema);
