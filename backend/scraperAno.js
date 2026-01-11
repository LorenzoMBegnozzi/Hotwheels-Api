const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");
const HotWheel = require("./models/HotWheel");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Carrega o .env a partir do diretório do script (evita depender do CWD)
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
} else {
  require("dotenv").config();
}

async function connectToMongo() {
  const mongoUri =
    process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL;

  if (!mongoUri) {
    throw new Error(
      "MongoDB URI não encontrada. Defina MONGODB_URI (recomendado) ou MONGO_URI/MONGO_URL no .env ou nas variáveis de ambiente."
    );
  }

  mongoose.set("bufferCommands", false);
  mongoose.set("bufferTimeoutMS", 30000);

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  });
}

function cleanUrl(url) {
  return url ? url.replace(/\s/g, "") : url;
}

function pickImageUrl($img) {
  if (!$img || $img.length === 0) return "";

  const dataSrc = $img.attr("data-src");
  const src = $img.attr("src");
  const srcset = $img.attr("srcset") || $img.attr("data-srcset");

  if (srcset) {
    const parts = srcset
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const last = parts[parts.length - 1];
    const url = last?.split(" ")[0];
    if (url) return cleanUrl(url);
  }

  return cleanUrl(dataSrc || src || "");
}

function removeQueryParam(url, key) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete(key);
    return u.toString();
  } catch (_) {
    return url;
  }
}

function toHighResFandomImageUrl(url) {
  if (!url) return url;
  url = cleanUrl(url);

  if (url.startsWith("//")) url = `https:${url}`;
  if (url.startsWith("data:")) return "";

  url = url.replace(
    /\/revision\/latest\/scale-to-width-down\/\d+/i,
    "/revision/latest"
  );
  url = url.replace(
    /\/revision\/latest\/smart\/width\/\d+\/height\/\d+/i,
    "/revision/latest"
  );
  url = url.replace(/\/scale-to-width-down\/\d+/i, "");

  url = url.replace(/\/images\/thumb\//i, "/images/");
  url = url.replace(/\/(\d+px-)/i, "/");

  if (url.includes("/revision/")) {
    url = removeQueryParam(url, "format");
  }

  return url;
}

function slugifyFilename(value) {
  const s = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || "hotwheel";
}

function guessFileExt({ contentType, url }) {
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("image/jpeg")) return ".jpg";
  if (ct.includes("image/png")) return ".png";
  if (ct.includes("image/webp")) return ".webp";
  if (ct.includes("image/gif")) return ".gif";

  try {
    const u = new URL(url);
    const pathname = u.pathname || "";
    const m = pathname.match(/\.(jpg|jpeg|png|webp|gif)$/i);
    if (m) return m[0].toLowerCase() === ".jpeg" ? ".jpg" : m[0].toLowerCase();
  } catch (_) {}

  return ".jpg";
}

/**
 * ✅ Cria a pasta automaticamente pelo ANO recebido
 * uploads/hotwheels/<ano>/
 */
async function downloadAndSaveImage({ imageUrl, year, name }) {
  const url = String(imageUrl || "").trim();
  if (!url) return { ok: false };
  if (url.startsWith("data:")) return { ok: false };
  if (url.includes("via.placeholder.com")) return { ok: false };

  // ✅ Ano sempre vindo do scraper
  const safeYear = Number(year) || "unknown";

  const subdir = path.join(__dirname, "uploads", "hotwheels", String(safeYear));
  await fs.promises.mkdir(subdir, { recursive: true });

  const hash = crypto.createHash("md5").update(url).digest("hex").slice(0, 10);
  const baseName = `${slugifyFilename(name)}-${hash}`;

  try {
    const resp = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      maxContentLength: 20 * 1024 * 1024,
      maxBodyLength: 20 * 1024 * 1024,
      validateStatus: (s) => s >= 200 && s < 300,
    });

    const ext = guessFileExt({
      contentType: resp.headers?.["content-type"],
      url,
    });

    const fileName = `${baseName}${ext}`;
    const absPath = path.join(subdir, fileName);

    if (!fs.existsSync(absPath)) {
      await fs.promises.writeFile(absPath, Buffer.from(resp.data));
    }

    const publicPath = `/uploads/hotwheels/${safeYear}/${fileName}`;
    return { ok: true, publicPath };
  } catch (e) {
    return { ok: false, error: e };
  }
}

