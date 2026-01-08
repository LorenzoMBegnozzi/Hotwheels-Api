const jwt = require("jsonwebtoken"); 

const authMiddleware = (req, res, next) => {
  let token = req.header("Authorization") || req.header("x-auth-token");
  console.log("🔍 Token recebido:", token);

  if (!token) {
    return res.status(401).json({ message: "Token de autenticação ausente" });
  }

  try {
    if (token.startsWith("Bearer ")) {
      token = token.slice(7).trim(); // Remove "Bearer " do token
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET não configurado no servidor.");
      return res
        .status(500)
        .json({ message: "Configuração do servidor ausente (JWT_SECRET)." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Adiciona o usuário decodificado ao request
    console.log("✅ Usuário autenticado:", req.user);
    
    next(); // Continua para a próxima função do middleware
  } catch (error) {
    console.error("❌ Erro na autenticação:", error);
    return res.status(401).json({ message: "Token inválido" });
  }
};

module.exports = authMiddleware;
