// models/HotWheel.js
const mongoose = require("mongoose");

const HotWheelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    lowercaseName: { type: String, required: true },
    year: { type: Number, required: true },

    imageUrl: { type: String, required: true },
    images: { type: [String], default: [] },

    // NOVO
    categories: { type: [String], default: [] }, // ex.: ["Pop Culture", "Modelos Premium"]
    primaryCategory: { type: String, default: null }, // a categoria “origem” do scrape

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isPublic: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// índice único composto
HotWheelSchema.index({ lowercaseName: 1, year: 1 }, { unique: true });

HotWheelSchema.pre("save", function (next) {
  if (this.name) this.lowercaseName = this.name.toLowerCase();

  if (this.imageUrl && (!this.images || this.images.length === 0)) {
    this.images = [this.imageUrl];
  }
  if (!this.imageUrl && this.images && this.images.length > 0) {
    this.imageUrl = this.images[0];
  }
  next();
});

module.exports = mongoose.model("HotWheel", HotWheelSchema);
