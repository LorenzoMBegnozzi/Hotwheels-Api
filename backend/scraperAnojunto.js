const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");
const HotWheel = require("./models/HotWheel");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const pLimit = require("p-limit");

// Carrega o .env a partir do diretório do script (evita depender do CWD)
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
} else {
    require("dotenv").config();
}

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function connectToMongo() {
    const mongoUri =
        process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL;

    if (!mongoUri) {
        throw new Error(
            "MongoDB URI não encontrada. Defina MONGODB_URI (recomendado) ou MONGO_URI/MONGO_URL no .env ou nas variáveis de ambiente."
        );
    }

    mongoose.set("bufferCommands", false);
    mongoose.set("bufferTimeoutMS", 30000);

    await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
    });
}

function cleanUrl(url) {
    return url ? url.replace(/\s/g, "") : url;
}

function pickImageUrl($img) {
    if (!$img || $img.length === 0) return "";

    const dataSrc = $img.attr("data-src");
    const src = $img.attr("src");
    const srcset = $img.attr("srcset") || $img.attr("data-srcset");

    if (srcset) {
        const parts = srcset
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);

        const last = parts[parts.length - 1];
        const url = last?.split(" ")[0];
        if (url) return cleanUrl(url);
    }

    return cleanUrl(dataSrc || src || "");
}

function removeQueryParam(url, key) {
    if (!url) return url;
    try {
        const u = new URL(url);
        u.searchParams.delete(key);
        return u.toString();
    } catch (_) {
        return url;
    }
}

function toHighResFandomImageUrl(url) {
    if (!url) return url;
    url = cleanUrl(url);

    if (url.startsWith("//")) url = `https:${url}`;
    if (url.startsWith("data:")) return "";

    url = url.replace(
        /\/revision\/latest\/scale-to-width-down\/\d+/i,
        "/revision/latest"
    );
    url = url.replace(
        /\/revision\/latest\/smart\/width\/\d+\/height\/\d+/i,
        "/revision/latest"
    );
    url = url.replace(/\/scale-to-width-down\/\d+/i, "");

    url = url.replace(/\/images\/thumb\//i, "/images/");
    url = url.replace(/\/(\d+px-)/i, "/");

    if (url.includes("/revision/")) {
        url = removeQueryParam(url, "format");
    }

    return url;
}

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
    } catch (_) { }

    return ".jpg";
}

/**
 * ✅ Cria a pasta automaticamente pelo ANO recebido
 * uploads/hotwheels/<ano>/
 */
async function downloadAndSaveImage({ imageUrl, year, name }) {
    const url = String(imageUrl || "").trim();
    if (!url) return { ok: false };
    if (url.startsWith("data:")) return { ok: false };
    if (url.includes("via.placeholder.com")) return { ok: false };

    const safeYear = Number(year);
    if (!Number.isFinite(safeYear)) return { ok: false };

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
            },
            maxContentLength: 20 * 1024 * 1024,
            maxBodyLength: 20 * 1024 * 1024,
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

// Google fallback (atenção: Google costuma bloquear bastante)
async function getGoogleImage(searchQuery) {
    try {
        console.log(`🔎 Buscando imagem no Google para: ${searchQuery}`);

        const response = await axios.get(
            `https://www.google.com/search?hl=en&tbm=isch&q=${encodeURIComponent(
                searchQuery + " Hot Wheels diecast"
            )}`,
            { headers: { "User-Agent": USER_AGENT }, timeout: 30000 }
        );

        const $ = cheerio.load(response.data);
        let imageUrl = $("img").eq(1).attr("src");

        if (!imageUrl || imageUrl.includes("/tia/tia.png")) {
            console.log(`⚠️ Nenhuma imagem válida encontrada para ${searchQuery}`);
            return "https://via.placeholder.com/150";
        }

        return cleanUrl(imageUrl);
    } catch (error) {
        console.error(`❌ Erro ao buscar imagem no Google para ${searchQuery}:`, error?.message || error);
        return "https://via.placeholder.com/150";
    }
}

function buildFandomListUrl(year) {
    return `https://hotwheels.fandom.com/wiki/List_of_${year}_Hot_Wheels`;
}

/**
 * Processa 1 ano inteiro
 */
