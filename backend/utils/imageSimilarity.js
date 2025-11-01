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

// Background normalization: convert near-white (or near a chosen color) pixels to pure white and optionally crop borders.
async function normalizeBackground(buffer) {
  const TARGET = (process.env.RECOGNIZER_BG_TARGET || 'white').toLowerCase();
  const THRESH = parseInt(process.env.RECOGNIZER_BG_THRESHOLD || '210', 10); // pixel >= THRESH considered background if white mode
  const ENABLE = (process.env.RECOGNIZER_BG_ENABLE || '1') === '1';
  if (!ENABLE) return buffer;
  // Work in raw RGB small size to modify quickly
  const WORK_SIZE = parseInt(process.env.RECOGNIZER_BG_WORK_SIZE || '256', 10);
  const { data, info } = await sharp(buffer)
    .resize(WORK_SIZE, WORK_SIZE, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width; const h = info.height;
  // Simple pass: mark near-white pixels
  for (let i=0;i<data.length;i+=3){
    const r=data[i], g=data[i+1], b=data[i+2];
    if (TARGET === 'white') {
      if (r>=THRESH && g>=THRESH && b>=THRESH){
        // set to uniform white
        data[i]=255; data[i+1]=255; data[i+2]=255;
      }
    }
  }
  // Optional border crop: detect first and last row with enough non-white pixels
  const MIN_ROW_PIXELS = parseInt(process.env.RECOGNIZER_BG_MIN_ROW_PIXELS || '30',10);
  function rowHasContent(y){
    let count=0; const base=y*w*3;
    for(let x=0;x<w;x++){ const idx=base+x*3; const r=data[idx]; const g=data[idx+1]; const b=data[idx+2]; if(!(r>250 && g>250 && b>250)){ count++; if(count>=MIN_ROW_PIXELS) return true; } }
    return false;
  }
  let top=0; while(top<h-1 && !rowHasContent(top)) top++;
  let bottom=h-1; while(bottom>top && !rowHasContent(bottom)) bottom--;
  // Similar for columns
  function colHasContent(x){
    let count=0; const base=x*3;
    for(let y=0;y<h;y++){ const idx=y*w*3+base; const r=data[idx]; const g=data[idx+1]; const b=data[idx+2]; if(!(r>250 && g>250 && b>250)){ count++; if(count>=MIN_ROW_PIXELS) return true; } }
    return false;
  }
  let left=0; while(left<w-1 && !colHasContent(left)) left++;
  let right=w-1; while(right>left && !colHasContent(right)) right--;
  const cropWidth = right-left+1; const cropHeight = bottom-top+1;
  const cropped = await sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 3 } })
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .jpeg({ quality: 90 })
    .toBuffer();
  return cropped;
}

// Average Hash (aHash) for perceptual similarity: resize grayscale small (8x8), threshold by mean.
async function computeAHash(buffer) {
  const SIZE = parseInt(process.env.RECOGNIZER_AHASH_SIZE || '8', 10); // 8 -> 64 bits
  const { data } = await sharp(buffer)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Compute mean
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const mean = sum / data.length;
  // Build bits: 1 if pixel >= mean else 0
  let hashBigInt = 0n;
  for (let i = 0; i < data.length; i++) {
    hashBigInt <<= 1n;
    if (data[i] >= mean) hashBigInt |= 1n;
  }
  return { hash: hashBigInt, bits: data.length };
}

function ahashSimilarity(a, b) {
  if (!a || !b || a.bits !== b.bits) return 0;
  const xor = a.hash ^ b.hash;
  // Count differing bits
  let diff = 0;
  let x = xor;
  while (x) { x &= (x - 1n); diff++; }
  const distance = diff; // Hamming distance
  return 1 - distance / a.bits; // normalize to [0,1]
}

// Difference Hash (dHash): captures gradients horizontally.
async function computeDHash(buffer) {
  const SIZE = parseInt(process.env.RECOGNIZER_DHASH_SIZE || '8', 10); // results in SIZE* (SIZE+1) bits
  const width = SIZE + 1;
  const height = SIZE;
  const { data } = await sharp(buffer)
    .resize(width, height, { fit: 'cover' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let hash = 0n;
  let bitCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < SIZE; x++) {
      const left = data[y * width + x];
      const right = data[y * width + x + 1];
      hash <<= 1n;
      if (left < right) hash |= 1n; // direction of gradient
      bitCount++;
    }
  }
  return { hash, bits: bitCount };
}

