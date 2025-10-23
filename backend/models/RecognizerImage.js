const mongoose = require("mongoose");

const RecognizerImageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // filePath previously required, now optional since images are not saved to disk
  filePath: { type: String, required: false, default: 'memory' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("RecognizerImage", RecognizerImageSchema);
