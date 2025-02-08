require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/hotwheels", require("./routes/hotwheelsRoutes"));
app.use("/api/collection", require("./routes/collectionRoutes"));

// Conectar ao MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB conectado"))
  .catch((err) => console.log("Erro ao conectar ao MongoDB:", err));

// Rota inicial
app.get("/", (req, res) => {
  res.send("API do Hot Wheels funcionando!");
});

// Definir a porta do servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