function dhashSimilarity(a, b) {
  if (!a || !b || a.bits !== b.bits) return 0;
  const xor = a.hash ^ b.hash;
  let diff = 0;
  let x = xor;
  while (x) { x &= (x - 1n); diff++; }
  return 1 - diff / a.bits;
}

// Edge histogram using simple Sobel filters to capture structure invariant to color.
async function computeEdgeHistogram(buffer) {
  const SIZE = parseInt(process.env.RECOGNIZER_EDGE_SIZE || '64', 10); // downscale for speed
  const { data, info } = await sharp(buffer)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  // Sobel kernels
  const gx = [-1,0,1,-2,0,2,-1,0,1];
  const gy = [-1,-2,-1,0,0,0,1,2,1];
  const bins = new Float32Array(8); // 8 directional bins
  for (let y=1; y<h-1; y++) {
    for (let x=1; x<w-1; x++) {
      let sumX=0, sumY=0, k=0;
      for (let ky=-1; ky<=1; ky++) {
        for (let kx=-1; kx<=1; kx++) {
          const val = data[(y+ky)*w + (x+kx)];
          sumX += val * gx[k];
          sumY += val * gy[k];
          k++;
        }
      }
      const mag = Math.sqrt(sumX*sumX + sumY*sumY);
      if (mag < 20) continue; // ignore weak edges
      let angle = Math.atan2(sumY, sumX); // -PI..PI
      if (angle < 0) angle += Math.PI * 2;
      const bin = Math.min(7, Math.floor((angle / (Math.PI*2)) * 8));
      bins[bin] += 1;
    }
  }
  // Normalize bins L2
  let norm=0; for (let i=0;i<bins.length;i++) norm+=bins[i]*bins[i]; norm = Math.sqrt(norm)||1;
  for (let i=0;i<bins.length;i++) bins[i] = bins[i]/norm;
  return bins;
}

function edgeSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot=0, nA=0, nB=0;
  for (let i=0;i<a.length;i++){ dot+=a[i]*b[i]; nA+=a[i]*a[i]; nB+=b[i]*b[i]; }
  const denom = Math.sqrt(nA)*Math.sqrt(nB) || 1;
  return dot/denom;
}

async function computeFeatures(buffer) {
  const pre = await normalizeBackground(buffer);
  const [hist, ahash, dhash, edgeHist] = await Promise.all([
    computeHistogram(pre),
    computeAHash(pre),
    computeDHash(pre),
    computeEdgeHistogram(pre)
  ]);
  return { hist, ahash, dhash, edgeHist };
}

function combinedSimilarity(queryFeatures, candidateFeatures) {
  const colorSim = cosineSimilarity(queryFeatures.hist, candidateFeatures.hist);
  const aHashSim = ahashSimilarity(queryFeatures.ahash, candidateFeatures.ahash);
  const dHashSim = dhashSimilarity(queryFeatures.dhash, candidateFeatures.dhash);
  const edgeSim  = edgeSimilarity(queryFeatures.edgeHist, candidateFeatures.edgeHist);
  const colorWeight = parseFloat(process.env.RECOGNIZER_COLOR_WEIGHT || '0.2');
  const aHashWeight = parseFloat(process.env.RECOGNIZER_AHASH_WEIGHT || '0.4');
  const dHashWeight = parseFloat(process.env.RECOGNIZER_DHASH_WEIGHT || '0.4');
  const edgeWeight  = parseFloat(process.env.RECOGNIZER_EDGE_WEIGHT  || '0.3');
  return colorSim * colorWeight + aHashSim * aHashWeight + dHashSim * dHashWeight + edgeSim * edgeWeight;
}

module.exports = { computeHistogram, cosineSimilarity, similarityFromBuffers, computeAHash, ahashSimilarity, computeDHash, dhashSimilarity, computeEdgeHistogram, edgeSimilarity, computeFeatures, combinedSimilarity };
