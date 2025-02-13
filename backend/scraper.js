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

function cleanUrl(url) {
  return url ? url.replace(/\s/g, "") : url; 
}

// Função para buscar imagem no Google caso não encontre na Fandom
async function getGoogleImage(searchQuery) {
  try {
    console.log(`🔎 Buscando imagem no Google para: ${searchQuery}`);

    const response = await axios.get(`https://www.google.com/search?hl=en&tbm=isch&q=${encodeURIComponent(searchQuery + " Hot Wheels 2025 diecast")}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(response.data);
    let imageUrl = $("img").eq(1).attr("src"); 

    if (!imageUrl || imageUrl.includes("/tia/tia.png")) {
      console.log(`⚠️ Nenhuma imagem válida encontrada para ${searchQuery}`);
      return "https://via.placeholder.com/150"; 
    }

    return cleanUrl(imageUrl);
  } catch (error) {
    console.error(`❌ Erro ao buscar imagem no Google para ${searchQuery}:`, error);
    return "https://via.placeholder.com/150"; 
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

    // Itera sobre todas as linhas da tabela
    $("table.wikitable tbody tr").each(async (index, element) => {
      const columns = $(element).find("td");

      // Se não houver colunas suficientes, ignora a linha
      if (columns.length < 3) {
        console.log(`⚠️ Linha ignorada (muito curta): ${$(element).text().trim().slice(0, 50)}...`);
        return;
      }

      let name = $(columns.eq(2)).text().trim() || $(columns.eq(1)).text().trim();
      name = name.replace(/^'\d{2} /, ""); 

      let imageElement = $(columns).find("img");
      let imageUrl = imageElement.attr("data-src") || imageElement.attr("src") || "";

      // Remove parâmetros extras da URL e limpa espaços
      if (imageUrl) {
        imageUrl = cleanUrl(imageUrl.split("/revision")[0]);
      }

      // Se a imagem for inválida, busca no Google
      if (!imageUrl || imageUrl.includes("/tia/tia.png") || imageUrl.includes("Image_Not_Available")) {
        imageUrl = await getGoogleImage(`${name} Hot Wheels`);
      }

      console.log(`🚗 Modelo: ${name}, 🖼️ Imagem: ${imageUrl}`);

      if (name) {
        hotWheels.push({ name, imageUrl, year: 2023 });
      }
    });

    console.log(`📦 Total de modelos extraídos: ${hotWheels.length}`);

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
