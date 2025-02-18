const express = require("express");
const mongoose = require("mongoose");
const UserCollection = require("../models/UserCollection");
const authMiddleware = require("../middlewares/auth");
const router = express.Router();
const HotWheel = require("../models/HotWheel");


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
    Swal.fire("Erro!", "Usuário não autenticado!", "error");
    return;
  }

  try {
    const response = await axios.get(`http://localhost:5000/api/collection/${userId}`, {
      headers: { "x-auth-token": token },
    });

    if (response.status === 200) {
      setCollection((prevCollection) => prevCollection.filter((car) => car._id !== carId));
      Swal.fire("Sucesso!", "Item removido com sucesso!", "success");
    } else {
      Swal.fire("Erro!", "Erro ao remover o item!", "error");
    }
  } catch (error) {
    console.error("Erro ao remover item:", error);
    Swal.fire("Erro!", "Erro ao remover o item. Tente novamente.", "error");
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

router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: "ID inválido" });
    }

    let userCollection = await UserCollection.findOne({ userId }).populate({
      path: "collection",
      model: "HotWheel",
    });

    if (!userCollection) {
      return res.status(404).json({ message: "Coleção não encontrada" });
    }

    console.log("Dados enviados para o frontend:", userCollection.collection);

    res.json({ collection: userCollection.collection });
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar coleção", error });
  }
});


router.post("/add-custom", authMiddleware, async (req, res) => {
  const { name, year, imageUrl } = req.body;
  const userId = req.user.id;

  if (!name || !year || !imageUrl) {
    return res.status(400).json({ message: "Todos os campos são obrigatórios" });
  }

  try {
    let userCollection = await UserCollection.findOne({ userId });
    if (!userCollection) {
      userCollection = new UserCollection({ userId, collection: [], favorites: [] });
    }

    // Criar um novo documento no banco para o carro personalizado
    const newCar = await HotWheel.create({ name, year, imageUrl });

    userCollection.collection.push(newCar._id);
    await userCollection.save();

    res.status(200).json({ message: "Carro adicionado!", car: newCar });
  } catch (error) {
    console.error("Erro ao adicionar carro personalizado:", error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});


module.exports = router;
