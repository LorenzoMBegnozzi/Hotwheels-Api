const express = require("express");
const HotWheel = require("../models/HotWheel");

const router = express.Router();

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function categorySynonyms(input) {
  if (!input) return [];
  const x = String(input).toLowerCase().trim();
  const jdmAliases = new Set([
    "japoneses / jdm",
    "japoneses/jdm",
    "japoneses",
    "jdm",
    "jdm (japoneses)",
  ]);
  if (jdmAliases.has(x)) {
    return [
      "Japoneses / JDM",
      "Japoneses",
      "JDM",
      "JDM (Japoneses)",
    ];
  }
  return [input];
}

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
    const { name, category } = req.query;

    // Se não for fornecido nome, retornar todos para facilitar UX.
    const baseFilter = { isPublic: true };
    let filter = { ...baseFilter };

    if (name && name.trim() !== "") {
      filter.name = new RegExp(name.trim(), "i");
    }

    if (category && category.trim() !== "") {
      const syns = categorySynonyms(category.trim());
      const or = [];
      syns.forEach((c) => {
        const rx = new RegExp(`^${escapeRegExp(c)}$`, "i");
        or.push({ categories: { $elemMatch: { $regex: rx } } });
        or.push({ primaryCategory: { $regex: rx } });
      });
      filter.$or = or;
    }

    const hotwheels = await HotWheel.find(filter);
    res.json(hotwheels);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar Hot Wheels" });
  }
});

// Lista distintas categorias existentes no banco (categories e primaryCategory)
router.get("/categories", async (req, res) => {
  try {
    const [catsFromArray, catsFromPrimary] = await Promise.all([
      HotWheel.distinct("categories", { isPublic: true }),
      HotWheel.distinct("primaryCategory", { isPublic: true })
    ]);

    const set = new Set();
    catsFromArray.forEach((c) => c && set.add(c));
    catsFromPrimary.forEach((c) => c && set.add(c));

    const categories = Array.from(set).sort((a, b) => a.localeCompare(b));
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ message: "Erro ao listar categorias" });
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
