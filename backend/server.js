require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

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
    if (!origin) return callback(null, true);
    if (originAllowList.includes("*")) return callback(null, true);
    if (originAllowList.includes(origin)) return callback(null, true);
    if (isAllowedByPattern(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
  credentials: false,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* =========================
   MIDDLEWARES
========================= */

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   ROTAS
========================= */

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/hotwheels", require("./routes/hotwheelsRoutes"));
app.use("/api/collection", require("./routes/collectionRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/users", require("./routes/users"));
app.use("/api/recognizer", require("./routes/recognizerRoutes"));
app.use("/api/feed", require("./routes/feedRoutes"));

/* =========================
   HEALTHCHECK (OBRIGATÓRIO)
========================= */

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

/* =========================
   MONGODB + SERVER START
========================= */

const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  process.env.MONGO_URI;

if (!mongoUri) {
  console.error("❌ MONGO URI NÃO DEFINIDA");
  process.exit(1);
}

const PORT =
  Number(process.env.PORT) ||
  Number(process.env.RAILWAY_PUBLIC_PORT) ||
  Number(process.env.RAILWAY_PORT) ||
  5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
  if (process.env.PORT && Number(process.env.PORT) !== PORT) {
    console.log(
      `[PORT] process.env.PORT=${process.env.PORT} (resolved PORT=${PORT})`
    );
  }
});

const connectMongoWithRetry = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB conectado");
  } catch (err) {
    console.error("❌ Erro ao conectar no MongoDB (vai tentar novamente)");
    console.error(err?.message || err);
    setTimeout(connectMongoWithRetry, 5000);
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB desconectado");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB erro:", err?.message || err);
});

connectMongoWithRetry();
