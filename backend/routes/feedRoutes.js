const express = require("express");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");

const auth = require("../middlewares/auth");
const Post = require("../models/Post");

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "uploads"),
  filename: (req, file, cb) => {
    const safeName = String(file.originalname || "image")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 80);
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

const formatPost = (post, meId) => {
  const obj = post.toObject({ virtuals: false });
  const likesArr = Array.isArray(obj.likes) ? obj.likes : [];
  const commentsArr = Array.isArray(obj.comments) ? obj.comments : [];

  const likedByMe = meId
    ? likesArr.some((u) => String(u) === String(meId))
    : false;

  return {
    ...obj,
    likesCount: likesArr.length,
    commentsCount: commentsArr.length,
    likedByMe,
  };
};

// List feed posts (auth required for likedByMe)
router.get("/", auth, async (req, res) => {
  try {
    const { authorId } = req.query;
    const filter = {};
    if (authorId) {
      if (!mongoose.Types.ObjectId.isValid(authorId)) {
        return res.status(400).json({ message: "authorId inválido" });
      }
      filter.author = authorId;
    }

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .populate("author", "name profilePicture")
      .populate("comments.author", "name profilePicture");

    res.json(posts.map((p) => formatPost(p, req.user.id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar feed" });
  }
});

// Create post (multipart: text + image)
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const text = (req.body?.text || "").trim();
    if (!req.file) return res.status(400).json({ message: "Imagem é obrigatória" });

    const image = `/uploads/${req.file.filename}`;

    const post = await Post.create({
      author: req.user.id,
      text,
      image,
    });

    const populated = await Post.findById(post._id)
      .populate("author", "name profilePicture")
      .populate("comments.author", "name profilePicture");

    res.status(201).json(formatPost(populated, req.user.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao criar publicação" });
  }
});

// Toggle like
router.post("/:id/like", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Publicação não encontrada" });

    post.likes = post.likes || [];
    const idx = post.likes.findIndex((u) => String(u) === String(req.user.id));

    let liked = false;
    if (idx >= 0) {
      post.likes.splice(idx, 1);
      liked = false;
    } else {
      post.likes.push(req.user.id);
      liked = true;
    }

    await post.save();

    res.json({ liked, likesCount: (post.likes || []).length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao curtir" });
  }
});

// Add comment
router.post("/:id/comments", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const text = (req.body?.text || "").trim();
    if (!text) return res.status(400).json({ message: "Comentário é obrigatório" });

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Publicação não encontrada" });

    post.comments = post.comments || [];
    post.comments.push({ author: req.user.id, text });
    await post.save();

    const populated = await Post.findById(id)
      .populate("author", "name profilePicture")
      .populate("comments.author", "name profilePicture");

    res.json(formatPost(populated, req.user.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao comentar" });
  }
});

// Delete post (only author)
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Publicação não encontrada" });

    if (String(post.author) !== String(req.user.id)) {
      return res.status(403).json({ message: "Você não pode excluir esta publicação" });
    }

    await Post.deleteOne({ _id: id });
    res.json({ message: "Publicação excluída" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao excluir publicação" });
  }
});

module.exports = router;
