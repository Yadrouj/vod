import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { donyayeLinkKey } from "../lib/donyaye-link-updates.mjs";

const BASE_URL = process.env.DONYAYE_SERIES_URL || "https://donyayeserial.com/series/";
const OUT_FILE = process.argv[2] || path.join(".media-cache", "vod-sync", "series-feed.json");
const CACHE_FILE =
  process.env.DONYAYE_SERIES_FEED_CACHE ||
  path.join(".media-cache", "vod-sync", "series-feed-latest.json");
const PAGE_COUNT = Math.max(1, Number(process.env.DONYAYE_SERIES_PAGES || 3));
const CONCURRENCY = Math.max(1, Number(process.env.DONYAYE_SERIES_CONCURRENCY || 6));
const TIMEOUT_MS = Math.max(3_000, Number(process.env.DONYAYE_SERIES_TIMEOUT_MS || 18_000));
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 SarvNema-Catalog/1.0";
const VIDEO_RE = /\.(mkv|mp4|m4v|avi|webm|mov|wmv|ts)(?:$|[?#])/i;

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;|\u00a0/g, " ");
}

function plainText(value) {
  return decodeEntities(String(value ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchSeriesHtml(url, { fetchImpl = fetch, timeoutMs = TIMEOUT_MS, maxBytes = 4 * 1024 * 1024 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = url;
    const origins = new Set([new URL(url).origin, "https://donyayeserial.com", "https://donyayeserial-new1.top"]);
    for (let redirects = 0; redirects < 5; redirects++) {
      const parsed = new URL(current);
      if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || !origins.has(parsed.origin)) return null;
      const response = await fetchImpl(current, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml",
          "accept-language": "fa,en;q=0.8",
        },
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        await response.body?.cancel(); current = new URL(location, current).href; continue;
      }
      if (!response.ok || !/text\/html|application\/xhtml\+xml/i.test(response.headers.get("content-type") || "")) {
        await response.body?.cancel(); return null;
      }
      const reader = response.body?.getReader();
      if (!reader) return null;
      const chunks = []; let bytes = 0;
      try {
        for (;;) {
          const chunk = await reader.read(); if (chunk.done) break;
          bytes += chunk.value.byteLength; if (bytes > maxBytes) return null;
          chunks.push(chunk.value);
        }
      } finally { await reader.cancel(); }
      return { html: Buffer.concat(chunks).toString("utf8"), url: current };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

function feedPageUrl(index, base = BASE_URL) {
  if (index === 1) return base;
  return new URL(`page/${index}/`, ensureSlash(base)).toString();
}

function ensureSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

export function extractDetailUrls(html, resolvedUrl = BASE_URL) {
  const urls = new Set();
  const base = new URL(resolvedUrl);
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    try {
      const url = new URL(decodeEntities(match[1]), base);
      if (url.origin !== base.origin || url.username || url.password) continue;
      if (!/^\/series\/(?!page\/)[^/?#]+\/?$/i.test(url.pathname)) continue;
      url.search = ""; url.hash = "";
      urls.add(ensureSlash(url.toString()));
    } catch {
      // Ignore malformed links from widgets and ad markup.
    }
  }
  return Array.from(urls);
}

export function seriesFeedCandidates(base = BASE_URL) {
  return Array.from(new Set([base, ...(new URL(base).hostname === "donyayeserial.com"
    ? ["https://donyayeserial-new1.top/series/"] : [])]));
}

function metaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    new RegExp(
      `<meta\\b[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`,
      "i",
    ).exec(html)?.[1] ??
    new RegExp(
      `<meta\\b[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["'][^>]*>`,
      "i",
    ).exec(html)?.[1] ??
    null
  );
}

function inferQuality(value) {
  const match = /\b(2160p|1080p|720p|480p|360p|4K)\b/i.exec(value);
  return match ? match[1].replace(/^4k$/i, "4K") : null;
}

function inferRelease(value) {
  const match =
    /\b(BluRay|WEB[-.]?DL|WEBRip|WEB|HDTV|HDRip|DVDRip|BRRip|Remux)\b/i.exec(value);
  return match ? match[1].replace(".", "-") : null;
}

function inferGroup(value) {
  if (/dubbed|dub(?:\/|\.|_|-)|دوبله/i.test(value)) return "Dubbed";
  if (/hardsub|hard[.\s_-]?sub/i.test(value)) return "HardSub";
  if (/softsub|soft[.\s_-]?sub/i.test(value)) return "SoftSub";
  if (/nosub|no[.\s_-]?sub/i.test(value)) return "NoSub";
  return "Files";
}

function parseSeasonEpisode(value) {
  const match =
    /S(?:eason)?[.\s_-]?(\d{1,2})[.\s_-]*E(?:pisode)?[.\s_-]?(\d{1,3})/i.exec(value);
  return match
    ? { season: Number(match[1]), episode: Number(match[2]) }
    : { season: null, episode: null };
}

function extractDownloadLinks(html, sourcePageUrl) {
  const byUrl = new Map();
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = decodeEntities(match[1]);
    let url;
    try {
      url = new URL(href, sourcePageUrl).toString();
    } catch {
      continue;
    }
    if (!donyayeLinkKey(url) || !VIDEO_RE.test(url)) continue;
    const labelText = plainText(match[2]);
    let fileName;
    try { fileName = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? ""); }
    catch { continue; }
    const parsed = parseSeasonEpisode(`${labelText} ${fileName} ${url}`);
    const quality = inferQuality(`${labelText} ${fileName} ${url}`);
    const release = inferRelease(`${labelText} ${fileName} ${url}`);
    const group = inferGroup(`${labelText} ${fileName} ${url}`);
    byUrl.set(url, {
      label: [
        parsed.season && parsed.episode
          ? `S${String(parsed.season).padStart(2, "0")}E${String(parsed.episode).padStart(2, "0")}`
          : null,
        quality,
        release,
        group,
      ]
        .filter(Boolean)
        .join(" / "),
      url,
      size: null,
      group,
      quality,
      release,
      season: parsed.season,
      episode: parsed.episode,
      fileName,
      sourceUrl: sourcePageUrl,
      modified: null,
    });
  }
  return Array.from(byUrl.values());
}

function cleanTitle(rawTitle) {
  return plainText(rawTitle)
    .replace(/\s*[-|–]\s*دنیای سریال.*$/i, "")
    .replace(/^دانلود\s+(?:رایگان\s+)?(?:سریال|انیمه)\s+/i, "")
    .replace(/\s+(?:رایگان|بدون سانسور|با زیرنویس|با دوبله).*$/i, "")
    .trim();
}

export function parseDetail(html, sourcePageUrl) {
  const imdbCode =
    /imdb\.com\/title\/(tt\d+)/i.exec(html)?.[1] ??
    /\/(tt\d{5,12})(?:\/|["'])/i.exec(html)?.[1] ??
    "";
  const links = extractDownloadLinks(html, sourcePageUrl).filter(link => {
    const pathId = /\/(tt\d{5,12})\//i.exec(new URL(link.url).pathname)?.[1];
    return !pathId || pathId === imdbCode;
  });
  if (!imdbCode || links.length === 0) return null;

  const heading = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1];
  const title = cleanTitle(heading ?? metaContent(html, "og:title") ?? imdbCode);
  const ratingRaw =
    /(?:IMDb[^0-9]{0,40})?(\d(?:\.\d)?)\s*(?:\/\s*10|از\s*10)/i.exec(plainText(html))?.[1];
  const yearRaw =
    /(?:سال(?:\s+های)?\s+(?:انتشار|پخش)|year)[^0-9]{0,30}(19\d{2}|20\d{2})/i.exec(
      plainText(html),
    )?.[1] ?? /\b(19\d{2}|20\d{2})\b/.exec(title)?.[1];
  const qualities = Array.from(new Set(links.map((link) => link.quality).filter(Boolean)));
  const groups = Array.from(new Set(links.map((link) => link.group).filter(Boolean)));

  return {
    id: imdbCode,
    title: title || imdbCode,
    imdbCode,
    imdbUrl: `https://www.imdb.com/title/${imdbCode}/`,
    type: "tvSeries",
    year: yearRaw ? Number(yearRaw) : null,
    imdbVotes: null,
    imdbRating: ratingRaw ? Number(ratingRaw) : null,
    groups,
    qualities,
    links,
    overview: plainText(metaContent(html, "og:description") ?? "") || null,
    posterUrl: metaContent(html, "og:image"),
    source: "DonyayeSerial",
    sourcePageUrl,
  };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, Math.max(1, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function readCachedFeed() {
  try {
    const cached = JSON.parse(await readFile(CACHE_FILE, "utf8"));
    return Array.isArray(cached?.items) ? cached : null;
  } catch {
    return null;
  }
}

async function writeAtomic(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  await writeFile(temporary, content);
  try {
    await rename(temporary, file);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

async function main() {
  const attempts = [];
  let first = null;
  const candidates = seriesFeedCandidates();
  for (const candidate of candidates) {
    const page = await fetchSeriesHtml(candidate);
    attempts.push({ url: candidate, resolvedUrl: page?.url || null, available: Boolean(page) });
    if (page && extractDetailUrls(page.html, page.url).length) { first = page; break; }
  }
  const resolvedBase = first?.url || BASE_URL;
  const pageHtml = await mapLimit(
    Array.from({ length: Math.max(0, PAGE_COUNT - 1) }, (_, index) => feedPageUrl(index + 2, resolvedBase)),
    Math.min(3, CONCURRENCY),
    first ? fetchSeriesHtml : async () => null,
  );
  const detailUrls = Array.from(
    new Set([first, ...pageHtml].filter(Boolean).flatMap((page) => extractDetailUrls(page.html, page.url))),
  );
  const details = await mapLimit(detailUrls, CONCURRENCY, async (url) => {
    const page = await fetchSeriesHtml(url);
    return page ? parseDetail(page.html, page.url) : null;
  });
  const items = details.filter(Boolean);

  if (items.length === 0) {
    const cached = await readCachedFeed();
    const fallback = cached ?? {
      sourceUrl: BASE_URL,
      scrapedAt: new Date().toISOString(),
      totalTitles: 0,
      totalLinks: 0,
      items: [],
    };
    const payload = {
      ...fallback,
      feedCheckAt: new Date().toISOString(),
      feedFallback: Boolean(cached),
      feedWarning: "The live series feed was unavailable; existing catalog data was preserved.",
      feedAttempts: attempts,
    };
    await writeAtomic(OUT_FILE, JSON.stringify(payload));
    console.log(
      JSON.stringify(
        {
          outFile: OUT_FILE,
          totalTitles: payload.totalTitles,
          totalLinks: payload.totalLinks,
          fallback: Boolean(cached),
          warning: payload.feedWarning,
        },
        null,
        2,
      ),
    );
    return;
  }

  const payload = {
    sourceUrl: resolvedBase,
    scrapedAt: new Date().toISOString(),
    totalTitles: items.length,
    totalLinks: items.reduce((sum, item) => sum + item.links.length, 0),
    items,
  };
  const content = JSON.stringify(payload);
  await writeAtomic(OUT_FILE, content);
  await writeAtomic(CACHE_FILE, content);
  console.log(
    JSON.stringify(
      {
        outFile: OUT_FILE,
        totalTitles: payload.totalTitles,
        totalLinks: payload.totalLinks,
        pages: PAGE_COUNT,
        detailPages: detailUrls.length,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
