require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

// Middleware
// Configure CORS: allow localhost (dev) and Railway frontend domain (production)
const parseOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://frontend-production-d39a.up.railway.app',
];

const allowedOrigins = parseOrigins(process.env.CORS_ORIGIN);
const originAllowList = allowedOrigins.length ? allowedOrigins : defaultOrigins;

const isAllowedByPattern = (origin) => {
  try {
    const u = new URL(origin);
    const host = u.hostname.toLowerCase();
    // Railway typical domains
    if (host.endsWith('.up.railway.app')) return true;
    if (host.endsWith('.railway.app')) return true;
    return false;
  } catch {
    return false;
  }
};

const corsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin / server-to-server / curl (no Origin header)
    if (!origin) return callback(null, true);
    // Allow all if configured
    if (originAllowList.includes('*')) return callback(null, true);
    if (originAllowList.includes(origin)) return callback(null, true);
    if (isAllowedByPattern(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

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
