const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const RecognizerImage = require('../models/RecognizerImage');
const HotWheel = require('../models/HotWheel');
const { similarityFromBuffers, computeHistogram, correlationSimilarity } = require('../utils/imageSimilarity');
const { getCache } = require('../utils/hotwheelHistogramCache');

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
    const queryHist = await computeHistogram(queryBuffer);
    console.log('[Recognizer] Histograma da imagem query calculado (memória)');
    const cache = await getCache();
    console.log(`[Recognizer] Cache carregado com ${cache.items.length} itens`);
    const results = [];
    for (const item of cache.items) {
      try {
        const sim = correlationSimilarity(queryHist, item.hist); // [-1,1]
        const similarity = (sim + 1) / 2;
        results.push({
          id: item.id,
          nome: item.name,
          url: item.imageUrl,
          similaridade: Number(similarity.toFixed(3)),
          diferenca: Number((1 - similarity).toFixed(3))
        });
      } catch (_) { /* ignore */ }
    }

    results.sort((a, b) => b.similaridade - a.similaridade);
    const top3 = results.filter(r => r.similaridade > 0.4).slice(0, 3);

    console.log(`[Recognizer] Reconhecimento concluído. Top3 length: ${top3.length}`);
    return res.json({
      status: top3.length ? 'ok' : 'erro',
      mensagem: top3.length ? 'As 3 imagens mais parecidas foram encontradas' : 'Nenhuma imagem parecida encontrada',
      top3
    });
  } catch (e) {
    console.error('[Recognizer] Erro interno /reconhecer:', e);
    return res.status(500).json({ status: 'erro', mensagem: e.message, stack: e.stack, top3: [] });
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
