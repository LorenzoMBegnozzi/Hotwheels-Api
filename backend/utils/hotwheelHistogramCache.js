const axios = require('axios');
const HotWheel = require('../models/HotWheel');
const { computeHistogram } = require('./imageSimilarity');

let cache = null; // { generatedAt: Date, items: [ { id,name,imageUrl,hist } ] }
let inFlight = null;
const MAX_AGE_MS = 1000 * 60 * 10; // 10 minutos

async function buildCache() {
  const hotwheels = await HotWheel.find({}, { name: 1, imageUrl: 1 });
  const items = [];
  for (const hw of hotwheels) {
    if (!hw.imageUrl) continue;
    try {
      const resp = await axios.get(hw.imageUrl, { responseType: 'arraybuffer', timeout: 7000 });
      const hist = await computeHistogram(Buffer.from(resp.data));
      items.push({ id: hw._id.toString(), name: hw.name, imageUrl: hw.imageUrl, hist });
    } catch (e) {
      // ignora falha individual
    }
  }
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
