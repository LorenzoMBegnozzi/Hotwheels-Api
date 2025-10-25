const axios = require('axios');
const HotWheel = require('../models/HotWheel');
const { computeHistogram } = require('./imageSimilarity');

let cache = null; // { generatedAt: Date, items: [ { id,name,imageUrl,hist } ] }
let inFlight = null;
const MAX_AGE_MS = 1000 * 60 * 10; // 10 minutos

async function buildCache() {
  const hotwheels = await HotWheel.find({}, { name: 1, imageUrl: 1 });
  const items = [];
  const concurrency = parseInt(process.env.RECOGNIZER_CACHE_CONCURRENCY || '5', 10);
  let index = 0;

  async function worker() {
    while (index < hotwheels.length) {
      const hw = hotwheels[index++];
      if (!hw.imageUrl) continue;
      try {
        const resp = await axios.get(hw.imageUrl, { responseType: 'arraybuffer', timeout: 7000 });
        const hist = await computeHistogram(Buffer.from(resp.data));
        items.push({ id: hw._id.toString(), name: hw.name, imageUrl: hw.imageUrl, hist });
      } catch (e) {
        // ignora falha individual
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
