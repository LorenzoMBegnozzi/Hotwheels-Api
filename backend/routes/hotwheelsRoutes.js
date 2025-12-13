const express = require("express");
const HotWheel = require("../models/HotWheel");

const router = express.Router();

// Rota para listar todos os Hot Wheels
router.get("/", async (req, res) => {
  try {
    const hotwheels = await HotWheel.find({ isPublic: true });
    res.json(hotwheels);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar Hot Wheels" });
  }
});

// Rota para buscar um Hot Wheel pelo nome
router.get("/search", async (req, res) => {
  try {
    const { name } = req.query;

    // Se não for fornecido nome, retornar todos para facilitar UX.
    const baseFilter = { isPublic: true };
    const filter = name && name.trim() !== ''
      ? { ...baseFilter, name: new RegExp(name.trim(), "i") }
      : baseFilter;

    const hotwheels = await HotWheel.find(filter);
    res.json(hotwheels);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar Hot Wheels" });
  }
});

router.post("/add", async (req, res) => {
  try {
    const { name, imageUrl, images, year } = req.body;

    // Verifica se o Hot Wheel já existe pelo nome
    const existingHotWheel = await HotWheel.findOne({ name });
    if (existingHotWheel) {
      return res.status(400).json({ message: "Este Hot Wheel já existe!" });
    }

    // Se não vier imageUrl mas vier lista de imagens, usa a primeira como principal
    let finalImageUrl = imageUrl;
    let finalImages = Array.isArray(images) ? images.filter(Boolean) : [];
    if (!finalImageUrl && finalImages.length > 0) {
      finalImageUrl = finalImages[0];
    }
    // Garante que imageUrl apareça também na lista, sem duplicar
    if (finalImageUrl) {
      if (!finalImages.includes(finalImageUrl)) finalImages.unshift(finalImageUrl);
    }

    // Criar um novo Hot Wheel com múltiplas imagens
    const newHotWheel = new HotWheel({ name, imageUrl: finalImageUrl, images: finalImages, year });
    await newHotWheel.save();

    res.status(201).json({ message: "Hot Wheel criado!", hotWheel: newHotWheel });
  } catch (err) {
    res.status(500).json({ message: "Erro ao criar Hot Wheel", error: err.message });
  }
});


module.exports = router;
