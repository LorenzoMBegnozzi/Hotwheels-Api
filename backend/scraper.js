const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");
const pLimit = require("p-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const HotWheel = require("./models/HotWheel");
require("dotenv").config();

const mongoUri =
  process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL;

if (!mongoUri) {
  console.error(
    "❌ MongoDB URI não definida. Configure MONGODB_URI (recomendado) ou MONGO_URI."
  );
  process.exit(1);
}

mongoose
  .connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Conectado ao MongoDB"))
  .catch((err) => console.error("❌ Erro ao conectar ao MongoDB:", err));

const BASE = "https://universohotwheels.com.br";
const START_URL = `${BASE}/colecoes/`;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function cleanText(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}
function cleanUrl(url) {
  return url ? url.replace(/\s/g, "") : url;
}

function nowISO() {
  return new Date().toISOString();
}
function msToHuman(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}h ${m}m ${s}s`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

// ===== download local (igual sua ideia do fandom) =====
function slugifyFilename(value) {
  const s = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || "hotwheel";
}

function guessFileExt({ contentType, url }) {
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("image/jpeg")) return ".jpg";
  if (ct.includes("image/png")) return ".png";
  if (ct.includes("image/webp")) return ".webp";
  if (ct.includes("image/gif")) return ".gif";

  try {
    const u = new URL(url);
    const pathname = u.pathname || "";
    const m = pathname.match(/\.(jpg|jpeg|png|webp|gif)$/i);
    if (m) return m[0].toLowerCase() === ".jpeg" ? ".jpg" : m[0].toLowerCase();
  } catch (_) {}

  return ".jpg";
}

async function downloadAndSaveImage({ imageUrl, year, name }) {
  const url = String(imageUrl || "").trim();
  if (!url) return { ok: false };

  const safeYear = Number(year);
  if (!Number.isFinite(safeYear)) return { ok: false, reason: "Ano inválido" };

  const subdir = path.join(__dirname, "uploads", "hotwheels", String(safeYear));
  await fs.promises.mkdir(subdir, { recursive: true });

  const hash = crypto.createHash("md5").update(url).digest("hex").slice(0, 10);
  const baseName = `${slugifyFilename(name)}-${hash}`;

  try {
    const resp = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: BASE,
      },
      maxContentLength: 25 * 1024 * 1024,
      maxBodyLength: 25 * 1024 * 1024,
      validateStatus: (s) => s >= 200 && s < 300,
    });

    const ext = guessFileExt({
      contentType: resp.headers?.["content-type"],
      url,
    });

    const fileName = `${baseName}${ext}`;
    const absPath = path.join(subdir, fileName);

    if (!fs.existsSync(absPath)) {
      await fs.promises.writeFile(absPath, Buffer.from(resp.data));
    }

    const publicPath = `/uploads/hotwheels/${safeYear}/${fileName}`;
    return { ok: true, publicPath };
  } catch (e) {
    return { ok: false, error: e };
  }
}

// ===== Relatório / métricas =====
function createEmptyCategoryStats(name, url) {
  return {
    name,
    url,
    startedAt: null,
    finishedAt: null,
    durationMs: 0,

    pagesDetected: 0,
    productLinksUnique: 0,

    processed: 0,
    inserted: 0,
    updated: 0,
    skippedNoName: 0,
    skippedNoYear: 0,
    failed: 0,

    failures: [],
  };
}

function classifyError(e) {
  const code = e?.code;
  const status = e?.response?.status;
  const msg = e?.message || String(e);

  if (status === 429) return { key: "HTTP_429", label: "HTTP 429 (rate limit)" };
  if (status === 403) return { key: "HTTP_403", label: "HTTP 403 (forbidden)" };
  if (status === 404) return { key: "HTTP_404", label: "HTTP 404 (not found)" };
  if (status >= 500) return { key: "HTTP_5XX", label: `HTTP ${status} (server)` };

  if (code === "ECONNABORTED") return { key: "TIMEOUT", label: "Timeout" };
  if (code === "ENOTFOUND") return { key: "DNS", label: "DNS/ENOTFOUND" };
  if (code === "ECONNRESET") return { key: "CONN_RESET", label: "Connection reset" };
  if (code) return { key: `AXIOS_${code}`, label: `Axios ${code}` };

  if (/cheerio|parse|parsing/i.test(msg)) return { key: "PARSING", label: "Parsing/HTML" };

  return { key: "UNKNOWN", label: "Unknown" };
}

function createRunReport() {
  return {
    startedAt: nowISO(),
    finishedAt: null,
    durationMs: 0,

    config: {
      base: BASE,
      startUrl: START_URL,
      userAgent: USER_AGENT,
      concurrency: {
        categories: 2,
        products: 6,
      },
    },

    totals: {
      categoriesFound: 0,
      productLinksUnique: 0,
      processed: 0,
      inserted: 0,
      updated: 0,
      skippedNoName: 0,
      skippedNoYear: 0,
      failed: 0,
      errorTypes: {},
    },

    categories: {},
    failures: [],
  };
}

function inc(obj, key, by = 1) {
  obj[key] = (obj[key] || 0) + by;
}

// ===== HTTP =====
async function fetchHtml(url) {
  const { data } = await axios.get(url, {
    headers: { "User-Agent": USER_AGENT, Referer: BASE },
    timeout: 30000,
  });
  return data;
}

function pickImageUrl($img) {
  const dataSrc = $img.attr("data-src");
  const src = $img.attr("src");
  const srcset = $img.attr("srcset") || $img.attr("data-srcset");

  // pega o maior do srcset (geralmente o último)
  if (srcset) {
    const parts = srcset.split(",").map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    const url = last?.split(" ")[0];
    if (url) return cleanUrl(url);
  }

  return cleanUrl(dataSrc || src || "");
}

function parseMaxPage($) {
  const nums = [];
  $("ul.page-numbers li, nav.woocommerce-pagination li").each((_, el) => {
    const t = cleanText($(el).text());
    const n = Number(t);
    if (Number.isFinite(n)) nums.push(n);
  });
  return nums.length ? Math.max(...nums) : 1;
}

/**
 * 1) Busca todas as categorias a partir do /colecoes/
 */
async function getCategoryLinks() {
  const html = await fetchHtml(START_URL);
  const $ = cheerio.load(html);

  const IGNORE_SLUGS = new Set([
    "todos",
    "recem-chegados-2",
    "mais-procurados",
    "ofertas",
    "destaques",
  ]);

  const links = new Map();

  $("a[href^='https://universohotwheels.com.br/categoria-produto/']").each((_, a) => {
    const href = cleanUrl($(a).attr("href"));
    if (!href) return;

    const slug = href.split("/categoria-produto/")[1]?.split("/")[0];
    if (!slug || IGNORE_SLUGS.has(slug)) return;

    let name = cleanText($(a).text());
    if (!name) {
      name = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    links.set(href, name);
  });

  const categories = [...links.entries()].map(([url, name]) => ({ url, name }));
  console.log(`📚 Categorias válidas encontradas: ${categories.length}`);
  return categories;
}

/**
 * 2) Numa categoria, pega todos os links de produtos (com paginação)
 */
async function getProductLinksFromCategory(categoryUrl) {
  const firstHtml = await fetchHtml(categoryUrl);
  const $first = cheerio.load(firstHtml);

  const maxPage = parseMaxPage($first);
  const productUrls = new Set();

  function collect($) {
    $("li.product a[href*='/product-page/']").each((_, a) => {
      const href = cleanUrl($(a).attr("href"));
      if (href) productUrls.add(href);
    });

    if (productUrls.size === 0) {
      $("a[href*='/product-page/']").each((_, a) => {
        const href = cleanUrl($(a).attr("href"));
        if (href) productUrls.add(href);
      });
    }
  }

  collect($first);

  for (let page = 2; page <= maxPage; page++) {
    const url = categoryUrl.endsWith("/")
      ? `${categoryUrl}page/${page}/`
      : `${categoryUrl}/page/${page}/`;

    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    collect($);
    console.log(`  • ${categoryUrl} pág ${page}/${maxPage}: ${productUrls.size} links (acumulado)`);
  }

  return { productUrls: [...productUrls], maxPage };
}

/**
 * 3) Abre a página do produto pra extrair:
 * - name
 * - imageUrl (alta)
 * - year (tag numérica)
 * - categories
 */
async function fetchProductDetails(productUrl) {
  const html = await fetchHtml(productUrl);
  const $ = cheerio.load(html);

  const name =
    cleanText($("h1.product_title").first().text()) ||
    cleanText($("h1").first().text());

  // imagem principal
  const originalImageUrl =
    pickImageUrl($(".woocommerce-product-gallery img").first()) ||
    pickImageUrl($("img").first()) ||
    "";

  // tags (ano)
  const tagTexts = [];
  $(".tagged_as a").each((_, a) => tagTexts.push(cleanText($(a).text())));
  if (tagTexts.length === 0) {
    $("a[href*='/product-tag/']").each((_, a) => tagTexts.push(cleanText($(a).text())));
  }

  const year = (() => {
    for (const t of tagTexts) {
      const n = Number(t);
      if (Number.isFinite(n) && n >= 1968 && n <= 2100) return n;
    }
    return null;
  })();

  const categories = [];
  $(".posted_in a").each((_, a) => categories.push(cleanText($(a).text())));
  if (categories.length === 0) {
    $("a[href*='/categoria-produto/']").each((_, a) => categories.push(cleanText($(a).text())));
  }

  // ✅ baixa e salva local por ano
  let finalImageUrl = originalImageUrl;
  let images = originalImageUrl ? [originalImageUrl] : [];

  if (originalImageUrl && year && name) {
    const saved = await downloadAndSaveImage({ imageUrl: originalImageUrl, year, name });
    if (saved.ok && saved.publicPath) {
      finalImageUrl = saved.publicPath;
      images = [saved.publicPath, originalImageUrl];
    }
  }

  return {
    name,
    lowercaseName: (name || "").toLowerCase(),
    imageUrl: finalImageUrl, // ✅ local
    images,                 // ✅ [local, original]
    year,
    categories: [...new Set(categories.filter(Boolean))],
    productUrl,
  };
}

/**
 * 4) Salva no Mongo (upsert por lowercaseName + year)
 */
async function upsertOne(detail, primaryCategoryName) {
  if (!detail.name) return { ok: false, reason: "Sem nome" };
  if (!detail.year) return { ok: false, reason: "Sem ano (tag)" };

  const existing = await HotWheel.findOne(
    { lowercaseName: detail.lowercaseName, year: detail.year },
    { _id: 1 }
  ).lean();

  await HotWheel.updateOne(
    { lowercaseName: detail.lowercaseName, year: detail.year },
    {
      $set: {
        name: detail.name,
        lowercaseName: detail.lowercaseName,
        year: detail.year,
        imageUrl: detail.imageUrl, // ✅ local
        images: detail.images,
        primaryCategory: primaryCategoryName,
      },
      $addToSet: {
        categories: { $each: [primaryCategoryName, ...detail.categories].filter(Boolean) },
      },
    },
    { upsert: true }
  );

  return { ok: true, action: existing ? "updated" : "inserted" };
}

function ensureReportsDir() {
  const dir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeReportFiles(report) {
  const dir = ensureReportsDir();
  const stamp = report.startedAt.replace(/[:.]/g, "-");
  const jsonPath = path.join(dir, `scrape-report-${stamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");

  const lines = [];
  lines.push(`SCRAPE REPORT - UniversoHotWheels`);
  lines.push(`Started: ${report.startedAt}`);
  lines.push(`Finished: ${report.finishedAt}`);
  lines.push(`Duration: ${msToHuman(report.durationMs)}`);
  lines.push("");
  lines.push(`Totals:`);
  lines.push(`- Categories found: ${report.totals.categoriesFound}`);
  lines.push(`- Product links (sum of unique per category): ${report.totals.productLinksUnique}`);
  lines.push(`- Processed: ${report.totals.processed}`);
  lines.push(`- Inserted: ${report.totals.inserted}`);
  lines.push(`- Updated: ${report.totals.updated}`);
  lines.push(`- Skipped (no name): ${report.totals.skippedNoName}`);
  lines.push(`- Skipped (no year): ${report.totals.skippedNoYear}`);
  lines.push(`- Failed: ${report.totals.failed}`);
  lines.push("");

  lines.push(`Error types:`);
  const entries = Object.entries(report.totals.errorTypes).sort((a, b) => b[1] - a[1]);
  if (!entries.length) lines.push(`- none`);
  else for (const [k, v] of entries) lines.push(`- ${k}: ${v}`);

  const txtPath = path.join(dir, `scrape-report-${stamp}.txt`);
  fs.writeFileSync(txtPath, lines.join("\n"), "utf-8");

  return { jsonPath, txtPath };
}

function printFinalReport(report) {
  console.log("\n================ RELATÓRIO FINAL (COMPLETO) ================");
  console.log(`🕒 Início:  ${report.startedAt}`);
  console.log(`🕒 Fim:     ${report.finishedAt}`);
  console.log(`⏱️ Duração: ${msToHuman(report.durationMs)}`);
  console.log("");

  console.log("📌 Totais gerais:");
  console.log(`- Categorias encontradas: ${report.totals.categoriesFound}`);
  console.log(`- Links de produtos (soma dos únicos por categoria): ${report.totals.productLinksUnique}`);
  console.log(`- Processados: ${report.totals.processed}`);
  console.log(`- Inseridos: ${report.totals.inserted}`);
  console.log(`- Atualizados: ${report.totals.updated}`);
  console.log(`- Pulados (sem nome): ${report.totals.skippedNoName}`);
  console.log(`- Pulados (sem ano): ${report.totals.skippedNoYear}`);
  console.log(`- Falhas: ${report.totals.failed}`);

  console.log("\n📊 Erros por tipo:");
  const types = Object.entries(report.totals.errorTypes).sort((a, b) => b[1] - a[1]);
  if (!types.length) console.log("- Nenhum");
  else for (const [k, v] of types) console.log(`- ${k}: ${v}`);
}

// ===== pipeline =====
async function scrapeAllCategories() {
  const report = createRunReport();
  const t0 = Date.now();

  const categories = await getCategoryLinks();
  report.totals.categoriesFound = categories.length;

  const limitCategory = pLimit(report.config.concurrency.categories);
  const limitProduct = pLimit(report.config.concurrency.products);

  await Promise.all(
    categories.map((cat) =>
      limitCategory(async () => {
        const catStats = createEmptyCategoryStats(cat.name, cat.url);
        report.categories[cat.name] = catStats;

        catStats.startedAt = nowISO();
        const catT0 = Date.now();

        try {
          console.log(`\n➡️ Categoria: ${cat.name} (${cat.url})`);

          const { productUrls, maxPage } = await getProductLinksFromCategory(cat.url);
          catStats.pagesDetected = maxPage;
          catStats.productLinksUnique = productUrls.length;

          report.totals.productLinksUnique += productUrls.length;

          console.log(`🔗 ${cat.name}: ${productUrls.length} produtos (links únicos)`);

          await Promise.all(
            productUrls.map((purl) =>
              limitProduct(async () => {
                catStats.processed++;
                report.totals.processed++;

                try {
                  const detail = await fetchProductDetails(purl);

                  const res = await upsertOne(detail, cat.name);
                  if (!res.ok) {
                    if (res.reason === "Sem nome") {
                      catStats.skippedNoName++;
                      report.totals.skippedNoName++;
                    } else if (res.reason === "Sem ano (tag)") {
                      catStats.skippedNoYear++;
                      report.totals.skippedNoYear++;
                    } else {
                      catStats.failed++;
                      report.totals.failed++;
                    }

                    catStats.failures.push({ url: purl, reason: res.reason, stage: "upsert/validation" });
                    report.failures.push({
                      category: cat.name,
                      url: purl,
                      reason: res.reason,
                      stage: "upsert/validation",
                      typeKey: "VALIDATION",
                    });
                    inc(report.totals.errorTypes, "VALIDATION", 1);
                    return;
                  }

                  if (res.action === "inserted") {
                    catStats.inserted++;
                    report.totals.inserted++;
                  } else {
                    catStats.updated++;
                    report.totals.updated++;
                  }
                } catch (e) {
                  catStats.failed++;
                  report.totals.failed++;

                  const t = classifyError(e);
                  inc(report.totals.errorTypes, t.key, 1);

                  catStats.failures.push({ url: purl, reason: e?.message || String(e), stage: "product" });
                  report.failures.push({
                    category: cat.name,
                    url: purl,
                    reason: e?.message || String(e),
                    stage: "product",
                    typeKey: t.key,
                  });
                }
              })
            )
          );
        } catch (e) {
          catStats.failed++;
          report.totals.failed++;

          const t = classifyError(e);
          inc(report.totals.errorTypes, t.key, 1);

          catStats.failures.push({ url: cat.url, reason: e?.message || String(e), stage: "category" });
          report.failures.push({
            category: cat.name,
            url: cat.url,
            reason: e?.message || String(e),
            stage: "category",
            typeKey: t.key,
          });
        } finally {
          catStats.finishedAt = nowISO();
          catStats.durationMs = Date.now() - catT0;
        }
      })
    )
  );

  report.finishedAt = nowISO();
  report.durationMs = Date.now() - t0;

  printFinalReport(report);
  const { jsonPath, txtPath } = writeReportFiles(report);
  console.log(`\n💾 Relatórios salvos em:`);
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- TXT:  ${txtPath}`);

  await mongoose.connection.close();
  console.log("🔥 Finalizado!");
}

scrapeAllCategories().catch(async (e) => {
  console.error("❌ Erro geral:", e);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
