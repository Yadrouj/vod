import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildArtists as buildCanonicalArtists, canonicalizeTrackArtists, cleanText as cleanCatalogText, normalizeComparable as normalizeCatalogText } from "./music-catalog.mjs";

const ROOT = "https://rozmusic.com";
const OUTPUT = path.join("public", "data", "music-index.json");
const MUSICS_FA_OUTPUT = path.join(".media-cache", "music", "musics-fa-source.json");
const CLASSICS_OUTPUT = path.join(".media-cache", "music", "persian-classics-source.json");
const FOREIGN_OUTPUT = path.join(".media-cache", "music", "aftab-foreign-source.json");
const REPORT = path.join("data", "rozmusic-status.json");
const CACHE = path.join(".media-cache", "rozmusic", "detail-cache.json");
const LISTING_CACHE = path.join(".media-cache", "rozmusic", "catalog-checkpoint.json");
const args = new Set(process.argv.slice(2));
const numberArg = (name, fallback) => {
  const value = process.argv.find((argument) => argument.startsWith(`${name}=`));
  return Math.max(1, Number(value?.slice(name.length + 1) ?? fallback) || fallback);
};
const nonNegativeArg = (name, fallback) => {
  const value = process.argv.find((argument) => argument.startsWith(`${name}=`));
  return Math.max(0, Number(value?.slice(name.length + 1) ?? fallback) || 0);
};
const full = args.has("--full");
const detailsOnly = args.has("--details-only");
// Rebuild the public catalog from the saved source caches without requesting
// listing or detail pages again. This is useful after a provider parser fix.
const rebuildOnly = args.has("--rebuild-only");
const selectedKind = args.has("--video-only") ? "video" : args.has("--music-only") ? "track" : "all";
const withDetails = !rebuildOnly && (detailsOnly || args.has("--details") || (!full && !args.has("--no-details")));
const musicPages = full ? 1777 : numberArg("--pages", 3);
const videoPages = full ? 60 : numberArg("--video-pages", 3);
const detailLimit = nonNegativeArg("--detail-limit", full ? 0 : 80);
const startPage = numberArg("--start-page", 1);
const endPage = nonNegativeArg("--end-page", 0);
const concurrency = full ? 1 : Math.min(5, numberArg("--concurrency", 3));
const delayMs = Math.max(full ? 1_000 : 160, numberArg("--delay-ms", full ? 1_000 : 400));
const timeoutMs = Math.max(8000, numberArg("--timeout-ms", 25000));
const maxRetries = Math.max(2, numberArg("--retries", 8));
const checkpointEvery = Math.max(1, numberArg("--checkpoint-every", 12));

const status = {
  state: "running",
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  full,
  rebuildOnly,
  pages: { music: { total: musicPages, complete: 0 }, video: { total: videoPages, complete: 0 } },
  tracks: { discovered: 0, new: 0, updated: 0, failures: 0 },
  details: { requested: 0, complete: 0, cached: 0 },
  rateLimited: 0,
  current: null,
  warnings: [],
};
let statusWrite = Promise.resolve();
let checkpointWrite = Promise.resolve();
let completedSinceCheckpoint = 0;
let nextRequestAt = 0;

