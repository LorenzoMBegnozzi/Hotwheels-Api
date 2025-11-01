const mongoose = require("mongoose");

const HotWheelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lowercaseName: { type: String, required: true, unique: true },
  year: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  images: { type: [String], default: [] }
});

HotWheelSchema.pre("save", function (next) {
  this.lowercaseName = this.name.toLowerCase();
  if (this.imageUrl && (!this.images || this.images.length === 0)) {
    this.images = [this.imageUrl];
  }
  if (!this.imageUrl && this.images && this.images.length > 0) {
    this.imageUrl = this.images[0];
  }
  next();
});

const HotWheel = mongoose.model("HotWheel", HotWheelSchema);
module.exports = HotWheel;
