/**
 * scrape-fandom-gallery.js
 * - Pega imagens em formato "gallery" do Fandom (ex.: List_of_1970_Hot_Wheels)
 * - Converte thumb -> alta resolução
 * - Baixa imagem e salva em /uploads/hotwheels/<ANO>/
 * - Salva/atualiza no Mongo usando HotWheel model (upsert por lowercaseName + year)
 *
 * ✅ Corrigido:
 * - YEAR agora é extraído automaticamente do LIST_URL (nunca fica hardcoded)
 * - A pasta de imagens também segue o ano do link
 * - Inclui syncIndexes() opcional (recomendado) para garantir índice composto
 */

const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");
const HotWheel = require("./models/HotWheel");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

require("dotenv").config();

// ✅ Só troca esse link e tudo (ano/pasta) acompanha automaticamente
const LIST_URL = "https://hotwheels.fandom.com/wiki/List_of_1973_Hot_Wheels";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function extractYearFromListUrl(url) {
  const m = String(url || "").match(/List_of_(\d{4})_Hot_Wheels/i);
  if (!m) return null;
  const y = Number(m[1]);
  return Number.isFinite(y) ? y : null;
}

async function connectToMongo() {
  const mongoUri =
    process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL;

  if (!mongoUri) {
    throw new Error(
      "MongoDB URI não encontrada. Defina MONGODB_URI (recomendado) ou MONGO_URI/MONGO_URL no .env."
    );
  }

  mongoose.set("bufferCommands", false);
  mongoose.set("bufferTimeoutMS", 30000);

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  });

  // ✅ RECOMENDADO: garante que os índices do schema estejam aplicados
  // (isso NÃO remove automaticamente índices antigos; se existir lowercaseName_1 único,
  // você precisa dropar manualmente no MongoDB)
  try {
    await HotWheel.syncIndexes();
  } catch (_) {
    // se não quiser travar o scraper por causa disso
  }
}

function cleanUrl(url) {
  return url ? url.replace(/\s/g, "") : "";
}

function pickGalleryImageUrl($item) {
  const $img = $item.find("img").first();
  const dataSrc = $img.attr("data-src");
  const src = $img.attr("src");
  const noScriptSrc = $item.find("noscript img").first().attr("src");
  return cleanUrl(dataSrc || src || noScriptSrc || "");
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

/**
 * Converte thumb do Fandom para versão maior:
 * .../revision/latest/scale-to-width-down/185?cb=...
 * -> .../revision/latest?cb=...
 */
function toHighResFandomImageUrl(url) {
  if (!url) return "";
  url = cleanUrl(url);

  if (url.startsWith("//")) url = `https:${url}`;
  if (url.startsWith("data:")) return "";

  url = url.replace(
    /\/revision\/latest\/scale-to-width-down\/\d+/i,
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
 * Salva em: uploads/hotwheels/<year>/
 * Retorna publicPath: /uploads/hotwheels/<year>/<file>
 */
async function downloadAndSaveImage({ imageUrl, year, name }) {
  const url = String(imageUrl || "").trim();
  if (!url) return { ok: false };
  if (url.startsWith("data:")) return { ok: false };
  if (url.includes("via.placeholder.com")) return { ok: false };

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
        "User-Agent": USER_AGENT,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://hotwheels.fandom.com/",
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

async function scrapeGalleryList() {
  let connected = false;

  const YEAR = extractYearFromListUrl(LIST_URL);
  if (!YEAR) {
    throw new Error(
      `Não consegui extrair o ano do link: ${LIST_URL} (esperado: List_of_YYYY_Hot_Wheels)`
    );
  }

  try {
    await connectToMongo();
    connected = true;

    console.log("✅ Conectado ao MongoDB");
    console.log(`➡️ Baixando: ${LIST_URL}`);
    console.log(`📅 Ano detectado: ${YEAR}`);

    const { data } = await axios.get(LIST_URL, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 30000,
    });

    const $ = cheerio.load(data);

    const items = $(".wikia-gallery-item");
    console.log(`📦 Itens detectados na gallery: ${items.length}`);

    const hotWheels = [];

    items.each((_, el) => {
      const $item = $(el);

      const name =
        $item.find(".lightbox-caption a").first().text().trim() ||
        $item.find("a.image").attr("title")?.trim() ||
        "";

      if (!name) return;

      const thumbUrl = pickGalleryImageUrl($item);
      const highResUrl = toHighResFandomImageUrl(thumbUrl);

      hotWheels.push({
        name,
        lowercaseName: name.toLowerCase(),
        year: YEAR,
        thumbUrl,
        highResUrl,
      });
    });

    console.log(`🚗 Modelos detectados: ${hotWheels.length}`);

    let inserted = 0;
    let updated = 0;

    for (const hw of hotWheels) {
      const saved = await downloadAndSaveImage({
        imageUrl: hw.highResUrl,
        year: hw.year,
        name: hw.name,
      });

      const finalImageUrl = saved.ok ? saved.publicPath : hw.highResUrl;

      const existing = await HotWheel.findOne(
        { lowercaseName: hw.lowercaseName, year: hw.year },
        { _id: 1 }
      ).lean();

      await HotWheel.updateOne(
        { lowercaseName: hw.lowercaseName, year: hw.year },
        {
          $set: {
            name: hw.name,
            lowercaseName: hw.lowercaseName,
            year: hw.year,
            imageUrl: finalImageUrl,
            images: saved.ok
              ? [saved.publicPath, hw.highResUrl, hw.thumbUrl].filter(Boolean)
              : [hw.highResUrl, hw.thumbUrl].filter(Boolean),
            primaryCategory: null,
          },
        },
        { upsert: true }
      );

      if (existing) updated++;
      else inserted++;

      console.log(`✅ ${hw.name} | 🖼️ ${finalImageUrl}`);
    }

    console.log("\n================ RELATÓRIO FINAL ================");
    console.log(`📅 Ano: ${YEAR}`);
    console.log(`✅ Inseridos: ${inserted}`);
    console.log(`♻️ Atualizados: ${updated}`);
    console.log(`📦 Total: ${inserted + updated}`);
    console.log("🔥 Finalizado!");
  } catch (err) {
    console.error("❌ Erro:", err?.message || err);
    process.exitCode = 1;
  } finally {
    if (connected) {
      try {
        await mongoose.disconnect();
      } catch (_) {}
    }
  }
}

scrapeGalleryList();
