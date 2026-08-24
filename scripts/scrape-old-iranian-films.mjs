import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const valueOf = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const INPUT_FILE = valueOf("--input", path.join("scripts", "data", "old-iranian-film-list.txt"));
const OUT_FILE = valueOf("--out", path.join(".media-cache", "vod-sync", "old-iranian-films-source.json"));
const REPORT_FILE = valueOf("--report", path.join(".media-cache", "vod-sync", "old-iranian-films-report.json"));
const CACHE_FILE = valueOf("--cache", path.join(".media-cache", "vod-sync", "old-iranian-film-source-cache.json"));
const LIMIT = Number(valueOf("--limit", "0")) || 0;
const CONCURRENCY = Math.max(1, Number(valueOf("--concurrency", "3")) || 3);
const DELAY_MS = Math.max(0, Number(valueOf("--delay-ms", "700")) || 0);
const TIMEOUT_MS = Math.max(1000, Number(valueOf("--timeout-ms", "5000")) || 5000);
const DISCOVER = args.has("--discover");

const ARCHIVE_ROOT = "https://oldfarsi.blogspot.com";
const SOURCE_NAME = "Old Iranian Film Archive";
const VIDEO_EXTENSIONS = /\.(?:mkv|mp4|m4v|avi|webm|mov|wmv|ts)(?:$|[?#])/i;

const PERSIAN_GENRE = "فیلم قدیمی ایرانی";
const PERSIAN_COUNTRY = "ایران";
const PERSIAN_LANGUAGE = "فارسی";

const sourceState = {
  checked: false,
  available: true,
  error: null,
};

async function main() {
  const titles = await readTitleList(INPUT_FILE);
  const selected = LIMIT ? titles.slice(0, LIMIT) : titles;
  const cache = await readJson(CACHE_FILE, {});
  const items = [];
  let directLinks = 0;
  let discoveredPages = 0;

  if (DISCOVER) await probeSource();

  for (let offset = 0; offset < selected.length; offset += CONCURRENCY) {
    const batch = selected.slice(offset, offset + CONCURRENCY);
    const results = await Promise.all(batch.map(async (entry) => {
      const sourcePageUrl = sourceLabelUrl(entry.title);
      const cached = cache[sourcePageUrl];
      let discovered = cached ?? null;

      if (DISCOVER && sourceState.available && !discovered) {
        discovered = await discoverSourcePage(sourcePageUrl);
        cache[sourcePageUrl] = discovered;
        await delay(DELAY_MS);
      }

      return makeItem(entry, sourcePageUrl, discovered);
    }));

    for (const item of results) {
      directLinks += item.links.length;
      if (item._discovered) discoveredPages += 1;
      delete item._discovered;
      items.push(item);
    }

    console.log(`${Math.min(offset + batch.length, selected.length)}/${selected.length} titles prepared`);
  }

  const payload = {
    sourceUrl: ARCHIVE_ROOT,
    sourceUrls: [ARCHIVE_ROOT, `${ARCHIVE_ROOT}/search/label/`],
    sourceName: SOURCE_NAME,
    scrapedAt: new Date().toISOString(),
    totalTitles: items.length,
    totalLinks: directLinks,
    items,
  };

  await writeJson(OUT_FILE, payload);
  await writeJson(CACHE_FILE, cache);
  await writeJson(REPORT_FILE, {
    inputFile: INPUT_FILE,
    outFile: OUT_FILE,
    totalInputTitles: titles.length,
    processedTitles: items.length,
    directLinks,
    titlesWithDirectLinks: items.filter((item) => item.links.length > 0).length,
    sourcePagesDiscovered: discoveredPages,
    sourceProbe: sourceState,
    discoverEnabled: DISCOVER,
    note: DISCOVER && !sourceState.available
      ? "The source could not be reached from this runtime. Records keep their verified archive page URLs and can be refreshed later with --discover."
      : "Only URLs that look like direct media files were saved as download links; source pages are retained separately.",
  });

  console.log(JSON.stringify({
    outFile: OUT_FILE,
    reportFile: REPORT_FILE,
    totalTitles: items.length,
    directLinks,
    titlesWithDirectLinks: items.filter((item) => item.links.length > 0).length,
    sourceProbe: sourceState,
  }, null, 2));
}

async function readTitleList(file) {
  const text = await readFile(file, "utf8");
  const entries = [];
  const seen = new Set();

  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^(\d{7})\s+(.+?)\s*$/u);
    if (!match) continue;
    const legacyCode = match[1];
    const title = cleanText(match[2]);
    if (!title || seen.has(legacyCode)) continue;
    seen.add(legacyCode);
    entries.push({ legacyCode, title, persianYear: Number(legacyCode.slice(0, 4)) });
  }

  if (!entries.length) throw new Error(`No film titles found in ${file}`);
  return entries;
}

