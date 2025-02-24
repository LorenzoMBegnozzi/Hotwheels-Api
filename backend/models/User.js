// Atualização do modelo User para incluir a foto do perfil
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: "" },
  collection: [{ type: mongoose.Schema.Types.ObjectId, ref: "HotWheel" }],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "HotWheel" }],
});

module.exports = mongoose.model("User", userSchema);