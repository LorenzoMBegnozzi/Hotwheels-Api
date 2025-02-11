const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");
require("dotenv").config();

// Conectar ao MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Conectado ao MongoDB"))
  .catch(err => console.error("❌ Erro ao conectar ao MongoDB:", err));

const HotWheelSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  imageUrl: String,
  year: Number,
});

const HotWheel = mongoose.model("HotWheel", HotWheelSchema);

// Função para buscar imagem no Google caso não encontre na Fandom
async function getGoogleImage(searchQuery) {
  try {
    console.log(`🔎 Buscando imagem no Google para: ${searchQuery}`);

    const response = await axios.get(`https://www.google.com/search?hl=en&tbm=isch&q=${encodeURIComponent(searchQuery + " Hot Wheels 2025 diecast")}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(response.data);
    let imageUrl = $("img").eq(1).attr("src"); // Pega a primeira imagem real

    if (!imageUrl || imageUrl.includes("/tia/tia.png")) {
      console.log(`⚠️ Nenhuma imagem válida encontrada para ${searchQuery}`);
      return "https://via.placeholder.com/150"; // Imagem padrão caso não encontre
    }

    return imageUrl;
  } catch (error) {
    console.error(`❌ Erro ao buscar imagem no Google para ${searchQuery}:`, error);
    return "https://via.placeholder.com/150"; // Imagem padrão de fallback
  }
}


// Função de raspagem
async function scrapeHotWheels() {
  try {
    const url = "https://hotwheels.fandom.com/wiki/List_of_2023_Hot_Wheels";

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    const $ = cheerio.load(data);
    const hotWheels = [];
    const defaultImage = "https://via.placeholder.com/150";

    for (const element of $("table.wikitable tbody tr").toArray()) {
      const columns = $(element).find("td");

      if (columns.length > 4) {
        const name = $(columns[2]).find("a").text().trim() || $(columns[2]).text().trim();

        let imageElement = $(columns).find("img");
        let imageUrl = imageElement.attr("data-src") || imageElement.attr("src") || "";

        // Remove parâmetros extras da URL
        if (imageUrl) {
          imageUrl = imageUrl.split("/revision")[0];
        }

        // Se a imagem for inválida, busca no Google
        if (!imageUrl || imageUrl.includes("/tia/tia.png") || imageUrl.includes("Image_Not_Available")) {
          imageUrl = await getGoogleImage(`${name} Hot Wheels`);
        }

        console.log(`🚗 Modelo: ${name}, 🖼️ Imagem: ${imageUrl}`);

        if (name) {
          hotWheels.push({ name, imageUrl, year: 2025 });
        }
      }
    }

    console.log(`📦 Dados para salvar: ${JSON.stringify(hotWheels, null, 2)}`);

    // Inserir ou atualizar no MongoDB
    for (const hotWheel of hotWheels) {
      await HotWheel.updateOne(
        { name: hotWheel.name },
        { $set: hotWheel },
        { upsert: true }
      );
    }

    console.log("🔥 Dados salvos no MongoDB com sucesso!");
    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Erro na raspagem:", error);
  }
}

scrapeHotWheels();
