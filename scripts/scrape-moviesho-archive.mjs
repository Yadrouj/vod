import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  mapMovieshoRestPost,
  parseArchiveDetailUrls,
  parseMovieshoDetail,
} from "./moviesho-archive-lib.mjs";

const ROOT = process.cwd();
const FIRST_PAGE = intEnv("MOVIESHO_ARCHIVE_FIRST_PAGE", 1);
const LAST_PAGE = intEnv("MOVIESHO_ARCHIVE_LAST_PAGE", 357);
const LIMIT = intEnv("MOVIESHO_ARCHIVE_LIMIT", 0);
const CONCURRENCY = Math.max(1, intEnv("MOVIESHO_ARCHIVE_CONCURRENCY", 4));
const IMAGE_CONCURRENCY = Math.max(1, intEnv("MOVIESHO_ARCHIVE_IMAGE_CONCURRENCY", 3));
const REQUEST_GAP_MS = Math.max(0, intEnv("MOVIESHO_ARCHIVE_REQUEST_GAP_MS", 175));
const TIMEOUT_MS = Math.max(2_000, intEnv("MOVIESHO_ARCHIVE_TIMEOUT_MS", 25_000));
const RETRIES = Math.max(1, intEnv("MOVIESHO_ARCHIVE_RETRIES", 3));
const FORCE = boolEnv("MOVIESHO_ARCHIVE_FORCE", false);
const DOWNLOAD_IMAGES = boolEnv("MOVIESHO_ARCHIVE_DOWNLOAD_IMAGES", true);
const OUTPUT = resolveEnv("MOVIESHO_ARCHIVE_OUTPUT", ".media-cache/vod-sync/moviesho-archive-source.json");
const CACHE = resolveEnv("MOVIESHO_ARCHIVE_CACHE", ".media-cache/vod-sync/moviesho-archive-cache.json");
const REPORT = resolveEnv("MOVIESHO_ARCHIVE_REPORT", ".media-cache/vod-sync/moviesho-archive-report.json");
const IMAGE_DIR = resolveEnv("MOVIESHO_ARCHIVE_IMAGE_DIR", "public/media/moviesho");
const CACHE_MAX_AGE_MS = intEnv("MOVIESHO_ARCHIVE_CACHE_MAX_AGE_HOURS", 24 * 7) * 60 * 60 * 1_000;

const cache = await readJson(CACHE, { version: 1, pages: {}, records: {} });
cache.version = 1;
cache.pages ??= {};
cache.records ??= {};
let lastRequestAt = 0;
let completedSinceSave = 0;
const failures = [];

console.log(`[moviesho-archive] pages ${FIRST_PAGE}-${LAST_PAGE}; concurrency=${CONCURRENCY}; images=${DOWNLOAD_IMAGES ? "on" : "off"}`);

const pageNumbers = Array.from({ length: Math.max(0, LAST_PAGE - FIRST_PAGE + 1) }, (_, index) => FIRST_PAGE + index);
const pageResults = await mapLimit(pageNumbers, Math.min(CONCURRENCY, 3), async (page) => {
  const key = String(page);
  const cached = cache.pages[key];
  if (!FORCE && fresh(cached?.fetchedAt) && Array.isArray(cached?.urls)) return cached.urls;
  const url = archivePageUrl(page);
  try {
    const html = await fetchText(url);
    const urls = parseArchiveDetailUrls(html, url);
    cache.pages[key] = { fetchedAt: new Date().toISOString(), url, urls };
    await checkpoint();
    console.log(`[moviesho-archive] archive ${page}/${LAST_PAGE}: ${urls.length} titles`);
    return urls;
  } catch (error) {
    failures.push({ stage: "archive", url, message: errorMessage(error) });
    if (Array.isArray(cached?.urls)) return cached.urls;
    console.warn(`[moviesho-archive] archive failed ${page}: ${errorMessage(error)}`);
    return [];
  }
});

let detailUrls = unique(pageResults.flat());
if (LIMIT > 0) detailUrls = detailUrls.slice(0, LIMIT);
console.log(`[moviesho-archive] ${detailUrls.length} unique detail pages discovered`);

const records = await mapLimit(detailUrls, CONCURRENCY, async (url, index) => {
  const cached = cache.records[url];
  if (!FORCE && fresh(cached?.fetchedAt) && cached?.item) {
    if ((index + 1) % 100 === 0) console.log(`[moviesho-archive] cached ${index + 1}/${detailUrls.length}`);
    return cached.item;
  }
  try {
    const html = await fetchText(url);
    const detail = parseMovieshoDetail(html, url);
    if (!detail.restUrl) throw new Error("WordPress REST endpoint was not found");
    const restUrl = new URL(detail.restUrl);
    restUrl.searchParams.set("_embed", "1");
    const post = await fetchJson(restUrl.toString());
    let item = mapMovieshoRestPost(post, detail);
    if (DOWNLOAD_IMAGES) item = await localizeImages(item);
    cache.records[url] = { fetchedAt: new Date().toISOString(), item };
    await checkpoint();
    console.log(`[moviesho-archive] detail ${index + 1}/${detailUrls.length}: ${item.imdbCode} ${item.title}`);
    return item;
  } catch (error) {
    failures.push({ stage: "detail", url, message: errorMessage(error) });
    if (cached?.item) return cached.item;
    console.warn(`[moviesho-archive] detail failed ${url}: ${errorMessage(error)}`);
    return null;
  }
});

