const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");
const authMiddleware = require("../middlewares/auth"); 

const router = express.Router();

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// 🟢 Rota de Registro (com nome e confirmação de senha)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "As senhas não coincidem." });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "Usuário já cadastrado" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(201).json({ message: "Usuário cadastrado com sucesso!", token });
  } catch (err) {
    res.status(500).json({ message: "Erro ao cadastrar usuário" });
  }
});

// 🔵 Rota de Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Usuário não encontrado" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Senha incorreta" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, userId: user._id });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ message: "Erro ao fazer login", error: err.message });
  }
});

// 🟢 Rota para Obter Perfil do Usuário (Protegida)
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar perfil" });
  }
});

// 🟠 Rota para Atualizar o Perfil do Usuário (Protegida)
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;
    const updatedUser = await User.findByIdAndUpdate(req.user.id, { name, email }, { new: true });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: "Erro ao atualizar perfil" });
  }
});

// 🟡 Rota para Upload de Imagem do Perfil (Protegida)
router.post("/upload", authMiddleware, upload.single("profilePicture"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo enviado" });
    }

    const imagePath = `/uploads/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user.id, { profilePicture: imagePath });

    res.json({ message: "Imagem enviada com sucesso!", imagePath });
  } catch (err) {
    res.status(500).json({ message: "Erro ao enviar imagem" });
  }
});

router.put("/update-password", authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Usuário não encontrado." });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Senha atual incorreta." });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Senha atualizada com sucesso." });
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar senha." });
  }
});


module.exports = router;