async function scrapeYear(year, { rowConcurrency = 6 } = {}) {
    const url = buildFandomListUrl(year);
    console.log(`\n==================== 📅 ANO ${year} ====================`);
    console.log(`🔗 ${url}`);

    let html;
    try {
        const { data } = await axios.get(url, {
            headers: { "User-Agent": USER_AGENT },
            timeout: 30000,
            validateStatus: (s) => s >= 200 && s < 400, // deixa cair no catch se 404/500
        });
        html = data;
    } catch (e) {
        console.error(`❌ Falha ao abrir lista do ano ${year}:`, e?.response?.status || e?.message || e);
        return { year, ok: false, reason: "LIST_FETCH_FAILED" };
    }

    const $ = cheerio.load(html);
    const rows = $("table.wikitable tbody tr").toArray();

    if (!rows.length) {
        console.warn(`⚠️ Nenhuma tabela encontrada no ano ${year}. Layout mudou?`);
        return { year, ok: false, reason: "NO_TABLE_ROWS" };
    }

    const limitRows = pLimit(rowConcurrency);
    let total = 0;
    let savedCount = 0;

    await Promise.all(
        rows.map((row) =>
            limitRows(async () => {
                const columns = $(row).find("td");
                if (columns.length < 3) return;

                let name =
                    $(columns.eq(2)).text().trim() || $(columns.eq(1)).text().trim();
                name = name.replace(/^'\d{2}\s+/, "");

                if (!name) return;

                const imageElement = $(columns).find("img").first();
                let imageUrl = toHighResFandomImageUrl(pickImageUrl(imageElement));

                if (
                    !imageUrl ||
                    imageUrl.includes("/tia/tia.png") ||
                    imageUrl.includes("Image_Not_Available")
                ) {
                    imageUrl = await getGoogleImage(`${name} Hot Wheels ${year}`);
                    imageUrl = cleanUrl(imageUrl);
                }

                let finalImageUrl = imageUrl;
                let images = imageUrl ? [imageUrl] : [];

                const saved = await downloadAndSaveImage({ imageUrl, year, name });
                if (saved.ok && saved.publicPath) {
                    finalImageUrl = saved.publicPath;
                    images = [saved.publicPath, ...(imageUrl ? [imageUrl] : [])];
                }

                total++;

                await HotWheel.updateOne(
                    { lowercaseName: name.toLowerCase(), year },
                    {
                        $set: {
                            name,
                            lowercaseName: name.toLowerCase(),
                            imageUrl: finalImageUrl,
                            images,
                            year,
                        },
                    },
                    { upsert: true }
                );

                savedCount++;
                console.log(`🚗 ${name} | ${year} | 🖼️ ${finalImageUrl}`);
            })
        )
    );

    console.log(`✅ Ano ${year} finalizado. Itens processados: ${total}, salvos: ${savedCount}`);
    return { year, ok: true, processed: total, saved: savedCount };
}

/**
 * ✅ Varre automaticamente 1968 → 2026
 */
async function scrapeAllYears() {
    let connected = false;

    // Ajustes rápidos:
    const START_YEAR = 1968;
    const END_YEAR = 2026;

    // concorrência por ano e por linha
    const yearConcurrency = 1;     // recomendo 1 (Fandom rate limit)
    const rowConcurrency = 6;      // baixa imagens em paralelo dentro do ano
    const delayBetweenYearsMs = 1500;

    const limitYears = pLimit(yearConcurrency);

    try {
        await connectToMongo();
        connected = true;
        console.log("✅ Conectado ao MongoDB");

        const years = [];
        for (let y = START_YEAR; y <= END_YEAR; y++) {
            if (y === 1977) continue; // ✅ pula 1977
            years.push(y);
        }


        const results = [];
        for (const y of years) {
            // roda sequencial (ou com limitYears se quiser paralelizar anos)
            const res = await limitYears(() => scrapeYear(y, { rowConcurrency }));
            results.push(res);

            // delay entre anos pra reduzir risco de 429
            await sleep(delayBetweenYearsMs);
        }

        // resumo final
        const ok = results.filter((r) => r.ok).length;
        const fail = results.length - ok;
        console.log("\n==================== ✅ RESUMO FINAL ====================");
        console.log(`Total anos: ${results.length}`);
        console.log(`OK: ${ok}`);
        console.log(`Falhas: ${fail}`);
        results
            .filter((r) => !r.ok)
            .forEach((r) => console.log(`- ${r.year}: ${r.reason}`));
    } catch (error) {
        console.error("❌ Erro geral:", error);
        process.exitCode = 1;
    } finally {
        if (connected) {
            try {
                await mongoose.disconnect();
            } catch (_) { }
        }
    }
}

scrapeAllYears();