await saveCache();
const items = dedupeItems(records.filter(Boolean));
const output = {
  sourceUrl: "https://www.moviesho.com/category/movies/",
  scrapedAt: new Date().toISOString(),
  sourceMode: "moviesho-archive-pages-and-wordpress-rest",
  archivePages: { first: FIRST_PAGE, last: LAST_PAGE },
  totalTitles: items.length,
  totalLinks: items.reduce((sum, item) => sum + item.links.length, 0),
  totalImages: items.reduce((sum, item) => sum + (item.movieshoImages?.length ?? 0), 0),
  items,
};
const report = {
  generatedAt: new Date().toISOString(),
  pagesRequested: pageNumbers.length,
  detailPagesDiscovered: detailUrls.length,
  titlesWritten: items.length,
  linksWritten: output.totalLinks,
  imagesWritten: output.totalImages,
  failures,
};
await writeJsonAtomic(OUTPUT, output);
await writeJsonAtomic(REPORT, report);
console.log(`[moviesho-archive] wrote ${items.length} titles, ${output.totalLinks} links, ${output.totalImages} images to ${relative(OUTPUT)}`);
if (failures.length) console.warn(`[moviesho-archive] completed with ${failures.length} recoverable failures; see ${relative(REPORT)}`);

async function localizeImages(item) {
  const imdbFolder = safeSegment(item.imdbCode || item.id);
  const images = await mapLimit(item.movieshoImages ?? [], IMAGE_CONCURRENCY, async (image, index) => {
    try {
      const remote = new URL(image.url);
      if (!/\.(?:jpe?g|png|webp|avif)$/i.test(remote.pathname)) return image;
      const extension = path.extname(remote.pathname).toLowerCase() || ".jpg";
      const digest = createHash("sha1").update(image.url).digest("hex").slice(0, 10);
      const target = path.join(IMAGE_DIR, imdbFolder, `${String(index + 1).padStart(2, "0")}-${digest}${extension}`);
      const publicUrl = `/${path.relative(path.join(ROOT, "public"), target).split(path.sep).join("/")}`;
      if (!(await fileExists(target))) {
        const response = await fetchWithRetry(image.url);
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || !contentType.startsWith("image/")) throw new Error(`image HTTP ${response.status} ${contentType}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length < 256) throw new Error("image response was empty");
        await mkdir(path.dirname(target), { recursive: true });
        await writeFileAtomic(target, bytes);
      }
      return { ...image, remoteUrl: image.url, url: publicUrl, localUrl: publicUrl };
    } catch (error) {
      failures.push({ stage: "image", url: image.url, message: errorMessage(error) });
      return image;
    }
  });
  const remotePoster = item.posterUrl;
  const poster = images.find((image) => image.remoteUrl === remotePoster || image.url === remotePoster) ?? images[0];
  const backdrop = images.find((image) => (image.width ?? 0) > (image.height ?? Infinity));
  return {
    ...item,
    posterUrl: poster?.url ?? item.posterUrl,
    backdropUrl: backdrop?.url ?? item.backdropUrl,
    movieshoImages: images,
  };
}

async function fetchText(url) {
  const response = await fetchWithRetry(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetchWithRetry(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchWithRetry(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      await throttle();
      const response = await fetch(url, {
        ...options,
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "User-Agent": "SarvNemaCatalogBot/1.0 (+https://sarvnema.ir; metadata sync)",
          "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.7",
          ...(options.headers ?? {}),
        },
      });
      if (response.status === 429 || response.status >= 500) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await sleep(500 * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

async function throttle() {
  const wait = Math.max(0, REQUEST_GAP_MS - (Date.now() - lastRequestAt));
  if (wait) await sleep(wait);
  lastRequestAt = Date.now();
}

async function checkpoint() {
  completedSinceSave += 1;
  if (completedSinceSave < 20) return;
  completedSinceSave = 0;
  await saveCache();
}

async function saveCache() {
  await writeJsonAtomic(CACHE, cache);
}

function dedupeItems(values) {
  const map = new Map();
  for (const item of values) {
    const key = String(item.imdbCode || item.id).toLowerCase();
    const previous = map.get(key);
    if (!previous) map.set(key, item);
    else map.set(key, {
      ...previous,
      ...item,
      links: dedupeByUrl([...(previous.links ?? []), ...(item.links ?? [])]),
      movieshoImages: dedupeByUrl([...(previous.movieshoImages ?? []), ...(item.movieshoImages ?? [])]),
    });
  }
  return [...map.values()];
}

function dedupeByUrl(values) {
  const map = new Map();
  for (const value of values) if (value?.url && !map.has(value.url)) map.set(value.url, value);
  return [...map.values()];
}

async function mapLimit(values, limit, worker) {
  const result = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      result[index] = await worker(values[index], index);
    }
  }));
  return result;
}

function archivePageUrl(page) {
  return page <= 1
    ? "https://www.moviesho.com/category/movies/"
    : `https://www.moviesho.com/category/movies/page/${page}/`;
}

function fresh(value) {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) && Date.now() - timestamp < CACHE_MAX_AGE_MS;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value), "utf8");
  await rename(temporary, file);
}

async function writeFileAtomic(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, value);
  await rename(temporary, file);
}

async function fileExists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

function resolveEnv(name, fallback) {
  return path.resolve(ROOT, process.env[name] || fallback);
}

function intEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) ? value : fallback;
}

function boolEnv(name, fallback) {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  if (!value) return fallback;
  return !["0", "false", "no", "off"].includes(value);
}

function unique(values) {
  return [...new Set(values)];
}

function safeSegment(value) {
  return String(value ?? "moviesho").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "moviesho";
}

function relative(file) {
  return path.relative(ROOT, file) || file;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
