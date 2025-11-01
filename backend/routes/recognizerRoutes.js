const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const RecognizerImage = require('../models/RecognizerImage');
const HotWheel = require('../models/HotWheel');
const { computeHistogram, cosineSimilarity, computeFeatures, combinedSimilarity } = require('../utils/imageSimilarity');
const { getCache } = require('../utils/hotwheelHistogramCache');
const { extractText, cleanText, findYear, similarityRatio } = require('../utils/textOcr');

const router = express.Router();

// Pasta não é mais necessária (usamos memoryStorage e não salvamos arquivos)

// Use memory storage so uploaded image is NOT persisted to disk.
// Isto atende a requisição: não salvar a imagem enviada no servidor.
const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage });

// POST /api/recognizer/cadastrar
// Cadastro mantém apenas o nome (sem armazenar a imagem). Pode ser removido se não fizer sentido.
router.post('/cadastrar', upload.single('file'), async (req, res) => {
  try {
    console.log('[Recognizer] /cadastrar recebida');
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ status: 'erro', mensagem: 'Nome é obrigatório' });
    if (!req.file) return res.status(400).json({ status: 'erro', mensagem: 'Arquivo não enviado' });

    // Previously this saved a file to disk and persisted path. Requirement: do not save file.
    // If still need to register something, we can persist only the name and a timestamp.
    const created = await RecognizerImage.create({ name: nome, filePath: 'memory' });
    return res.json({ status: 'ok', mensagem: `Imagem ${nome} cadastrada (não salva em disco)`, id: created._id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: 'erro', mensagem: 'Falha ao cadastrar' });
  }
});

// Helper to load buffer from local path under backend
async function loadLocal(relPath) {
  const abs = path.join(__dirname, '..', relPath);
  return fs.promises.readFile(abs);
}

// POST /api/recognizer/reconhecer
// Reconhecimento usando buffer em memória; nada é gravado em disco.
router.post('/reconhecer', upload.single('file'), async (req, res) => {
  try {
    console.log('[Recognizer] /reconhecer recebida');
    if (!req.file) return res.status(400).json({ status: 'erro', mensagem: 'Arquivo não enviado', top3: [] });
    // Debug detalhado para verificar se ainda há path sendo criado
    console.log('[Recognizer] File keys:', Object.keys(req.file));
    console.log('[Recognizer] File info => originalname:', req.file.originalname, 'mimetype:', req.file.mimetype, 'size:', req.file.size);
    if (req.file.path) {
      console.warn('[Recognizer][WARN] req.file.path existe. Isso indica uso de diskStorage em algum lugar. Valor:', req.file.path);
    } else {
      console.log('[Recognizer] Sem req.file.path (OK - memória).');
    }
    const queryBuffer = req.file.buffer; // already in memory
  const queryFeatures = await computeFeatures(queryBuffer);
    console.log('[Recognizer] Histograma da imagem query calculado (memória)');
    const cache = await getCache();
    console.log(`[Recognizer] Cache carregado com ${cache.items.length} itens`);
    // Pré-filtragem por cor (opcional) usando apenas histogramas
    const PREFILTER_ENABLE = (process.env.RECOGNIZER_COLOR_PREFILTER_ENABLE || '0') === '1';
    const PREFILTER_TOP = parseInt(process.env.RECOGNIZER_COLOR_PREFILTER_TOP || '60', 10); // máximo de imagens candidatas após filtro
    const PREFILTER_THRESHOLD = parseFloat(process.env.RECOGNIZER_COLOR_PREFILTER_THRESHOLD || '0'); // se >0, exige similaridade mínima
    let candidateItems = cache.items;
    if (PREFILTER_ENABLE) {
      const scored = [];
      for (const item of cache.items) {
        try {
          const colorSimOnly = cosineSimilarity(queryFeatures.hist, item.hist);
          if (colorSimOnly >= PREFILTER_THRESHOLD) {
            scored.push({ item, colorSimOnly });
          }
        } catch(_) {}
      }
      scored.sort((a,b)=> b.colorSimOnly - a.colorSimOnly);
      candidateItems = scored.slice(0, PREFILTER_TOP).map(s => s.item);
      console.log(`[Recognizer] Pré-filtro cor ativo. Restaram ${candidateItems.length} imagens de ${cache.items.length}.`);
    }

    // Agrupa por id de HotWheel escolhendo melhor similaridade entre várias imagens (após pré-filtro)
    const bestByCar = new Map();
    const debugMode = req.query.debug === '1';
    const rawComparisons = [];
  for (const item of candidateItems) {
      try {
        const colorSim = cosineSimilarity(queryFeatures.hist, item.hist);
        const aHashSim = require('../utils/imageSimilarity').ahashSimilarity(queryFeatures.ahash, item.ahash);
        const dHashSim = require('../utils/imageSimilarity').dhashSimilarity(queryFeatures.dhash, item.dhash);
        const edgeSim  = require('../utils/imageSimilarity').edgeSimilarity(queryFeatures.edgeHist, item.edgeHist);
        const similarity = combinedSimilarity(queryFeatures, item); // [0,1] combinada
        const existing = bestByCar.get(item.id);
        if (!existing || similarity > existing.similaridade) {
          bestByCar.set(item.id, {
            id: item.id,
            nome: item.name,
            url: item.imageUrl,
            sourceImage: item.sourceImage,
            similaridade: Number(similarity.toFixed(3)),
            diferenca: Number((1 - similarity).toFixed(3)),
            ...(debugMode && { comps: { color: Number(colorSim.toFixed(3)), aHash: Number(aHashSim.toFixed(1)), dHash: Number(dHashSim.toFixed(3)), edge: Number(edgeSim.toFixed(3)) } })
          });
        }
        if (debugMode) {
          rawComparisons.push({ id: item.id, nome: item.name, sourceImage: item.sourceImage, similarity: Number(similarity.toFixed(4)), color: Number(colorSim.toFixed(4)), aHash: Number(aHashSim.toFixed(4)), dHash: Number(dHashSim.toFixed(4)), edge: Number(edgeSim.toFixed(4)) });
        }
      } catch (_) { /* ignore */ }
    }
    const aggregated = Array.from(bestByCar.values());
    aggregated.sort((a, b) => b.similaridade - a.similaridade);
    const threshold = parseFloat(process.env.RECOGNIZER_THRESHOLD || '0.6');
    let top5 = aggregated.filter(r => r.similaridade >= threshold).slice(0, 5);
    if (top5.length === 0) {
      // fallback: retorna os 5 melhores mesmo abaixo do threshold
      top5 = aggregated.slice(0,5);
    }

    console.log(`[Recognizer] Reconhecimento concluído. Top5 length: ${top5.length}`);
    return res.json({
      status: top5.length ? 'ok' : 'erro',
      mensagem: top5.length ? 'Os 5 carrinhos mais parecidos foram encontrados' : 'Nenhum carrinho parecido encontrado',
      top5,
      ...(debugMode && { debugTotal: aggregated.length, raw: rawComparisons.slice(0, 50) })
    });
  } catch (e) {
    console.error('[Recognizer] Erro interno /reconhecer:', e);
    return res.status(500).json({ status: 'erro', mensagem: e.message, stack: e.stack, top3: [] });
  }
});

