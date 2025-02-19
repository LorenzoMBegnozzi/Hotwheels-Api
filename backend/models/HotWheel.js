const mongoose = require("mongoose");

const HotWheelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lowercaseName: { type: String, required: true, unique: true }, 
  year: { type: Number, required: true },
  imageUrl: { type: String, required: true }
});

// Antes de salvar, garante que o nome seja salvo em minúsculas
HotWheelSchema.pre("save", function (next) {
  this.lowercaseName = this.name.toLowerCase();
  next();
});

const HotWheel = mongoose.model("HotWheel", HotWheelSchema);
module.exports = HotWheel;
