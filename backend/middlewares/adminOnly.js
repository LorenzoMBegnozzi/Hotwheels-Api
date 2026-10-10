const User = require("../models/User");

const ADMIN_EMAIL = "lorenzobegnozzi@hotmail.com";

// Deve ser usado depois de authMiddleware. Confirma o email do usuário logado
// direto no banco (nunca confia em um campo enviado pelo cliente).
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

module.exports = adminOnly;
