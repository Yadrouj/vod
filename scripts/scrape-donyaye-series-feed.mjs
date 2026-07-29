import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

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

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml",
        "accept-language": "fa,en;q=0.8",
      },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function feedPageUrl(index) {
  if (index === 1) return BASE_URL;
  return new URL(`page/${index}/`, ensureSlash(BASE_URL)).toString();
}

function ensureSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function extractDetailUrls(html) {
  const urls = new Set();
  const base = new URL(BASE_URL);
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    try {
      const url = new URL(decodeEntities(match[1]), BASE_URL);
      if (url.hostname !== base.hostname) continue;
      if (!/^\/series\/(?!page\/)[^/?#]+\/?$/i.test(url.pathname)) continue;
      urls.add(ensureSlash(url.toString()));
    } catch {
      // Ignore malformed links from widgets and ad markup.
    }
  }
  return Array.from(urls);
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
    if (!/\/DonyayeSerial\//i.test(url) || !VIDEO_RE.test(url)) continue;
    const labelText = plainText(match[2]);
    const fileName = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
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

function parseDetail(html, sourcePageUrl) {
  const links = extractDownloadLinks(html, sourcePageUrl);
  const imdbCode =
    /imdb\.com\/title\/(tt\d+)/i.exec(html)?.[1] ??
    /\/(tt\d{5,12})(?:\/|["'])/i.exec(html)?.[1] ??
    "";
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
  const pageHtml = await mapLimit(
    Array.from({ length: PAGE_COUNT }, (_, index) => feedPageUrl(index + 1)),
    Math.min(3, CONCURRENCY),
    fetchText,
  );
  const detailUrls = Array.from(
    new Set(pageHtml.filter(Boolean).flatMap((html) => extractDetailUrls(html))),
  );
  const details = await mapLimit(detailUrls, CONCURRENCY, async (url) => {
    const html = await fetchText(url);
    return html ? parseDetail(html, url) : null;
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
    sourceUrl: BASE_URL,
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
