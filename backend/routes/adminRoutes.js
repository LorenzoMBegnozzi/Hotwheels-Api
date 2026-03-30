const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middlewares/auth");
const User = require("../models/User");
const HotWheel = require("../models/HotWheel");
const Post = require("../models/Post");

const ADMIN_EMAIL = "lorenzobegnozzi@hotmail.com";

// Middleware que verifica se o usuário logado é o admin
const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("email");
    if (!user || user.email.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ message: "Acesso negado." });
    }
    next();
  } catch (err) {
    console.error("adminOnly error:", err);
    res.status(500).json({ message: "Erro ao verificar permissão." });
  }
};

// Retorna a data de criação do documento: usa createdAt se existir, senão o timestamp do ObjectId
const createdAtExpr = {
  $cond: {
    if: { $ifNull: ["$createdAt", false] },
    then: "$createdAt",
    else: { $toDate: "$_id" },
  },
};

// GET /api/admin/stats
router.get("/stats", authMiddleware, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const onlineThreshold = new Date(now - 15 * 60 * 1000);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Usa ObjectId timestamp como proxy de createdAt para documentos antigos
    const objectIdFromDate = (date) =>
      mongoose.Types.ObjectId.createFromTime(Math.floor(date.getTime() / 1000));

    const [
      totalUsers,
      onlineUsers,
      totalCars,
      totalPosts,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      topCollectors,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),

      User.countDocuments({ lastSeen: { $gte: onlineThreshold } }),

      HotWheel.countDocuments(),

      Post.countDocuments(),

      // Conta por createdAt OU pelo timestamp do ObjectId (documentos antigos)
      User.countDocuments({
        $or: [
          { createdAt: { $gte: todayStart } },
          { _id: { $gte: objectIdFromDate(todayStart) }, createdAt: { $exists: false } },
        ],
      }),

      User.countDocuments({
        $or: [
          { createdAt: { $gte: weekStart } },
          { _id: { $gte: objectIdFromDate(weekStart) }, createdAt: { $exists: false } },
        ],
      }),

      User.countDocuments({
        $or: [
          { createdAt: { $gte: monthStart } },
          { _id: { $gte: objectIdFromDate(monthStart) }, createdAt: { $exists: false } },
        ],
      }),

      // Top coletores — $ifNull evita erro em campos ausentes/null
      User.aggregate([
        {
          $project: {
            name: 1,
            email: 1,
            profilePicture: 1,
            collectionSize: { $size: { $ifNull: ["$collection", []] } },
            followersCount: { $size: { $ifNull: ["$followers", []] } },
            lastSeen: 1,
          },
        },
        { $sort: { collectionSize: -1 } },
        { $limit: 10 },
      ]),

      // Usuários recentes: ordena pelo timestamp do ObjectId (confiável para todos)
      User.aggregate([
        {
          $project: {
            name: 1,
            email: 1,
            profilePicture: 1,
            lastSeen: 1,
            createdAt: createdAtExpr,
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Cadastros por dia nos últimos 7 dias (usa ObjectId timestamp como fallback)
    const registrationsByDay = await User.aggregate([
      {
        $project: {
          createdAt: createdAtExpr,
        },
      },
      {
        $match: { createdAt: { $gte: weekStart } },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalUsers,
      onlineUsers,
      totalCars,
      totalPosts,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      topCollectors,
      recentUsers,
      registrationsByDay,
    });
  } catch (err) {
    console.error("Erro ao buscar stats admin:", err);
    res.status(500).json({ message: "Erro ao buscar estatísticas.", detail: err.message });
  }
});

// GET /api/admin/users - lista todos os usuários
router.get("/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $project: {
          name: 1,
          email: 1,
          profilePicture: 1,
          lastSeen: 1,
          createdAt: createdAtExpr,
          collectionSize: { $size: { $ifNull: ["$collection", []] } },
          followersCount: { $size: { $ifNull: ["$followers", []] } },
          followingCount: { $size: { $ifNull: ["$following", []] } },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.json(users);
  } catch (err) {
    console.error("Erro ao listar usuários admin:", err);
    res.status(500).json({ message: "Erro ao listar usuários.", detail: err.message });
  }
});

module.exports = router;