function makeItem(entry, sourcePageUrl, discovered) {
  const links = discovered?.links ?? [];
  const posterUrl = discovered?.posterUrl ?? null;
  const id = `old-iranian-${entry.legacyCode}`;
  const year = entry.persianYear >= 1200 && entry.persianYear < 1500 ? entry.persianYear + 621 : null;
  const title = discovered?.title && isUsefulTitle(discovered.title) ? discovered.title : entry.title;
  const overview = discovered?.overview ?? null;

  return {
    id,
    title,
    imdbCode: id,
    imdbUrl: null,
    source: "old-iranian-archive",
    sourceName: SOURCE_NAME,
    sourcePageUrl: discovered?.sourcePageUrl ?? sourcePageUrl,
    sourceUrls: [sourcePageUrl, `${ARCHIVE_ROOT}/search?q=${encodeURIComponent(entry.title)}`],
    type: "movie",
    year,
    persianYear: entry.persianYear,
    releaseDate: year ? String(year) : null,
    originalTitle: null,
    imdbVotes: null,
    imdbRating: null,
    groups: unique(["Old Iranian Films", ...links.map((link) => link.group)]),
    qualities: unique(links.map((link) => link.quality).filter(Boolean)).sort(sortQuality),
    links,
    genres: ["Iranian Cinema", "Classic"],
    persianGenres: [PERSIAN_GENRE],
    countries: ["Iran"],
    persianCountries: [PERSIAN_COUNTRY],
    languages: ["Persian"],
    persianLanguages: [PERSIAN_LANGUAGE],
    overview,
    persianOverview: overview,
    tagline: null,
    runtimeMinutes: null,
    posterUrl,
    backdropUrl: posterUrl,
    logoUrl: null,
    metascore: null,
    certificate: null,
    keywords: ["old-iranian-film", "iranian-cinema", "classic-persian-film", PERSIAN_GENRE],
    credits: [],
    companies: [],
    productionStage: links.length ? "available" : "source-only",
    apiFetchedAt: new Date().toISOString(),
    _discovered: Boolean(discovered?.checkedAt),
  };
}

async function probeSource() {
  sourceState.checked = true;
  try {
    const html = await fetchText(ARCHIVE_ROOT);
    if (!html) throw new Error("empty response");
  } catch (error) {
    sourceState.available = false;
    sourceState.error = error instanceof Error ? error.message : String(error);
  }
}

async function discoverSourcePage(url) {
  const checkedAt = new Date().toISOString();
  try {
    const html = await fetchText(url);
    if (!html) return { checkedAt, sourcePageUrl: url, links: [] };
    const links = extractDirectLinks(html, url);
    return {
      checkedAt,
      sourcePageUrl: url,
      title: extractMeta(html, "og:title") ?? null,
      overview: extractMeta(html, "description") ?? null,
      posterUrl: extractMeta(html, "og:image") ?? null,
      links,
    };
  } catch (error) {
    return {
      checkedAt,
      sourcePageUrl: url,
      links: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "SarvNema-old-iranian-catalog/1.0 (+https://sarvnema.ir)",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractDirectLinks(html, sourcePageUrl) {
  const links = [];
  const seen = new Set();
  for (const match of html.matchAll(/(?:href|data-url)\s*=\s*["']([^"']+)["']/giu)) {
    const rawUrl = decodeHtml(match[1]);
    if (!VIDEO_EXTENSIONS.test(rawUrl)) continue;
    let url;
    try {
      url = new URL(rawUrl, sourcePageUrl).toString();
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    const quality = inferQuality(url);
    links.push({
      label: quality ? `${quality} · ${fileName(url)}` : fileName(url),
      url,
      size: null,
      group: SOURCE_NAME,
      quality,
      release: null,
      fileName: fileName(url),
      sourceUrl: sourcePageUrl,
      modified: null,
      sourceProvider: "oldfarsi",
      sourceOriginalUrl: url,
      mediaKind: "video",
    });
  }
  return links;
}

function sourceLabelUrl(title) {
  return `${ARCHIVE_ROOT}/search/label/${encodeURIComponent(title)}`;
}

function extractMeta(html, name) {
  const property = name === "og:title" || name === "og:image" ? `property=["']${name}["']` : `name=["']${name}["']`;
  const match = html.match(new RegExp(`<meta\\b[^>]*${property}[^>]*content=["']([^"']+)["']`, "iu"));
  return match ? decodeHtml(match[1]).trim() : null;
}

function inferQuality(value) {
  const match = String(value).match(/(?:^|[._\s-])(2160p|1440p|1080p|720p|576p|480p|360p|4k)(?:$|[._\s-])/i);
  return match ? match[1].toLowerCase() : null;
}

function fileName(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || "video");
  } catch {
    return "video";
  }
}

function cleanText(value) {
  return decodeHtml(String(value)).replace(/\s+/gu, " ").trim();
}

function decodeHtml(value) {
  return String(value)
    .replace(/&amp;/gu, "&")
    .replace(/&quot;/gu, '"')
    .replace(/&#39;|&apos;/gu, "'")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">");
}

function isUsefulTitle(value) {
  return value && !/دانلود|فیلم فارسی|oldfarsi|archive/iu.test(value) && value.length < 180;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sortQuality(a, b) {
  return Number.parseInt(b, 10) - Number.parseInt(a, 10) || String(a).localeCompare(String(b));
}

function delay(ms) {
  return ms ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
