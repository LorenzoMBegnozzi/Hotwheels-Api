const express = require("express");
const authMiddleware = require("../middlewares/auth");
const UserCollection = require("../models/UserCollection");
const router = express.Router();

// Adicionar um Hot Wheel à lista de desejos (favoritos) do usuário
router.post("/", authMiddleware, async (req, res) => {
  const { hotWheelId } = req.body;
  const userId = req.user.id;

  if (!hotWheelId) {
    return res.status(400).json({ message: "ID do Hot Wheel ausente" });
  }

  try {
    let userCollection = await UserCollection.findOne({ userId });

    if (!userCollection) {
      userCollection = new UserCollection({ userId, collection: [], favorites: [] });
    }

    if (!userCollection.favorites.includes(hotWheelId)) {
      userCollection.favorites.push(hotWheelId);
      await userCollection.save();
    }

    res.status(200).json({ message: "Adicionado à lista de desejos!", favorites: userCollection.favorites });
  } catch (error) {
    console.error("Erro ao adicionar à lista de desejos:", error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

module.exports = router;
