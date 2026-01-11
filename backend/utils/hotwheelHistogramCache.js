const axios = require('axios');
const HotWheel = require('../models/HotWheel');
const { computeFeatures } = require('./imageSimilarity');

function trimTrailingSlashes(s) {
  return String(s || '').replace(/\/+$/, '');
}

function resolveImageUrl(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) {
    const base = trimTrailingSlashes(
      process.env.PUBLIC_BASE_URL ||
      process.env.API_PUBLIC_URL ||
      process.env.BACKEND_URL ||
      'http://localhost:5000'
    );
    return `${base}${s}`;
  }
  return s;
}

let cache = null; // { generatedAt: Date, items: [ { id,name,imageUrl,sourceImage,hist,ahash,dhash,edgeHist } ] }
let inFlight = null;
const MAX_AGE_MS = 1000 * 60 * 10; // 10 minutos

async function buildCache() {
  const hotwheels = await HotWheel.find({}, { name: 1, imageUrl: 1, images: 1 });
  const items = [];
  const concurrency = parseInt(process.env.RECOGNIZER_CACHE_CONCURRENCY || '5', 10);
  let index = 0;

  async function worker() {
    while (index < hotwheels.length) {
      const hw = hotwheels[index++];
      // Constrói lista de imagens candidatos (usa images se existir, senão fallback para imageUrl)
      const candidateImages = Array.isArray(hw.images) && hw.images.length > 0 ? hw.images : (hw.imageUrl ? [hw.imageUrl] : []);
      for (const imgUrl of candidateImages) {
        const resolved = resolveImageUrl(imgUrl);
        if (!resolved) continue;
        try {
          const resp = await axios.get(resolved, { responseType: 'arraybuffer', timeout: 7000 });
          const feats = await computeFeatures(Buffer.from(resp.data));
          items.push({ id: hw._id.toString(), name: hw.name, imageUrl: hw.imageUrl, sourceImage: resolved, hist: feats.hist, ahash: feats.ahash, dhash: feats.dhash, edgeHist: feats.edgeHist });
        } catch (e) {
          // ignora falha individual
        }
      }
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) workers.push(worker());
  await Promise.all(workers);

  cache = { generatedAt: Date.now(), items };
  return cache;
}

async function getCache(force = false) {
  const isStale = !cache || (Date.now() - cache.generatedAt) > MAX_AGE_MS;
  if (force || isStale) {
    if (!inFlight) {
      inFlight = buildCache().finally(() => { inFlight = null; });
    }
    return inFlight;
  }
  return cache;
}

module.exports = { getCache };