// Função para buscar imagem no Google caso não encontre na Fandom
async function getGoogleImage(searchQuery) {
  try {
    console.log(`🔎 Buscando imagem no Google para: ${searchQuery}`);

    const response = await axios.get(
      `https://www.google.com/search?hl=en&tbm=isch&q=${encodeURIComponent(
        searchQuery + " Hot Wheels diecast"
      )}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 30000 }
    );

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

/**
 * ✅ Extrai o ano a partir do link:
 * https://hotwheels.fandom.com/wiki/List_of_1999_Hot_Wheels -> 1999
 */
function extractYearFromListUrl(url) {
  const m = String(url || "").match(/List_of_(\d{4})_Hot_Wheels/i);
  if (!m) return null;
  const y = Number(m[1]);
  return Number.isFinite(y) ? y : null;
}

// Função de raspagem
async function scrapeHotWheels() {
  let connected = false;
  try {
    await connectToMongo();
    connected = true;
    console.log("✅ Conectado ao MongoDB");

    // ✅ Só troca esse URL e ele faz o resto (ano/pasta) sozinho
    const url = "https://hotwheels.fandom.com/wiki/List_of_1992_Hot_Wheels";
    const YEAR = extractYearFromListUrl(url) || 1990;

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 30000,
    });

    const $ = cheerio.load(data);
    const hotWheels = [];

    const promises = $("table.wikitable tbody tr")
      .map(async (_, element) => {
        const columns = $(element).find("td");
        if (columns.length < 3) return;

        let name = $(columns.eq(2)).text().trim() || $(columns.eq(1)).text().trim();
        name = name.replace(/^'\d{2}\s+/, "");

        if (!name) return;

        const imageElement = $(columns).find("img").first();
        let imageUrl = toHighResFandomImageUrl(pickImageUrl(imageElement));

        if (!imageUrl || imageUrl.includes("/tia/tia.png") || imageUrl.includes("Image_Not_Available")) {
          imageUrl = await getGoogleImage(`${name} Hot Wheels ${YEAR}`);
          imageUrl = cleanUrl(imageUrl);
        }

        let finalImageUrl = imageUrl;
        let images = imageUrl ? [imageUrl] : [];

        // ✅ Agora salva SEMPRE na pasta do YEAR correto
        const saved = await downloadAndSaveImage({ imageUrl, year: YEAR, name });
        if (saved.ok && saved.publicPath) {
          finalImageUrl = saved.publicPath;
          images = [saved.publicPath, ...(imageUrl ? [imageUrl] : [])];
        }

        console.log(`🚗 Modelo: ${name}, 📅 Ano: ${YEAR}, 🖼️ Imagem: ${finalImageUrl}`);

        hotWheels.push({
          name,
          lowercaseName: name.toLowerCase(),
          imageUrl: finalImageUrl,
          images,
          year: YEAR, // ✅ ano correto no Mongo
        });
      })
      .get();

    await Promise.all(promises);

    console.log(`📦 Total de modelos extraídos: ${hotWheels.length}`);

    for (const hotWheel of hotWheels) {
      await HotWheel.updateOne(
        { lowercaseName: hotWheel.lowercaseName, year: hotWheel.year },
        { $set: hotWheel },
        { upsert: true }
      );
    }

    console.log("🔥 Dados salvos no MongoDB com sucesso!");
  } catch (error) {
    console.error("❌ Erro na raspagem:", error);
    process.exitCode = 1;
  } finally {
    if (connected) {
      try {
        await mongoose.disconnect();
      } catch (_) {}
    }
  }
}

scrapeHotWheels();