// POST /api/recognizer/text - reconhece por texto (foto da parte de baixo)
router.post('/text', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ status: 'erro', mensagem: 'Arquivo não enviado', top3: [] });
    const buffer = req.file.buffer;
    const { raw, cleaned } = await extractText(buffer);
    const year = findYear(cleaned);
    console.log('[OCR] Texto bruto:', raw);
    console.log('[OCR] Texto limpo:', cleaned, 'Ano detectado:', year);
    // Obter todos HotWheels
    const hotwheels = await HotWheel.find({}, { name: 1, year: 1, imageUrl: 1 });
    const candidates = [];
    for (const hw of hotwheels) {
      // Se ano detectado existe e diverge muito, penaliza
      let baseScore = similarityRatio(cleaned, hw.name);
      if (year && hw.year) {
        if (year === hw.year) {
          baseScore += 0.05; // pequeno boost
        } else if (Math.abs(year - hw.year) >= 2) {
          baseScore -= 0.1; // penaliza diferença grande
        }
      }
      candidates.push({ id: hw._id.toString(), nome: hw.name, ano: hw.year, url: hw.imageUrl, score: Number(baseScore.toFixed(3)) });
    }
    candidates.sort((a,b)=> b.score - a.score);
    const top3 = candidates.slice(0,3);
    return res.json({ status: top3.length ? 'ok' : 'erro', mensagem: top3.length ? 'Top 3 por texto' : 'Nenhum encontrado', texto: cleaned, textoBruto: raw, anoDetectado: year, top3 });
  } catch (e) {
    console.error('[OCR] Erro /text:', e);
    return res.status(500).json({ status: 'erro', mensagem: e.message, top3: [] });
  }
});

// GET /api/recognizer/listar
router.get('/listar', async (_req, res) => {
  try {
    const imagens = await RecognizerImage.find().sort({ createdAt: -1 });
    res.json({ status: 'ok', total: imagens.length, imagens });
  } catch (e) {
    res.status(500).json({ status: 'erro', mensagem: 'Falha ao listar' });
  }
});

module.exports = router;
