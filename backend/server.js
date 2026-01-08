require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const app = express();

/* =========================
   CORS
========================= */
const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const defaultOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://frontend-production-d39a.up.railway.app", // Seu frontend no Railway
];

const allowedOrigins = parseOrigins(process.env.CORS_ORIGIN);
const originAllowList = allowedOrigins.length ? allowedOrigins : defaultOrigins;

const isAllowedByPattern = (origin) => {
  try {
    const u = new URL(origin);
    const host = u.hostname.toLowerCase();
    if (host.endsWith(".up.railway.app")) return true;
    if (host.endsWith(".railway.app")) return true;
    return false;
  } catch {
    return false;
  }
};

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // server-to-server, curl
    if (originAllowList.includes("*")) return callback(null, true);
    if (originAllowList.includes(origin)) return callback(null, true);
    if (isAllowedByPattern(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
  credentials: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

/* =========================
   Rotas
========================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/hotwheels", require("./routes/hotwheelsRoutes"));
app.use("/api/collection", require("./routes/collectionRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/users", require("./routes/users"));
app.use("/api/recognizer", require("./routes/recognizerRoutes"));
app.use("/api/feed", require("./routes/feedRoutes"));

/* =========================
   MongoDB
========================= */
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("❌ MONGODB_URI NÃO DEFINIDA");
  process.exit(1); // derruba o container se não tiver Mongo
}

mongoose
  .connect(mongoUri) // opções antigas não são mais necessárias no mongoose 8+
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => {
    console.error("❌ Erro ao conectar ao MongoDB:", err?.message || err);
    process.exit(1);
  });

/* =========================
   Frontend (opcional)
========================= */
// Se você estiver deployando apenas o backend (root dir = backend),
// provavelmente NÃO existirá ../frontend/build no container do Railway.
// Então condicionamos o uso do build.
const FRONTEND_BUILD = path.join(__dirname, "..", "frontend", "build");
const FRONTEND_INDEX = path.join(FRONTEND_BUILD, "index.html");

if (fs.existsSync(FRONTEND_INDEX)) {
  console.log("🟢 Frontend build encontrado. Servindo arquivos estáticos...");
  app.use(express.static(FRONTEND_BUILD));

  // SPA fallback: qualquer rota que não seja /api/*
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(FRONTEND_INDEX);
  });
} else {
  console.log(
    "ℹ️ Frontend build não encontrado em ../frontend/build. Servindo apenas API."
  );
}

/* =========================
   Healthcheck
========================= */
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

/* =========================
   Server start
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚗 🚀Servidor rodando na porta ${PORT}`);
  console.log(`📋 API disponível em: /api`);
});
