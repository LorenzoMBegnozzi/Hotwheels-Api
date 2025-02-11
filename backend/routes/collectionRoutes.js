const express = require("express");
const mongoose = require("mongoose");
const UserCollection = require("../models/UserCollection");
const HotWheel = require("../models/HotWheel");
const User = require("../models/User");
const authMiddleware = require("../middlewares/auth");

const router = express.Router();

// Adicionar um Hot Wheel à coleção do usuário
router.post("/add", authMiddleware, async (req, res) => {
  console.log("Payload recebido no backend:", req.body);
  const { hotWheelId } = req.body;
  const userId = req.user.id; // Obtendo do token

  if (!hotWheelId) {
    return res.status(400).json({ message: "ID do Hot Wheel ausente" });
  }

  try {
    let userCollection = await UserCollection.findOne({ userId });
    if (!userCollection) {
      userCollection = new UserCollection({ userId, collection: [], favorites: [] });
    }

    if (!userCollection.collection.includes(hotWheelId)) {
      userCollection.collection.push(hotWheelId);
      await userCollection.save();
    }

    res.status(200).json({ message: "Adicionado à coleção!", userCollection });
  } catch (error) {
    console.error("Erro ao adicionar à coleção:", error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

// Remover um Hot Wheel da coleção
router.post("/remove", authMiddleware, async (req, res) => {
  try {
    const { hotWheelId } = req.body;
    const userId = req.user.id;

    let userCollection = await UserCollection.findOne({ userId });
    if (!userCollection) {
      return res.status(400).json({ message: "Coleção não encontrada" });
    }

    userCollection.collection = userCollection.collection.filter(id => id.toString() !== hotWheelId);
    await userCollection.save();

    res.json({ message: "Hot Wheel removido da coleção!" });
  } catch (err) {
    res.status(500).json({ message: "Erro ao remover da coleção" });
  }
});

// Adicionar um Hot Wheel aos favoritos
router.post("/favorite", authMiddleware, async (req, res) => {
  try {
    const { hotWheelId } = req.body;
    const userId = req.user.id;

    let userCollection = await UserCollection.findOne({ userId });
    if (!userCollection) {
      userCollection = new UserCollection({ userId, collection: [], favorites: [] });
    }

    if (!userCollection.favorites.includes(hotWheelId)) {
      userCollection.favorites.push(hotWheelId);
      await userCollection.save();
    }

    res.json({ message: "Hot Wheel adicionado aos favoritos!" });
  } catch (err) {
    res.status(500).json({ message: "Erro ao adicionar aos favoritos" });
  }
});

// Obter a coleção e favoritos do usuário (Corrigido para GET)
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("Buscando coleção para o usuário:", userId);

    const userCollection = await UserCollection.findOne({ userId }).populate("collection favorites");

    if (!userCollection) {
      return res.status(404).json({ message: "Coleção não encontrada" });
    }

    res.json(userCollection);
  } catch (err) {
    console.error("Erro ao buscar coleção:", err);
    res.status(500).json({ message: "Erro ao buscar coleção", error: err.message });
  }
});

// Obter a coleção do usuário
router.get("/collection/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).populate("collection"); // Certifique-se de que a coleção está populada

    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    res.json(user.collection);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar coleção", error });
  }
});


module.exports = router;
