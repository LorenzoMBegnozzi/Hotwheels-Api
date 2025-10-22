const mongoose = require("mongoose");

const RecognizerImageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  filePath: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("RecognizerImage", RecognizerImageSchema);
