require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
// Configure CORS: allow localhost (dev) and Railway frontend domain (production)
const defaultOrigins = [
  'http://localhost:3000',
  'https://frontend-production-d39a.up.railway.app'
];
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : defaultOrigins,
  credentials: true
}));

// Servir a pasta uploads corretamente
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Rotas API
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/hotwheels", require("./routes/hotwheelsRoutes"));
app.use("/api/collection", require("./routes/collectionRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/users", require("./routes/users"));
app.use("/api/recognizer", require("./routes/recognizerRoutes"));
app.use("/api/feed", require("./routes/feedRoutes"));



// Conectar ao MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => console.log("❌ Erro ao conectar ao MongoDB:", err));

// Servir frontend (build) quando disponível, mantendo /api separado
const FRONTEND_BUILD = path.join(__dirname, "..", "frontend", "build");
app.use(express.static(FRONTEND_BUILD));

// SPA fallback para qualquer rota que não seja /api/*
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_BUILD, "index.html"));
});

// Definir a porta do servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚗 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesso local: http://localhost:${PORT}`);
    console.log(`🌐 Acesso na rede: http://192.168.0.4:${PORT}`);
    console.log(`📋 API disponível em: http://192.168.0.4:${PORT}/api`);
});
