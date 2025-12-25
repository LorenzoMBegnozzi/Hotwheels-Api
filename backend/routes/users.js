const express = require("express");
const router = express.Router();
const User = require("../models/User");
const UserCollection = require("../models/UserCollection");
const mongoose = require("mongoose");

// Lista de avatares permitidos (8 opções + padrão)
const ALLOWED_AVATARS = [
  "/default-user.png",
  "/avatars/avatar1.svg",
  "/avatars/avatar2.svg",
  "/avatars/avatar3.svg",
  "/avatars/avatar4.svg",
  "/avatars/avatar5.svg",
  "/avatars/avatar6.svg",
  "/avatars/avatar7.svg",
  "/avatars/avatar8.svg",
];

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
      friendRequests: (user.friendRequests || []).map((f) => String(f)),
      friends: (user.friends || []).map((f) => String(f)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar usuário" });
  }
});

module.exports = router;
// Atualizar avatar do usuário
router.put('/:id/avatar', async (req, res) => {
  try {
    const { id } = req.params;
    const { profilePicture } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de usuário inválido' });
    }

    if (!ALLOWED_AVATARS.includes(profilePicture)) {
      return res.status(400).json({ message: 'Avatar não permitido' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { profilePicture },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      profilePicture: user.profilePicture,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar avatar' });
  }
});
