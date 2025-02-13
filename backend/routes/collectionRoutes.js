const express = require("express");
const mongoose = require("mongoose");
const UserCollection = require("../models/UserCollection");
const authMiddleware = require("../middlewares/auth");
const router = express.Router();

// Adicionar um Hot Wheel à coleção do usuário
router.post("/add", authMiddleware, async (req, res) => {
  console.log("Payload recebido no backend:", req.body);
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

    if (!userCollection.collection.includes(hotWheelId)) {
      userCollection.collection.push(hotWheelId);
      await userCollection.save();
    }

    res.status(200).json({ message: "Adicionado à coleção!", collection: userCollection.collection });
  } catch (error) {
    console.error("Erro ao adicionar à coleção:", error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

const removeFromCollection = async (carId) => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  if (!token || !userId) {
    alert("Usuário não autenticado!");
    return;
  }

  if (!carId || carId.length !== 24 || userId.length !== 24) {
    alert("ID inválido");
    return;
  }

  try {
    const response = await axios.delete(
      `http://localhost:5000/api/collection/${userId}/${carId}`,
      { headers: { "x-auth-token": token } }
    );

    if (response.status === 200) {
      setCollection((prevCollection) =>
        prevCollection.filter((car) => car._id !== carId)
      );
      console.log("Coleção atualizada:", collection); 
    } else {
      alert("Erro ao remover o item.");
    }
  } catch (error) {
    console.error("Erro ao remover item:", error);
    alert("Erro ao remover o item. Tente novamente.");
  }
};

router.delete("/:userId/:carId", authMiddleware, async (req, res) => {
  try {
    const { userId, carId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(carId)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    let userCollection = await UserCollection.findOne({ userId });

    if (!userCollection) {
      return res.status(404).json({ message: "Coleção não encontrada" });
    }

    // Remove o carro da coleção
    userCollection.collection = userCollection.collection.filter((id) => id.toString() !== carId);

    await userCollection.save();

    res.status(200).json({ message: "Removido da coleção!", collection: userCollection.collection });
  } catch (error) {
    console.error("Erro ao remover da coleção:", error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

// Obter a coleção do usuário
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: "ID inválido" });
    }

    let userCollection = await UserCollection.findOne({ userId }).populate("collection");

    if (!userCollection) {
      return res.status(404).json({ message: "Coleção não encontrada" });
    }

    res.json({ collection: userCollection.collection });
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar coleção", error });
  }
});

module.exports = router;
