const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");
const pLimit = require("p-limit");
const HotWheel = require("./models/HotWheel");
require("dotenv").config();

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
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

async function fetchHtml(url) {
  const { data } = await axios.get(url, {
    headers: { "User-Agent": USER_AGENT },
    timeout: 30000,
  });
  return data;
}

function pickImageUrl($img) {
  const dataSrc = $img.attr("data-src");
  const src = $img.attr("src");
  const srcset = $img.attr("srcset");

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
 * pega links /categoria-produto/<slug>/
 */
async function getCategoryLinks() {
  const html = await fetchHtml(START_URL);
  const $ = cheerio.load(html);

  const IGNORE_SLUGS = new Set([
    "todos",
    "recem-chegados-2",
    "mais-procurados",
    "ofertas",
    "destaques"
  ]);

  const links = new Map(); // href -> nome

  $("a[href^='https://universohotwheels.com.br/categoria-produto/']").each((_, a) => {
    const href = cleanUrl($(a).attr("href"));
    if (!href) return;

    const slug = href.split("/categoria-produto/")[1]?.split("/")[0];
    if (!slug || IGNORE_SLUGS.has(slug)) return;

    // tenta pegar um nome legível
    let name = cleanText($(a).text());

    // fallback: nome a partir do slug
    if (!name) {
      name = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    links.set(href, name);
  });

  const categories = [...links.entries()].map(([url, name]) => ({ url, name }));

  console.log(
    `📚 Categorias válidas encontradas: ${categories.length}`
  );

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
    // WooCommerce: li.product a (primeiro link geralmente é do produto)
    $("li.product a[href*='/product-page/']").each((_, a) => {
      const href = cleanUrl($(a).attr("href"));
      if (href) productUrls.add(href);
    });

    // fallback: qualquer link de /product-page/
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

  return [...productUrls];
}

/**
 * 3) Abre a página do produto pra extrair:
 * - name
 * - imageUrl
 * - year (tag numérica)
 * - categories (posted_in)
 */
async function fetchProductDetails(productUrl) {
  const html = await fetchHtml(productUrl);
  const $ = cheerio.load(html);

  const name =
    cleanText($("h1.product_title").first().text()) ||
    cleanText($("h1").first().text());

  // imagem principal do produto
  const imageUrl =
    pickImageUrl($(".woocommerce-product-gallery img").first()) ||
    pickImageUrl($("img").first()) ||
    "https://via.placeholder.com/300";

  // tags (ano costuma ser tag “2025”, “2026” etc.)
  const tagTexts = [];
  $(".tagged_as a").each((_, a) => tagTexts.push(cleanText($(a).text())));
  // fallback: pega qualquer link para /product-tag/<ano>/
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

  // categorias do produto
  const categories = [];
  $(".posted_in a").each((_, a) => categories.push(cleanText($(a).text())));
  // fallback: links /categoria-produto/
  if (categories.length === 0) {
    $("a[href*='/categoria-produto/']").each((_, a) => categories.push(cleanText($(a).text())));
  }

  return {
    name,
    lowercaseName: (name || "").toLowerCase(),
    imageUrl,
    images: imageUrl ? [imageUrl] : [],
    year,
    categories: [...new Set(categories.filter(Boolean))],
    productUrl,
  };
}

/**
 * 4) Salva no Mongo:
 * - upsert por (lowercaseName + year)
 * - adiciona categoria atual via $addToSet
 */
async function upsertOne(detail, primaryCategoryName) {
  if (!detail.name) return { ok: false, reason: "Sem nome" };
  if (!detail.year) return { ok: false, reason: "Sem ano (tag)" };

  await HotWheel.updateOne(
    { lowercaseName: detail.lowercaseName, year: detail.year },
    {
      $set: {
        name: detail.name,
        lowercaseName: detail.lowercaseName,
        year: detail.year,
        imageUrl: detail.imageUrl,
        images: detail.images,
        primaryCategory: primaryCategoryName,
      },
      $addToSet: {
        categories: { $each: [primaryCategoryName, ...detail.categories].filter(Boolean) },
      },
    },
    { upsert: true }
  );

  return { ok: true };
}

async function scrapeAllCategories() {
  const categories = await getCategoryLinks();
  console.log(`📚 Categorias encontradas em /colecoes/: ${categories.length}`);

  const limitCategory = pLimit(2); // concorrência de categorias
  const limitProduct = pLimit(6);  // concorrência de produtos dentro da categoria

  const failed = [];

  await Promise.all(
    categories.map((cat) =>
      limitCategory(async () => {
        try {
          console.log(`\n➡️ Categoria: ${cat.name} (${cat.url})`);
          const productUrls = await getProductLinksFromCategory(cat.url);
          console.log(`🔗 ${cat.name}: ${productUrls.length} produtos (links únicos)`);

          await Promise.all(
            productUrls.map((purl) =>
              limitProduct(async () => {
                try {
                  const detail = await fetchProductDetails(purl);
                  const res = await upsertOne(detail, cat.name);
                  if (!res.ok) {
                    failed.push({ category: cat.name, url: purl, reason: res.reason });
                  }
                } catch (e) {
                  failed.push({ category: cat.name, url: purl, reason: e?.message || String(e) });
                }
              })
            )
          );
        } catch (e) {
          failed.push({ category: cat.name, url: cat.url, reason: e?.message || String(e) });
        }
      })
    )
  );

  console.log("\n================ RELATÓRIO FINAL ================");
  console.log(`🚫 Falhas: ${failed.length}`);
  if (failed.length) {
    // mostra só as primeiras pra não “explodir” o console
    console.log("Exemplos de falhas:");
    failed.slice(0, 30).forEach((f) => console.log(`- [${f.category}] ${f.reason} :: ${f.url}`));
  }

  await mongoose.connection.close();
  console.log("🔥 Finalizado!");
}

scrapeAllCategories().catch(async (e) => {
  console.error("❌ Erro geral:", e);
  await mongoose.connection.close();
});
