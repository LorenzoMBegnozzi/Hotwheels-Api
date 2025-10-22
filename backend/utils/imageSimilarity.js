const sharp = require('sharp');

// Compute a 3D color histogram with 8 bins per channel and return a normalized Float32Array
async function computeHistogram(buffer) {
  // Resize to 256x256 for consistency similar to Python version
  const { data, info } = await sharp(buffer)
    .resize(256, 256, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const binsPerChannel = 8;
  const binSize = 256 / binsPerChannel; // 32
  const histSize = binsPerChannel * binsPerChannel * binsPerChannel; // 512
  const hist = new Array(histSize).fill(0);

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const rBin = Math.min(binsPerChannel - 1, Math.floor(r / binSize));
    const gBin = Math.min(binsPerChannel - 1, Math.floor(g / binSize));
    const bBin = Math.min(binsPerChannel - 1, Math.floor(b / binSize));
    const idx = rBin * binsPerChannel * binsPerChannel + gBin * binsPerChannel + bBin;
    hist[idx] += 1;
  }

  // Normalize (L2)
  const norm = Math.sqrt(hist.reduce((sum, v) => sum + v * v, 0)) || 1;
  for (let i = 0; i < hist.length; i++) hist[i] = hist[i] / norm;
  return hist;
}

// Correlation similarity similar to OpenCV HISTCMP_CORREL
function correlationSimilarity(histA, histB) {
  let meanA = 0, meanB = 0;
  const n = histA.length;
  for (let i = 0; i < n; i++) { meanA += histA[i]; meanB += histB[i]; }
  meanA /= n; meanB /= n;
  let num = 0, denomA = 0, denomB = 0;
  for (let i = 0; i < n; i++) {
    const a = histA[i] - meanA;
    const b = histB[i] - meanB;
    num += a * b;
    denomA += a * a;
    denomB += b * b;
  }
  const denom = Math.sqrt(denomA * denomB) || 1;
  return num / denom; // [-1,1]
}

async function similarityFromBuffers(bufA, bufB) {
  const [hA, hB] = await Promise.all([computeHistogram(bufA), computeHistogram(bufB)]);
  return correlationSimilarity(hA, hB);
}

module.exports = { computeHistogram, correlationSimilarity, similarityFromBuffers };
