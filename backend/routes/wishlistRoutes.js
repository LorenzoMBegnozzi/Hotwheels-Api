const express = require("express");
const authMiddleware = require("../middlewares/auth");
const UserCollection = require("../models/UserCollection");
const router = express.Router();
const mongoose = require("mongoose");

// Buscar wishlist de um usuário específico (sem autenticação necessária)
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("🔍 Buscando wishlist para usuário:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("❌ ID do usuário inválido:", userId);
      return res.status(400).json({ msg: "ID inválido" });
    }

    let userCollection = await UserCollection.findOne({ userId }).populate({
      path: "favorites",
      model: "HotWheel",
    });

    if (!userCollection) {
      console.warn("⚠️ Nenhuma coleção encontrada para o usuário:", userId);
      return res.status(200).json({ favorites: [] });
    }

    console.log("✅ Enviando favoritos:", userCollection.favorites);
    res.status(200).json({ favorites: userCollection.favorites || [] });
  } catch (error) {
    console.error("❌ Erro ao buscar wishlist:", error);
    res.status(500).json({ message: "Erro no servidor." });
  }
});

// Adicionar um Hot Wheel à lista de desejos (favoritos) do usuário
router.post("/", authMiddleware, async (req, res) => {
  const { hotWheelId } = req.body;
  const userId = req.user.id;

  console.log("Recebendo requisição para adicionar à wishlist:", { userId, hotWheelId });

  if (!hotWheelId || !mongoose.Types.ObjectId.isValid(hotWheelId)) {
    return res.status(400).json({ message: "ID do Hot Wheel inválido" });
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

router.delete("/:carId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const carId = req.params.carId;
    console.log("🗑️ Removendo carro:", carId, "da wishlist do usuário:", userId);

    let userCollection = await UserCollection.findOne({ userId });

    if (!userCollection) {
      return res.status(404).json({ message: "Lista de desejos não encontrada." });
    }

    // Convertendo ObjectIds para string antes do filter
    userCollection.favorites = userCollection.favorites.filter(
      (car) => car.toString() !== carId.toString()
    );

    await userCollection.save();

    console.log("✅ Novo estado da wishlist:", userCollection.favorites);
    res.status(200).json({ message: "Item removido com sucesso.", favorites: userCollection.favorites });
  } catch (error) {
    console.error("❌ Erro ao remover item da wishlist:", error);
    res.status(500).json({ message: "Erro no servidor." });
  }
});


router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("🔍 Buscando wishlist para usuário:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("❌ ID do usuário inválido:", userId);
      return res.status(400).json({ msg: "ID inválido" });
    }

    let userCollection = await UserCollection.findOne({ userId }).populate({
      path: "favorites",
      model: "HotWheel",
    });

    if (!userCollection) {
      console.warn("⚠️ Nenhuma coleção encontrada para o usuário:", userId);
      return res.status(404).json({ message: "Lista de desejos não encontrada." });
    }

    console.log("✅ Enviando favoritos:", userCollection.favorites);
    res.status(200).json({ favorites: userCollection.favorites || [] });
  } catch (error) {
    console.error("❌ Erro ao buscar wishlist:", error);
    res.status(500).json({ message: "Erro no servidor." });
  }
});


module.exports = router;