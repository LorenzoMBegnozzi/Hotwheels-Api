const sharp = require('sharp');
const { createWorker } = require('tesseract.js');


let workerPromise = null;
let workerInitError = null;
async function getWorker() {
    if (workerInitError) throw workerInitError;
    if (!workerPromise) {
        workerPromise = (async () => {
            const envLang = String(process.env.OCR_LANG || 'eng');
            const langs = envLang.replace(/[,]/g, '+');
            const verbose = process.env.OCR_VERBOSE === '1';
            try {
                const w = await createWorker({
                    logger: (m) => { if (verbose) console.log('[OCR]', m); }
                });
                await w.loadLanguage(langs);
                await w.initialize(langs);
                return w;
            } catch (err) {
                workerInitError = err;
                console.error('[OCR] Falha ao inicializar worker:', err);
                throw err;
            }
        })();
    }
    return workerPromise;
}

// Pré-processamento avançado: grayscale, normalização, resize, contraste, threshold, dilatação opcional.
async function preprocess(buffer, variant = 'base') {
    let pipeline = sharp(buffer).grayscale().normalize();
    const meta = await pipeline.metadata();
    if ((meta.width || 0) < 600) {
        pipeline = pipeline.resize(800, null, { fit: 'inside' });
    }
    if (variant === 'sharpen') {
        pipeline = pipeline.sharpen();
    }
    if (variant === 'contrast') {
        // Aumenta contraste via linear + clahe simples (simulado)
        pipeline = pipeline.linear(1.2, -20);
    }
    if (variant === 'edge') {
        // Filtro Laplaciano simples para destacar relevo
        pipeline = pipeline.convolve({
            width: 3,
            height: 3,
            kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0]
        });
    }
    if (variant === 'emboss') {
        pipeline = pipeline.convolve({
            width: 3,
            height: 3,
            kernel: [-2,-1,0,-1,1,1,0,1,2]
        });
    }
    const raw = await pipeline.raw().toBuffer({ resolveWithObject: true });
    const data = raw.data;
    if ((process.env.OCR_THRESHOLD_ENABLE || '1') === '1') {
        const thresh = parseInt(process.env.OCR_THRESHOLD_VALUE || '150', 10);
        for (let i = 0; i < data.length; i++) {
            data[i] = data[i] > thresh ? 255 : 0;
        }
    }
    // Inversão condicional para baixo relevo claro sobre fundo claro
    if ((process.env.OCR_INVERT_IF_LIGHT || '1') === '1') {
        // Mede média: se muito clara, inverte
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        if (avg > parseInt(process.env.OCR_INVERT_THRESHOLD || '200', 10)) {
            for (let i = 0; i < data.length; i++) data[i] = 255 - data[i];
        }
    }
    // Dilatação simples para “engrossar” caracteres se habilitado
    if ((process.env.OCR_DILATE || '0') === '1') {
        // Kernel 3x3; para canal único basta checar vizinhos
        const w = raw.info.width;
        const h = raw.info.height;
        const dilated = Buffer.from(data);
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                let max = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const idx = (y + dy) * w + (x + dx);
                        if (data[idx] > max) max = data[idx];
                    }
                }
                dilated[y * w + x] = max;
            }
        }
        return sharp(Buffer.from(dilated), { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
    }
    return sharp(Buffer.from(data), { raw: { width: raw.info.width, height: raw.info.height, channels: 1 } })
        .png()
        .toBuffer();
}

async function extractText(buffer) {
    try {
        const worker = await getWorker();
        // Whitelist agora inclui maiúsculas e minúsculas por padrão
        const whitelist = process.env.OCR_WHITELIST || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789()&- ';
        const forceUpper = (process.env.OCR_UPPERCASE || '0') === '1';
        const multiPass = parseInt(process.env.OCR_MULTI_PASS || '2', 10); // número de variantes
        // Seta parâmetros (brancos e números + alguns sinais)
        try {
            await worker.setParameters({
                tessedit_char_whitelist: whitelist,
            });
        } catch (e) {
            console.warn('[OCR] setParameters falhou:', e.message);
        }
            const variants = ['base'];
            if (multiPass >= 2) variants.push('sharpen');
            if (multiPass >= 3) variants.push('contrast');
            if ((process.env.OCR_LOW_CONTRAST_MODE || '0') === '1') { // padrão agora desativado
                variants.push('edge');
                variants.push('emboss');
            }
            const texts = [];
            const debugVariants = (process.env.OCR_DEBUG_VARIANTS || '0') === '1';
            for (const v of variants) {
                const pre = await preprocess(buffer, v);
                const { data: { text } } = await worker.recognize(pre);
                texts.push({ variant: v, text });
            }
        // Combina textos: escolhe o que tiver mais caracteres válidos do whitelist
            const scored = texts.map(obj => {
                const valid = (obj.text.match(new RegExp('[' + whitelist.replace(/[-\\]/g, r=>'\\'+r) + ']', 'g')) || []).length;
                return { t: obj.text, variant: obj.variant, valid };
            });
            scored.sort((a,b)=> b.valid - a.valid);
            let best = scored.length ? scored[0].t : '';
            if (forceUpper) best = best.toUpperCase();
            return {
                raw: best,
                cleaned: cleanText(best, forceUpper),
                error: null,
                passes: texts.length,
                ...(debugVariants && { variants: scored })
            };
    } catch (e) {
        return { raw: '', cleaned: '', error: e.message || 'Falha OCR', passes: 0 };
    }
}

// Clean OCR text: remove extra whitespace, common noise chars
function cleanText(raw, upperApplied) {
    if (!raw) return '';
    const pattern = upperApplied ? /[^A-Z0-9&()\- ]+/g : /[^A-Za-z0-9&()\- ]+/g;
    return raw
        .replace(/\r?\n+/g, ' ')
        .replace(pattern, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function findYear(text) {
    const match = text.match(/(19|20)\d{2}/);
    return match ? parseInt(match[0], 10) : null;
}

// Basic Levenshtein distance
function levenshtein(a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }
    return dp[m][n];
}

function similarityRatio(a, b) {
    if (!a || !b) return 0;
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length) || 1;
    return 1 - dist / maxLen; // 1 identical, 0 worst
}

module.exports = { extractText, cleanText, findYear, similarityRatio };