async function main() {
  const [previous, detailCache, musicsFaSource, classicsSource, foreignSource, checkpoint] = await Promise.all([
    readJson(OUTPUT, emptyIndex()),
    readJson(CACHE, {}),
    readJson(MUSICS_FA_OUTPUT, []),
    readJson(CLASSICS_OUTPUT, { tracks: [] }),
    readJson(FOREIGN_OUTPUT, { tracks: [] }),
    readJson(LISTING_CACHE, emptyCheckpoint()),
  ]);
  const tracks = new Map(Object.entries(checkpoint.tracks ?? {}).map(([id, track]) => [id, track]));
  if (!tracks.size) {
    for (const track of previous.tracks ?? []) {
      if (track.id?.startsWith("roz-")) tracks.set(track.id, track);
    }
  }
  checkpoint.tracks = Object.fromEntries(tracks);
  checkpoint.completed ??= { track: {}, video: {} };
  status.pages.music.complete = Object.keys(checkpoint.completed.track).length;
  status.pages.video.complete = Object.keys(checkpoint.completed.video).length;
  const listings = detailsOnly || rebuildOnly ? [] : [
    ...Array.from({ length: musicPages }, (_, index) => ({ kind: "track", page: index + 1 })),
    ...Array.from({ length: videoPages }, (_, index) => ({ kind: "video", page: index + 1 })),
  ].filter(({ kind, page }) => {
    if (selectedKind !== "all" && kind !== selectedKind) return false;
    if (kind === "track" && (page < startPage || (endPage > 0 && page > endPage))) return false;
    return args.has("--refresh-listings") || !checkpoint.completed[kind]?.[page];
  });

  await mapPool(listings, concurrency, async ({ kind, page }) => {
    status.current = `${kind} page ${page}`;
    await saveStatus();
    try {
      const url = listingUrl(kind, page);
      const html = await fetchText(url);
      const parsed = parseListing(html, kind);
      for (const track of parsed) {
        const existing = tracks.get(track.id);
        tracks.set(track.id, mergeTrack(existing, track));
        if (!existing) status.tracks.new += 1;
        else status.tracks.updated += 1;
      }
      status.tracks.discovered += parsed.length;
      status.pages[kind === "track" ? "music" : "video"].complete += 1;
      checkpoint.completed[kind][page] = new Date().toISOString();
      checkpoint.tracks = Object.fromEntries(tracks);
      await saveCheckpoint(checkpoint);
    } catch (error) {
      status.tracks.failures += 1;
      status.warnings.push(`${kind} page ${page}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await saveStatus();
    await sleep(delayMs);
  });

  if (withDetails) {
    const candidates = [...tracks.values()]
      .filter((track) => selectedKind === "all" || track.kind === selectedKind)
      .filter((track) => !detailCache[track.id] || Date.now() - Date.parse(detailCache[track.id].checkedAt ?? 0) > 14 * 24 * 60 * 60 * 1000)
      .slice(0, detailLimit || undefined);
    status.details.requested = candidates.length;
    await mapPool(candidates, concurrency, async (track) => {
      status.current = `details: ${track.title}`;
      await saveStatus();
      try {
        const detail = await parseDetail(fetchText(track.sourceUrl), track);
        tracks.set(track.id, mergeTrack(track, detail));
        detailCache[track.id] = { checkedAt: new Date().toISOString() };
        status.details.complete += 1;
        checkpoint.tracks = Object.fromEntries(tracks);
        await saveCheckpoint(checkpoint);
      } catch (error) {
        status.warnings.push(`detail ${track.sourceUrl}: ${error instanceof Error ? error.message : String(error)}`);
      }
      await saveStatus();
      await sleep(delayMs);
    });
  }

  const trackList = mergeProviderTracks([...tracks.values()], musicsFaSource, classicsSource.tracks ?? [], foreignSource.tracks ?? [])
    .map((track) => canonicalizeTrackArtists(track, track.sourceUrl))
    .sort((left, right) => (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "") || right.id.localeCompare(left.id));
  const index = {
    version: 1,
    source: "multi-source",
    updatedAt: new Date().toISOString(),
    scanned: { musicPages, videoPages, full },
    tracks: trackList,
    artists: buildCanonicalArtists(trackList),
    categories: [...new Set(trackList.map((track) => track.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fa")),
  };
  status.state = "complete";
  status.current = null;
  status.updatedAt = new Date().toISOString();
  checkpoint.tracks = Object.fromEntries(tracks);
  checkpoint.updatedAt = new Date().toISOString();
  await Promise.all([writeJsonAtomic(OUTPUT, index), writeJsonAtomic(CACHE, detailCache), writeJsonAtomic(LISTING_CACHE, checkpoint), writeJsonAtomic(REPORT, status)]);
  console.log(JSON.stringify({ tracks: index.tracks.length, artists: index.artists.length, ...status.tracks, scanned: index.scanned }, null, 2));
}

function listingUrl(kind, page) {
  const root = kind === "video" ? "music-video" : "music";
  return page === 1 ? `${ROOT}/${root}` : `${ROOT}/${root}/page/${page}`;
}

function parseListing(html, kind) {
  const articles = html.match(/<article\b[\s\S]*?<\/article>/gi) ?? [];
  return articles.map((article) => parseArticle(article, kind)).filter(Boolean);
}

function parseArticle(article, kind) {
  const titleMatch = article.match(/<h[12][^>]*class=["'][^"']*title[^"']*["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*title=["']([^"']+)["']/i)
    ?? article.match(/<h[12][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
  if (!titleMatch) return null;
  const sourceUrl = absolute(decodeHtml(titleMatch[1]));
  if (!sourceUrl.includes("rozmusic.com/")) return null;
  const title = cleanText(titleMatch[2]);
  const artistLinks = extractArtistLinks(article);
  const artist = artistLinks[0] ?? { name: "رز موزیک", slug: "rozmusic", sourceUrl: ROOT };
  const image = firstMatch(article, /(?:data-src|src)=["'](https:\/\/rozmusic\.com\/wp-content\/uploads\/[^"']+)/i);
  const date = cleanText(firstMatch(article, /<span[^>]*class=["'][^"']*date[^"']*["'][^>]*>([\s\S]*?)<\/span>/i));
  const category = cleanText(firstMatch(article, /<span[^>]*class=["'][^"']*cat[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)) || (kind === "video" ? "موزیک ویدیو" : "آهنگ");
  const text = cleanText(firstMatch(article, /<div[^>]*class=["'][^"']*text[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class=["'][^"']*dl2/i));
  const english = cleanText((text.match(/Download New Music(?: Video)?\s+(.+)/i) ?? [])[1]) || title;
  const parsedEnglish = splitArtistAndTitle(english);
  const urls = extractMediaUrls(article);
  const sources = makeSources(urls);
  return {
    id: idFromUrl(sourceUrl),
    kind,
    title: parsedEnglish.title,
    persianTitle: title,
    artist,
    artists: artistLinks.length ? artistLinks : [artist],
    coverUrl: image ? absolute(decodeHtml(image)) : null,
    description: text || null,
    sourceUrl,
    matchKey: parsedEnglish.matchKey,
    publishedAt: null,
    displayDate: date || null,
    category,
    folder: parseFolder(urls[0] ?? ""),
    sources,
  };
}

async function parseDetail(htmlPromise, track) {
  const html = await htmlPromise;
  const image = firstMatch(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i);
  const publishedAt = firstMatch(html, /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)/i);
  const description = cleanText(firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i));
  const content = firstMatch(html, /<article\b[\s\S]*?<div[^>]*class=["'][^"']*text[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  const urls = extractMediaUrls(html);
  const artists = extractArtistLinks(content || html);
  return {
    ...track,
    coverUrl: image ? absolute(decodeHtml(image)) : track.coverUrl,
    description: description || track.description,
    publishedAt: publishedAt || track.publishedAt,
    artists: artists.length ? artists : track.artists,
    artist: artists[0] ?? track.artist,
    folder: parseFolder(urls[0] ?? track.sources[0]?.url ?? ""),
    sources: makeSources(urls.length ? urls : track.sources.map((source) => source.url)),
  };
}

function extractArtistLinks(html) {
  const values = [];
  for (const match of html.matchAll(/<a[^>]+href=["']([^"']*\/tag\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const name = cleanText(match[2]);
    if (!name || /دانلود|موزیک ویدیو|ریمیکس|آهنگ (شاد|غمگین)|new music/i.test(name)) continue;
    const sourceUrl = absolute(decodeHtml(match[1]));
    const slug = decodeURIComponent(sourceUrl.split("/tag/")[1]?.replace(/\/$/, "") ?? "").toLocaleLowerCase();
    if (slug && !values.some((artist) => artist.slug === slug)) values.push({ slug, name, sourceUrl });
  }
  return values;
}

function extractMediaUrls(html) {
  const urls = [];
  for (const match of html.matchAll(/(?:href|src)=["'](https?:\/\/dl\.rozmusic\.com\/[^"']+\.(?:mp3|m4a|aac|flac|mp4|mkv)(?:\?[^"']*)?)["']/gi)) {
    const url = decodeHtml(match[1]);
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

function makeSources(urls) {
  return urls.map((url, index) => ({
    url,
    label: qualityFromUrl(url) || (index === 0 ? "Direct download" : "Online stream"),
    quality: qualityFromUrl(url),
    kind: index === 0 ? "download" : "stream",
    provider: "rozmusic",
    basePath: basePath(url),
  }));
}

function parseFolder(url) {
  try {
    const parts = decodeURIComponent(new URL(url).pathname).split("/").filter(Boolean);
    const musicIndex = parts.findIndex((part) => part === "Music" || part === "Music Video");
    const slice = musicIndex >= 0 ? parts.slice(musicIndex) : [];
    return { root: slice[0] === "Music Video" ? "Music Video" : slice[0] === "Music" ? "Music" : "Unknown", year: slice[1] ?? null, month: slice[2] ?? null, day: slice[3] ?? null };
  } catch {
    return { root: "Unknown", year: null, month: null, day: null };
  }
}

function mergeTrack(previous, next) {
  if (!previous) return next;
  const sources = [...next.sources, ...previous.sources].filter((source, index, all) => all.findIndex((candidate) => candidate.url === source.url) === index);
  return { ...previous, ...next, coverUrl: next.coverUrl ?? previous.coverUrl, description: next.description ?? previous.description, publishedAt: next.publishedAt ?? previous.publishedAt, sources };
}

function mergeProviderTracks(rozTracks, ...providerTrackLists) {
  const byIdentity = new Map();
  const byTitle = new Map();
  for (const track of rozTracks) {
    byIdentity.set(trackIdentity(track), track);
    const titleKey = normalizeComparable(track.title);
    if (titleKey) byTitle.set(titleKey, track);
  }
  for (const sourceTrack of providerTrackLists.flat()) {
    const key = trackIdentity(sourceTrack);
    const existing = byIdentity.get(key) ?? byTitle.get(normalizeComparable(sourceTrack.title));
    if (existing) {
      const merged = mergeTrack(existing, sourceTrack);
      byIdentity.set(trackIdentity(existing), merged);
      byTitle.set(normalizeComparable(merged.title), merged);
    } else {
      byIdentity.set(key, sourceTrack);
      byTitle.set(normalizeComparable(sourceTrack.title), sourceTrack);
    }
  }
  return [...new Map([...byIdentity.values()].map((track) => [track.id, track])).values()];
}

function trackIdentity(track) { return track.matchKey || normalizeComparable(`${track.title} ${track.artists?.[0]?.name ?? track.artist?.name ?? ""}`); }
function normalizeComparable(value) { return normalizeCatalogText(value); }
function splitArtistAndTitle(value) {
  const cleaned = value.replace(/\s+With Text.*$/i, "").replace(/\s+On Music-fa.*$/i, "").trim();
  const canonicalParts = cleaned.split(/\s+(?:\u2013|\u2014|-)\s+/);
  if (canonicalParts.length >= 2) {
    const artist = canonicalParts.shift()?.trim() ?? "";
    const title = canonicalParts.join(" \u2013 ").trim();
    return { title: title || cleaned, englishArtist: artist, matchKey: normalizeComparable(`${artist} ${title || cleaned}`) };
  }
  const parts = cleaned.split(/\s+[–-]\s+/);
  if (parts.length >= 2) {
    const artist = parts.shift()?.trim() ?? "";
    const title = parts.join(" – ").trim();
    return { title: title || cleaned, englishArtist: artist, matchKey: normalizeComparable(`${artist} ${title || cleaned}`) };
  }
  return { title: cleaned || value, englishArtist: "", matchKey: normalizeComparable(cleaned || value) };
}
function basePath(url) { try { const parsed = new URL(url); const parts = parsed.pathname.split("/").filter(Boolean); return `${parsed.origin}/${parts.slice(0, Math.min(parts.length - 1, 4)).join("/")}/`; } catch { return null; } }

function idFromUrl(url) { return `roz-${createHash("sha1").update(url).digest("hex").slice(0, 14)}`; }
function firstMatch(value, pattern) { return (value.match(pattern) ?? [])[1] ?? ""; }
function absolute(value) { try { return new URL(value, ROOT).toString(); } catch { return value; } }
function cleanText(value = "") { return cleanCatalogText(value); }
function decodeHtml(value = "") { return value.replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code))).replace(/&amp;/g, "&").replace(/&#8211;/g, "–").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"'); }
function qualityFromUrl(url) { const value = decodeURIComponent(url); const match = value.match(/(?:^|[\s_.(-])(2160|1440|1080|720|480|360)p(?:[\s_.)-]|$)/i); if (match) return `${match[1]}p`; return /\(320\)|320kbps/i.test(value) ? "320kbps" : /\(128\)|128kbps/i.test(value) ? "128kbps" : null; }
async function saveStatus() {
  status.updatedAt = new Date().toISOString();
  const snapshot = JSON.parse(JSON.stringify(status));
  statusWrite = statusWrite.catch(() => undefined).then(() => writeJsonAtomic(REPORT, snapshot));
  await statusWrite;
}
async function fetchText(url) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    await waitForRequestSlot();
    try {
      const response = await fetch(url, { headers: { "user-agent": "SarvNema music catalog updater/1.0 (+https://sarvnema.ir)", "accept-language": "fa-IR,fa;q=0.9,en;q=0.8" }, signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok) return new TextDecoder("utf-8").decode(await response.arrayBuffer());
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`${response.status} ${response.statusText}`);
        if (response.status === 429) status.rateLimited += 1;
        const retryAfter = Number(response.headers.get("retry-after"));
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : Math.min(120_000, 5_000 * 2 ** (attempt - 1));
        status.current = `Cooling down ${Math.ceil(backoff / 1000)}s after ${response.status}`;
        await saveStatus();
        await sleep(backoff + Math.floor(Math.random() * 800));
        continue;
      }
      throw new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      const backoff = Math.min(60_000, 1_500 * 2 ** (attempt - 1));
      await sleep(backoff + Math.floor(Math.random() * 400));
    }
  }
  throw lastError ?? new Error("Unable to fetch source page.");
}
async function waitForRequestSlot() {
  const now = Date.now();
  const wait = Math.max(0, nextRequestAt - now);
  nextRequestAt = Math.max(now, nextRequestAt) + delayMs;
  if (wait) await sleep(wait);
}
async function mapPool(values, workers, callback) { let cursor = 0; await Promise.all(Array.from({ length: Math.min(workers, values.length || 1) }, async () => { while (true) { const index = cursor++; if (index >= values.length) return; await callback(values[index]); } })); }
async function readJson(file, fallback) { try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; } }
async function writeJsonAtomic(file, value) { await mkdir(path.dirname(file), { recursive: true }); const temporary = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`; await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, file); }
function emptyIndex() { return { version: 1, source: "multi-source", updatedAt: "", scanned: { musicPages: 0, videoPages: 0, full: false }, tracks: [], artists: [], categories: [] }; }
function emptyCheckpoint() { return { version: 1, updatedAt: "", tracks: {}, completed: { track: {}, video: {} } }; }
async function saveCheckpoint(checkpoint) {
  completedSinceCheckpoint += 1;
  if (completedSinceCheckpoint < checkpointEvery) return;
  completedSinceCheckpoint = 0;
  checkpoint.updatedAt = new Date().toISOString();
  const snapshot = JSON.parse(JSON.stringify(checkpoint));
  checkpointWrite = checkpointWrite.catch(() => undefined).then(() => writeJsonAtomic(LISTING_CACHE, snapshot));
  await checkpointWrite;
}
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

main().catch(async (error) => { status.state = "failed"; status.error = error instanceof Error ? error.message : String(error); status.updatedAt = new Date().toISOString(); await writeJsonAtomic(REPORT, status).catch(() => undefined); console.error(error); process.exitCode = 1; });
