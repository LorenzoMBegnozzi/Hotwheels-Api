/* eslint-disable no-console */
const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");
const HotWheel = require("./models/HotWheel");
require("dotenv").config();

// ======================== CONFIGURAÇÕES ========================
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const START_INDEX = 0; // índice para retomar
// ===============================================================

// === Funções utilitárias ===
const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
];

function randomUA() {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

const http = axios.create({
  timeout: 25000,
  headers: {
    "User-Agent": randomUA(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  maxRedirects: 5,
});

function withFreshHeaders() {
  http.defaults.headers["User-Agent"] = randomUA();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cleanUrl(url) {
  if (!url) return "";
  let u = url.trim();
  if (u.startsWith("//")) u = "https:" + u;
  u = u.replace(/\s+/g, "");
  u = u.split("?")[0];
  u = u.replace(/-(\d{2,4}x\d{2,4})\.(jpg|jpeg|png|webp)$/i, ".$2");
  return u;
}

function isValidImageUrl(u) {
  if (!u) return false;
  if (/^data:image\//i.test(u)) return false;
  if (!/^https?:\/\//i.test(u)) return false;
  if (!/\.(jpg|jpeg|png|webp)$/i.test(u.split("#")[0])) return false;
  const low = u.toLowerCase();
  if (low.includes("encrypted-tbn0") || low.includes("gstatic.com")) return false;
  if (low.includes("sprite") || low.includes("logo") || low.includes("icon")) return false;
  return true;
}

function sanitizeSearchQuery(name) {
  return name
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/(short\s*card|variant[e]?|colorway)/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function withRetry(fn, { tries = 5, baseMs = 1200 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const status = e?.response?.status;
      if (!(status === 429 || (status >= 500 && status < 600))) throw e;
      const jitter = Math.floor(Math.random() * 400);
      const wait = Math.min(15000, Math.pow(2, i) * baseMs + jitter);
      console.warn(`⏳ Backoff (${i + 1}/${tries}) status ${status} -> aguardando ${wait}ms`);
      await sleep(wait);
      withFreshHeaders();
    }
  }
  throw lastErr;
}

// ===================== GOOGLE IMAGE SEARCH =====================

async function getGoogleImagesAPI(query, limit = 6) {
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) return [];
  return withRetry(async () => {
    const params = {
      key: GOOGLE_API_KEY,
      cx: GOOGLE_CSE_ID,
      q: query,
      searchType: "image",
      num: Math.min(limit, 10),
      safe: "high",
      imgType: "photo",
    };
    const { data } = await axios.get("https://www.googleapis.com/customsearch/v1", { params });
    const items = data?.items || [];
    return items.map(it => cleanUrl(it.link)).filter(isValidImageUrl).slice(0, limit);
  });
}

async function getGoogleImagesScrape(query, limit = 6) {
  return withRetry(async () => {
    withFreshHeaders();
    const url = `https://www.google.com/search?hl=en&tbm=isch&q=${encodeURIComponent(query)}`;
    const { data } = await http.get(url);
    const images = new Set();
    const regexHttp = /https?:\/\/[^"'\\\s]+?\.(?:jpg|jpeg|png|webp)/gi;
    const candidates1 = data.match(regexHttp) || [];
    candidates1.forEach((u) => {
      const cu = cleanUrl(u);
      if (isValidImageUrl(cu)) images.add(cu);
    });
    const $ = cheerio.load(data);
    $("img").each((_, el) => {
      const srcset = $(el).attr("srcset");
      if (srcset) {
        const first = srcset.split(",")[0].trim().split(" ")[0];
        const cu = cleanUrl(first);
        if (isValidImageUrl(cu)) images.add(cu);
      }
      const src = $(el).attr("src");
      if (src) {
        const cu = cleanUrl(src);
        if (isValidImageUrl(cu)) images.add(cu);
      }
      const dataSrc = $(el).attr("data-src");
      if (dataSrc) {
        const cu = cleanUrl(dataSrc);
        if (isValidImageUrl(cu)) images.add(cu);
      }
    });
    const arr = [...images];
    return arr.slice(0, limit);
  }, { tries: 6, baseMs: 1500 });
}

async function getGoogleImages(query, limit = 6) {
  const viaAPI = await getGoogleImagesAPI(query, limit);
  if (viaAPI.length >= Math.min(3, limit)) return viaAPI.slice(0, limit);

  let viaScrape = await getGoogleImagesScrape(query, limit);
  if (viaScrape.length < 3) {
    const alt = query.replace(/diecast 2025/i, "").concat(" Hot Wheels mainline");
    const more = await getGoogleImagesScrape(alt, limit);
    viaScrape = [...new Set([...viaScrape, ...more])];
  }

  const merged = [...new Set([...viaAPI, ...viaScrape])];
  return merged.slice(0, limit);
}

// ===================== FANDOM SCRAPER =====================

async function getFandomList() {
  const url = "https://hotwheels.fandom.com/wiki/List_of_2025_Hot_Wheels";
  const { data } = await http.get(url);
  const $ = cheerio.load(data);
  const items = [];

  $("table.wikitable tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 3) return;
    let name = $(tds.eq(2)).text().trim() || $(tds.eq(1)).text().trim();
    name = name.replace(/^'\d{2} /, "");
    if (!name) return;
    let imageElement = $(tds).find("img");
    let imageUrl = imageElement.attr("data-src") || imageElement.attr("src") || "";
    if (imageUrl) imageUrl = cleanUrl(imageUrl.split("/revision")[0]);
    items.push({ name, imageUrl });
  });
  return items;
}

// ===================== MAIN SCRAPER =====================

async function scrapeHotWheels() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("✅ Conectado ao MongoDB");

    const base = await getFandomList();
    console.log(`🧩 Modelos encontrados: ${base.length}`);

    for (let i = START_INDEX; i < base.length; i++) {
      const item = base[i];
      const rawName = item.name;
      const name = sanitizeSearchQuery(rawName);
      console.log(`\n(${i + 1}/${base.length}) 🔎 ${name}`);

      const q = `${name} Hot Wheels diecast 2025`;
      const images = await getGoogleImages(q, 8);
      if (!images.length) console.warn(`⚠️ Sem imagens Google para: ${name}`);

      let cover = item.imageUrl;
      if (!isValidImageUrl(cover)) cover = images[0] || "https://via.placeholder.com/150";

      const update = {
        $set: {
          name: rawName,
          lowercaseName: rawName.toLowerCase(),
          imageUrl: cover,
          year: 2025,
        },
      };
      if (images.length) {
        update.$addToSet = { images: { $each: images } };
      }

      await HotWheel.updateOne(
        { lowercaseName: rawName.toLowerCase() },
        update,
        { upsert: true }
      );

      console.log(`✅ Salvo: ${name} | capa: ${cover} | +${images.length} imgs`);
      await sleep(2000 + Math.floor(Math.random() * 2000));
    }

    console.log("\n🔥 Finalizado com sucesso.");
  } catch (error) {
    console.error("❌ Erro geral:", error);
  } finally {
    mongoose.connection.close();
  }
}

scrapeHotWheels();
