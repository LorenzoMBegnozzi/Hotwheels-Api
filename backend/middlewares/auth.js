const jwt = require("jsonwebtoken"); 

const authMiddleware = (req, res, next) => {
  const token = req.header("x-auth-token");
  console.log("🔍 Token recebido:", token);

  if (!token) {
    return res.status(401).json({ message: "Token de autenticação ausente" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log("🔍 Usuário autenticado:", req.user); // Debug
    next();
  } catch (error) {
    console.error("❌ Erro na autenticação:", error);
    res.status(400).json({ message: "Token inválido" });
  }
};

module.exports = authMiddleware;
