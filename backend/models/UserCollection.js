const mongoose = require("mongoose");

const UserCollectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  collection: [{ type: mongoose.Schema.Types.ObjectId, ref: "HotWheel" }],
  // favorites agora armazena subdocumentos para manter prioridade por favorito
  favorites: [
    {
      hotWheel: { type: mongoose.Schema.Types.ObjectId, ref: "HotWheel", required: true },
      priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
      createdAt: { type: Date, default: Date.now }
    }
  ],
});

module.exports = mongoose.model("UserCollection", UserCollectionSchema);
