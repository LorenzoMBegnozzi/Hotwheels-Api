const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  let token = req.header("Authorization") || req.header("x-auth-token");
  console.log("🔍 Token recebido:", token);

  if (!token) {
    return res.status(401).json({ message: "Token de autenticação ausente" });
  }

  try {
    if (token.startsWith("Bearer ")) {
      token = token.slice(7).trim();
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET não configurado no servidor.");
      return res
        .status(500)
        .json({ message: "Configuração do servidor ausente (JWT_SECRET)." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log("✅ Usuário autenticado:", req.user);

    // Atualiza lastSeen sem bloquear a requisição
    User.findByIdAndUpdate(decoded.id, { lastSeen: new Date() }).catch(() => {});

    next();
  } catch (error) {
    console.error("❌ Erro na autenticação:", error);
    return res.status(401).json({ message: "Token inválido" });
  }
};

module.exports = authMiddleware;
