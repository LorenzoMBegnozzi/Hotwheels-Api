const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Rota de Cadastro
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verifica se o usuário já existe
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "Usuário já cadastrado" });

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
  } catch (err) {
    res.status(500).json({ message: "Erro ao cadastrar usuário" });
  }
});

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

module.exports = router;
