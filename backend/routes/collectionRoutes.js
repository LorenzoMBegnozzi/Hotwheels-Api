const express = require("express");
const UserCollection = require("../models/UserCollection");
const HotWheel = require("../models/HotWheel");
const { verifyToken } = require("../middlewares/auth");

const router = express.Router();

// Adicionar um Hot Wheel à coleção do usuário
router.post("/add", verifyToken, async (req, res) => {
  try {
    const { userId, hotWheelId } = req.body;

    let userCollection = await UserCollection.findOne({ userId });
    if (!userCollection) {
      userCollection = new UserCollection({ userId, collection: [], favorites: [] });
    }

    if (!userCollection.collection.includes(hotWheelId)) {
      userCollection.collection.push(hotWheelId);
      await userCollection.save();
    }

    res.json({ message: "Hot Wheel adicionado à coleção!" });
  } catch (err) {
    res.status(500).json({ message: "Erro ao adicionar à coleção" });
  }
});

// Remover um Hot Wheel da coleção
router.post("/remove", verifyToken, async (req, res) => {
  try {
    const { userId, hotWheelId } = req.body;

    let userCollection = await UserCollection.findOne({ userId });
    if (!userCollection) return res.status(400).json({ message: "Coleção não encontrada" });

    userCollection.collection = userCollection.collection.filter(id => id.toString() !== hotWheelId);
    await userCollection.save();

    res.json({ message: "Hot Wheel removido da coleção!" });
  } catch (err) {
    res.status(500).json({ message: "Erro ao remover da coleção" });
  }
});

// Adicionar um Hot Wheel aos favoritos
router.post("/favorite", verifyToken, async (req, res) => {
  try {
    const { userId, hotWheelId } = req.body;

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

const mongoose = require("mongoose");

router.get("/:userId", verifyToken, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.userId);

    const userCollection = await UserCollection.findOne({ userId })
      .populate("collection favorites");

    if (!userCollection) return res.json({ collection: [], favorites: [] });

    res.json(userCollection);
  } catch (err) {
    console.error("Erro ao buscar coleção:", err);
    res.status(500).json({ message: "Erro ao buscar coleção", error: err.message });
  }
});

module.exports = router;
