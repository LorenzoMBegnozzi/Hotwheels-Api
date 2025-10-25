const express = require("express");
const router = express.Router();
const User = require("../models/User");
const UserCollection = require("../models/UserCollection");
const mongoose = require("mongoose");

// Buscar usuários por nome (deve vir ANTES da rota /:id)
router.get("/search", async (req, res) => {
  try {
    const { name } = req.query;
    const users = await User.find({ name: { $regex: name, $options: "i" } });

    const usersWithCollections = await Promise.all(
      users.map(async (u) => {
        const userCollection = await UserCollection.findOne({ userId: u._id });
        return {
          _id: u._id,
          name: u.name,
          profilePicture: u.profilePicture,
          collection: userCollection?.collection || [],
          favorites: userCollection?.favorites || [],
        };
      })
    );

    res.json(usersWithCollections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar usuários" });
  }
});

// Buscar usuário por ID (deve vir DEPOIS da rota /search)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validar se o ID é um ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de usuário inválido" });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const userCollection = await UserCollection.findOne({ userId: id });

    res.json({
      _id: user._id,
      name: user.name,
      profilePicture: user.profilePicture,
      collection: userCollection?.collection || [],
      favorites: userCollection?.favorites || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar usuário" });
  }
});

module.exports = router;
