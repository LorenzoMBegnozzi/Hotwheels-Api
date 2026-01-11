/**
 * scrape-fandom-1974-mwfile.js
 * - Pega imagens no padrão MediaWiki: <span typeof="mw:File"> <a class="mw-file-description image" href="FULL"> <img src="THUMB"> ...
 * - Usa o href (FULL) como alta resolução
 * - Baixa e salva em /uploads/hotwheels/<ANO>/
 * - Upsert no Mongo (lowercaseName + year)
 */

const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");
const HotWheel = require("./models/HotWheel");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

require("dotenv").config();

const LIST_URL = "https://hotwheels.fandom.com/wiki/List_of_1977_Hot_Wheels";

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

  // Recomendado (não derruba o scraper se falhar)
  try {
    await HotWheel.syncIndexes();
  } catch (_) {}
}

function cleanUrl(url) {
  return url ? String(url).replace(/\s/g, "") : "";
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
  if (!url) return "";
  url = cleanUrl(url);

  if (url.startsWith("//")) url = `https:${url}`;
  if (url.startsWith("data:")) return "";

  // se vier thumb, normaliza pra latest
  url = url.replace(
    /\/revision\/latest\/scale-to-width-down\/\d+/i,
    "/revision/latest"
  );
  url = url.replace(
    /\/revision\/latest\/smart\/width\/\d+\/height\/\d+/i,
    "/revision/latest"
  );
  url = url.replace(/\/scale-to-width-down\/\d+/i, "");

  // thumbs antigas /images/thumb/... -> /images/...
  url = url.replace(/\/images\/thumb\//i, "/images/");
  url = url.replace(/\/(\d+px-)/i, "/");

  // evita format=original em revision (às vezes quebra)
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
      maxContentLength: 25 * 1024 * 1024,
      maxBodyLength: 25 * 1024 * 1024,
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

    return { ok: true, publicPath: `/uploads/hotwheels/${safeYear}/${fileName}` };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function getNameFromMwFile($span) {
  // tenta alt do img (geralmente vem bom)
  const alt = $span.find("img").attr("alt");
  if (alt && alt.trim()) return alt.trim();

  // fallback: data-image-name (nome de arquivo) -> vira nome “legível”
  const imgName = $span.find("img").attr("data-image-name");
  if (imgName) {
    return String(imgName)
      .replace(/\.(jpg|jpeg|png|webp|gif)$/i, "")
      .replace(/[_-]+/g, " ")
      .trim();
  }

  // fallback: título do <a>
  const title = $span.find("a.mw-file-description").attr("title");
  if (title) return String(title).trim();

  return "";
}

async function scrape1974MwFile() {
  const YEAR = extractYearFromListUrl(LIST_URL);
  if (!YEAR) throw new Error(`Não consegui extrair o ano do link: ${LIST_URL}`);

  let connected = false;

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

    // ✅ esse é o padrão que você mostrou
    const spans = $("span[typeof='mw:File']");
    console.log(`📦 mw:File detectados: ${spans.length}`);

    const found = [];
    const seen = new Set(); // dedupe por URL full

    spans.each((_, el) => {
      const $span = $(el);

      const fullHref = cleanUrl(
        $span.find("a.mw-file-description.image").attr("href") ||
          $span.find("a.mw-file-description").attr("href") ||
          ""
      );

      // alguns podem vir relativos; normaliza
      const fullUrl = toHighResFandomImageUrl(fullHref);

      if (!fullUrl) return;
      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);

      const name = getNameFromMwFile($span);
      if (!name) return;

      found.push({
        name,
        lowercaseName: name.toLowerCase(),
        year: YEAR,
        highResUrl: fullUrl,
      });
    });

    console.log(`🚗 Modelos coletados: ${found.length}`);

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const hw of found) {
      const saved = await downloadAndSaveImage({
        imageUrl: hw.highResUrl,
        year: hw.year,
        name: hw.name,
      });

      const finalImageUrl = saved.ok ? saved.publicPath : hw.highResUrl;

      try {
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
                ? [saved.publicPath, hw.highResUrl].filter(Boolean)
                : [hw.highResUrl].filter(Boolean),
              primaryCategory: null,
            },
          },
          { upsert: true }
        );

        if (existing) updated++;
        else inserted++;

        console.log(`✅ ${hw.name} | 🖼️ ${finalImageUrl}`);
      } catch (e) {
        failed++;
        console.log(`❌ ${hw.name} | erro mongo: ${e?.message || e}`);
      }
    }

    console.log("\n================ RELATÓRIO FINAL ================");
    console.log(`📅 Ano: ${YEAR}`);
    console.log(`✅ Inseridos: ${inserted}`);
    console.log(`♻️ Atualizados: ${updated}`);
    console.log(`❌ Falhas: ${failed}`);
    console.log(`📦 Total: ${inserted + updated + failed}`);
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

scrape1974MwFile();
