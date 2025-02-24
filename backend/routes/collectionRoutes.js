const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const UserCollection = require("../models/UserCollection");
const HotWheel = require("../models/HotWheel");
const authMiddleware = require("../middlewares/auth");
const router = express.Router();

// Configuração do Multer para upload de imagens
const storage = multer.memoryStorage();
const upload = multer({ storage });

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

    // Popula os dados do HotWheel para retornar com detalhes
    await userCollection.populate("collection");

    res.status(200).json({ message: "Adicionado à coleção!", collection: userCollection.collection });
  } catch (error) {
    console.error("Erro ao adicionar à coleção:", error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

// Remover um Hot Wheel da coleção do usuário
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

// Buscar coleção do usuário
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

    console.log("Dados enviados para o frontend:", userCollection.collection);

    res.json({ collection: userCollection.collection });
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar coleção", error });
  }
});

router.post("/add-custom", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const { name, year } = req.body;
    const userId = req.user.id; // Obtendo ID do usuário autenticado
    const imageUrl = req.file ? `data:image/png;base64,${req.file.buffer.toString("base64")}` : null; 

    if (!name || !year || !imageUrl) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios!" });
    }

    const lowercaseName = name.toLowerCase();

    // Criando um novo Hot Wheel
    const newHotWheel = new HotWheel({ name, lowercaseName, year, imageUrl });
    await newHotWheel.save();

    // Buscando a coleção do usuário
    let userCollection = await UserCollection.findOne({ userId });

    if (!userCollection) {
      userCollection = new UserCollection({ userId, collection: [], favorites: [] });
    }

    // Adicionando o carro na coleção do usuário
    userCollection.collection.push(newHotWheel._id);
    await userCollection.save();

    res.status(201).json({ message: "Hot Wheel adicionado com sucesso!", car: newHotWheel });
  } catch (error) {
    console.error("Erro ao adicionar Hot Wheel personalizado:", error);
    res.status(500).json({ message: "Erro interno no servidor", error });
  }
});


module.exports = router;
