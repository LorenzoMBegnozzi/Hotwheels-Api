const sharp = require('sharp');

// Configurações via env (com defaults) para tunning de performance
const IMG_SIZE = parseInt(process.env.RECOGNIZER_IMG_SIZE || '128', 10); // menor que 256 para acelerar
const BINS = parseInt(process.env.RECOGNIZER_BINS || '8', 10); // pode reduzir para 6

// Compute a 3D color histogram with BINS bins per channel and return a normalized Float32Array
async function computeHistogram(buffer) {
  const { data } = await sharp(buffer)
    .resize(IMG_SIZE, IMG_SIZE, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const binsPerChannel = BINS;
  const binSize = 256 / binsPerChannel;
  const histSize = binsPerChannel * binsPerChannel * binsPerChannel;
  const hist = new Float32Array(histSize); // inicia em zero

  for (let i = 0; i < data.length; i += 3) {
    const rBin = Math.min(binsPerChannel - 1, (data[i] / binSize) | 0);
    const gBin = Math.min(binsPerChannel - 1, (data[i + 1] / binSize) | 0);
    const bBin = Math.min(binsPerChannel - 1, (data[i + 2] / binSize) | 0);
    const idx = rBin * binsPerChannel * binsPerChannel + gBin * binsPerChannel + bBin;
    hist[idx]++;
  }

  // L2 Normalize
  let sumSq = 0;
  for (let i = 0; i < hist.length; i++) sumSq += hist[i] * hist[i];
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < hist.length; i++) hist[i] = hist[i] / norm;
  return hist;
}

// Fast cosine similarity (range [-1,1] but >0 for histograms)
function cosineSimilarity(histA, histB) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < histA.length; i++) {
    const a = histA[i];
    const b = histB[i];
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB) || 1;
  return dot / denom;
}

async function similarityFromBuffers(bufA, bufB) {
  const [hA, hB] = await Promise.all([computeHistogram(bufA), computeHistogram(bufB)]);
  return cosineSimilarity(hA, hB);
}

module.exports = { computeHistogram, cosineSimilarity, similarityFromBuffers };
