const axios = require('axios');
const HotWheel = require('../models/HotWheel');
const { computeFeatures } = require('./imageSimilarity');

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
        if (!imgUrl) continue;
        try {
          const resp = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 7000 });
          const feats = await computeFeatures(Buffer.from(resp.data));
          items.push({ id: hw._id.toString(), name: hw.name, imageUrl: hw.imageUrl, sourceImage: imgUrl, hist: feats.hist, ahash: feats.ahash, dhash: feats.dhash, edgeHist: feats.edgeHist });
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
