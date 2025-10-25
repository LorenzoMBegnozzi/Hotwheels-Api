const mongoose = require("mongoose");

const RecognizerImageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  filePath: { type: String, required: false, default: 'memory' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("RecognizerImage", RecognizerImageSchema);
