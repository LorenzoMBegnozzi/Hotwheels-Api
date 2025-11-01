const express = require("express");
const HotWheel = require("../models/HotWheel");

const router = express.Router();

// Rota para listar todos os Hot Wheels
router.get("/", async (req, res) => {
  try {
    const hotwheels = await HotWheel.find();
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
    const filter = name && name.trim() !== ''
      ? { name: new RegExp(name.trim(), "i") }
      : {};

    const hotwheels = await HotWheel.find(filter);
    res.json(hotwheels);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar Hot Wheels" });
  }
});

router.post("/add", async (req, res) => {
  try {
    const { name, imageUrl, year } = req.body;

    // Verifica se o Hot Wheel já existe pelo nome
    const existingHotWheel = await HotWheel.findOne({ name });
    if (existingHotWheel) {
      return res.status(400).json({ message: "Este Hot Wheel já existe!" });
    }

    // Criar um novo Hot Wheel
    const newHotWheel = new HotWheel({ name, imageUrl, year });
    await newHotWheel.save();

    res.status(201).json({ message: "Hot Wheel criado!", hotWheel: newHotWheel });
  } catch (err) {
    res.status(500).json({ message: "Erro ao criar Hot Wheel", error: err.message });
  }
});


module.exports = router;
