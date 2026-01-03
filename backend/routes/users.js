const express = require("express");
const router = express.Router();
const User = require("../models/User");
const UserCollection = require("../models/UserCollection");
const mongoose = require("mongoose");
const auth = require("../middlewares/auth");

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

// Contagens sociais do usuário autenticado
router.get("/me/social", auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select("followers following friends");
    if (!me) return res.status(404).json({ message: "Usuário não encontrado" });

    res.json({
      followersCount: Array.isArray(me.followers) ? me.followers.length : 0,
      followingCount: Array.isArray(me.following) ? me.following.length : 0,
      friendsCount: Array.isArray(me.friends) ? me.friends.length : 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar contagens sociais" });
  }
});

// Relacionamento entre usuário autenticado e um usuário alvo
router.get("/:id/relationship", auth, async (req, res) => {
  try {
    const { id: targetId } = req.params;
    const meId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ message: "ID de usuário inválido" });
    }
    if (String(meId) === String(targetId)) {
      return res.json({ isFollowing: false, isFollowedBy: false, isFriend: false });
    }

    const [me, target] = await Promise.all([
      User.findById(meId).select("followers following friends"),
      User.findById(targetId).select("followers following friends"),
    ]);
    if (!me || !target) return res.status(404).json({ message: "Usuário não encontrado" });

    const isFollowing = (me.following || []).some((u) => String(u) === String(targetId));
    const isFollowedBy = (me.followers || []).some((u) => String(u) === String(targetId));
    const isFriend = (me.friends || []).some((u) => String(u) === String(targetId));

    res.json({ isFollowing, isFollowedBy, isFriend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar relacionamento" });
  }
});

// Seguir usuário
router.post("/:id/follow", auth, async (req, res) => {
  try {
    const { id: targetId } = req.params;
    const meId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ message: "ID de usuário inválido" });
    }
    if (String(meId) === String(targetId)) {
      return res.status(400).json({ message: "Você não pode seguir a si mesmo" });
    }

    const [me, target] = await Promise.all([User.findById(meId), User.findById(targetId)]);
    if (!me || !target) return res.status(404).json({ message: "Usuário não encontrado" });

    me.following = me.following || [];
    target.followers = target.followers || [];
    me.friends = me.friends || [];
    target.friends = target.friends || [];

    const alreadyFollowing = me.following.some((u) => String(u) === String(targetId));
    if (!alreadyFollowing) me.following.push(targetId);

    const alreadyInFollowers = target.followers.some((u) => String(u) === String(meId));
    if (!alreadyInFollowers) target.followers.push(meId);

    // Se o outro usuário já me segue, viramos amigos
    const targetFollowsMe = (target.following || []).some((u) => String(u) === String(meId));
    if (targetFollowsMe) {
      if (!me.friends.some((u) => String(u) === String(targetId))) me.friends.push(targetId);
      if (!target.friends.some((u) => String(u) === String(meId))) target.friends.push(meId);
    }

    await Promise.all([me.save(), target.save()]);

    res.json({
      isFollowing: true,
      isFriend: (me.friends || []).some((u) => String(u) === String(targetId)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao seguir usuário" });
  }
});

// Parar de seguir usuário
router.delete("/:id/follow", auth, async (req, res) => {
  try {
    const { id: targetId } = req.params;
    const meId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ message: "ID de usuário inválido" });
    }
    if (String(meId) === String(targetId)) {
      return res.status(400).json({ message: "Operação inválida" });
    }

    const [me, target] = await Promise.all([User.findById(meId), User.findById(targetId)]);
    if (!me || !target) return res.status(404).json({ message: "Usuário não encontrado" });

    me.following = (me.following || []).filter((u) => String(u) !== String(targetId));
    target.followers = (target.followers || []).filter((u) => String(u) !== String(meId));

    // Amizade é derivada de follow mútuo. Se eu parei de seguir, remove amizade.
    me.friends = (me.friends || []).filter((u) => String(u) !== String(targetId));
    target.friends = (target.friends || []).filter((u) => String(u) !== String(meId));

    await Promise.all([me.save(), target.save()]);

    res.json({ isFollowing: false, isFriend: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao parar de seguir" });
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
      followersCount: Array.isArray(user.followers) ? user.followers.length : 0,
      followingCount: Array.isArray(user.following) ? user.following.length : 0,
      friendsCount: Array.isArray(user.friends) ? user.friends.length : 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar usuário" });
  }
});

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

module.exports = router;
