import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildArtists, cleanText, slugify, uniqueBy } from "./music-catalog.mjs";

const OUTPUT = path.join(".media-cache", "music", "persian-classics-source.json");
const INDEX = path.join("public", "data", "music-index.json");
const STATUS = path.join("data", "persian-classics-status.json");
const args = new Set(process.argv.slice(2));
const OLD_PERSIAN_CATEGORY = "\u0645\u0648\u0633\u06cc\u0642\u06cc \u0642\u062f\u06cc\u0645\u06cc \u0641\u0627\u0631\u0633\u06cc";
const OLD_PERSIAN_DESCRIPTION = "\u06af\u0644\u0686\u06cc\u0646 \u0645\u0648\u0633\u06cc\u0642\u06cc \u0642\u062f\u06cc\u0645\u06cc \u0641\u0627\u0631\u0633\u06cc";
const UNKNOWN_ARTIST = "\u062e\u0648\u0627\u0646\u0646\u062f\u0647 \u0646\u0627\u0645\u0634\u062e\u0635";
const LEGACY_ROMAN_ARTISTS = ["Aghasi", "Ahmad Azad", "Alireza Eftekhari", "Ebi", "Dariush", "Moein", "Fereydoon Foroughi", "Farhad", "Googoosh", "Hayedeh", "Mahasti", "Vigen", "Shakila", "Iraj Mahdian", "Mohammadreza Shajarian", "Habib", "Sattar", "Leila Forouhar", "Mansour", "Siavash Ghomayshi", "Shahram Shabpareh", "Kourosh Yaghmaei", "Shohreh", "Naser Cheshmazar", "Mohsen Yeganeh", "Mohsen Chavoshi"];
const SOURCE_PAGES = [
  { provider: "download1music", url: "https://download1music.ir/old/", kind: "page" },
  { provider: "sevilmusics", url: "https://sevilmusics.com/topic/ghadimi/", kind: "article" },
  { provider: "aftabmusic", url: "https://aftabmusic.com/%D8%A2%D9%87%D9%86%DA%AF-%D9%87%D8%A7%DB%8C-%D9%82%D8%AF%DB%8C%D9%85%DB%8C-%D8%A7%D8%B2-%D8%AE%D9%88%D8%A7%D9%86%D9%86%D8%AF%DA%AF%D8%A7%D9%86-%D8%B2%D9%86/", kind: "jsonld" },
  { provider: "musics-mehr", url: "https://musics-mehr.com/%D8%B1%DB%8C%D9%85%DB%8C%DA%A9%D8%B3-%D8%AE%D9%88%D8%A7%D9%86%D9%86%D8%AF%D9%87-%D9%87%D8%A7%DB%8C-%D9%82%D8%AF%DB%8C%D9%85%DB%8C/", kind: "jsonld" },
  { provider: "aftabmusic", url: "https://aftabmusic.com/%D8%A8%D9%87%D8%AA%D8%B1%DB%8C%D9%86-%D8%A2%D9%87%D9%86%DA%AF-%D9%87%D8%A7%DB%8C-%D9%85%D8%B9%DB%8C%D9%86%D8%8C-%D8%A7%D8%A8%DB%8C-%D9%88-%D8%AF%D8%A7%D8%B1%DB%8C%D9%88%D8%B4/", kind: "jsonld" },
];

async function main() {
  const results = [];
  const warnings = [];
  for (const source of SOURCE_PAGES) {
    try {
      const html = await fetchText(source.url);
      const cover = openGraphImage(html);
      const tracks = source.kind === "page" ? parseDownload1Music(html, source, cover) : source.kind === "article" ? parseSevil(html, source, cover) : parseAftabLikePage(html, source, cover);
      results.push(...tracks);
      await sleep(700);
    } catch (error) {
      warnings.push(`${source.url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const tracks = uniqueBy(results, (track) => track.sources[0]?.url).filter((track) => track.sources.length > 0);
  const payload = { updatedAt: new Date().toISOString(), tracks, artists: buildArtists(tracks), warnings };
  await writeJson(OUTPUT, payload);
  if (args.has("--merge")) await mergeIntoIndex(tracks);
  await writeJson(STATUS, { state: "complete", updatedAt: payload.updatedAt, tracks: tracks.length, artists: payload.artists.length, warnings });
  console.log(JSON.stringify({ tracks: tracks.length, artists: payload.artists.length, warnings: warnings.length }, null, 2));
}

function parseDownload1Music(html, source, cover) {
  const entries = html.split(/<hr\s*\/?>/i);
  const tracks = [];
  for (const entry of entries) {
    const url = first(entry, /(?:src|href)=["'](https?:\/\/[^"']+\.(?:mp3|m4a|aac|flac))(?:\?[^"']*)?["']/i);
    if (!url) continue;
    const title = cleanText(first(entry, /<strong[^>]*>([\s\S]*?)<\/strong>/i)) || titleFromUrl(url);
    tracks.push(makeTrack({ title, url, source, cover, artist: resolveClassicArtist(title, url), description: OLD_PERSIAN_DESCRIPTION }));
  }
  return tracks;
}

function parseSevil(html, source, fallbackCover) {
  const tracks = [];
  for (const article of html.match(/<article\b[\s\S]*?<\/article>/gi) ?? []) {
    const url = first(article, /<audio[^>]+src=["']([^"']+\.(?:mp3|m4a|aac|flac))/i) || first(article, /href=["']([^"']+\.(?:mp3|m4a|aac|flac))/i);
    if (!url) continue;
    const title = cleanText(first(article, /<h2[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)) || cleanText(first(article, /<strong[^>]*>([\s\S]*?)<\/strong>/i)) || titleFromUrl(url);
    const cover = first(article, /<img[^>]+(?:data-src|src)=["']([^"']+)/i) || fallbackCover;
    tracks.push(makeTrack({ title, url, source, cover, artist: resolveClassicArtist(title, url), description: OLD_PERSIAN_DESCRIPTION }));
  }
  return tracks;
}

function parseAftabLikePage(html, source, fallbackCover) {
  const tracks = [];
  // AftabMusic exposes each audio item in an HTML data attribute. The other
  // archived pages often expose the same data in JSON-LD, so handle both.
  for (const article of html.match(/<article\b[\s\S]*?<\/article>/gi) ?? []) {
    const encoded = first(article, /data-dpp-track=["']([^"']+)["']/i);
    if (!encoded) continue;
    try {
      const item = JSON.parse(decodeEntities(encoded));
      const audio = item.url;
      if (!audio || !/\.(?:mp3|m4a|aac|flac)(?:$|\?)/i.test(audio)) continue;
      const title = cleanText(item.title || titleFromUrl(audio));
      const cover = item.cover || first(article, /<img[^>]+(?:data-src|src)=["']([^"']+)/i) || fallbackCover;
      tracks.push(makeTrack({ title, url: audio, source, cover, artist: resolveClassicArtist(title, audio), description: OLD_PERSIAN_DESCRIPTION }));
    } catch {
      // A malformed card must not prevent the rest of the archive from importing.
    }
  }
  for (const raw of html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? []) {
    const value = first(raw, /<script[^>]*>([\s\S]*?)<\/script>/i).trim();
    try {
      for (const item of flattenJsonLd(JSON.parse(value))) {
        const audio = item.audio?.contentUrl || item.contentUrl;
        if (!audio || !/\.(?:mp3|m4a|aac|flac)(?:$|\?)/i.test(audio)) continue;
        const title = cleanText(item.name || titleFromUrl(audio));
        tracks.push(makeTrack({ title, url: audio, source, cover: item.image || item.thumbnailUrl || fallbackCover, artist: resolveClassicArtist(title, audio), description: cleanText(item.description || OLD_PERSIAN_DESCRIPTION) }));
      }
    } catch {
      // Invalid JSON-LD is common in WordPress output; other blocks still import.
    }
  }
  // Some WordPress templates have neither usable JSON-LD nor a card payload.
  // Fall back to direct media anchors and retain a nearby meaningful heading.
  for (const match of html.matchAll(/(?:href|src)=["']([^"']+\.(?:mp3|m4a|aac|flac)(?:\?[^"']*)?)["']/gi)) {
    const url = absolute(decodeEntities(match[1]), source.url);
    if (!url) continue;
    const before = html.slice(Math.max(0, match.index - 1600), match.index);
    const title = cleanText(lastHeading(before)) || titleFromUrl(url);
    tracks.push(makeTrack({ title, url, source, cover: fallbackCover, artist: resolveClassicArtist(title, url), description: OLD_PERSIAN_DESCRIPTION }));
  }
  return uniqueBy(tracks, (track) => track.sources[0]?.url);
}

function makeTrack({ title, url, source, cover, artist, description }) {
  const normalizedUrl = absolute(url, source.url);
  const displayTitle = cleanClassicTitle(title);
  const cleanTitle = title.replace(/^(?:دانلود\s+)?(?:آهنگ|موزیک|ترانه)\s+(?:قدیمی\s+)?/u, "").trim();
  const artistRef = { name: artist, slug: slugify(artist), sourceUrl: source.url };
  return {
    id: `classic-${createHash("sha1").update(normalizedUrl).digest("hex").slice(0, 14)}`,
    kind: "track",
    title: displayTitle || titleFromUrl(normalizedUrl),
    persianTitle: displayTitle || titleFromUrl(normalizedUrl),
    artist: artistRef,
    artists: [artistRef],
    coverUrl: absolute(cover || "", source.url) || null,
    description,
    sourceUrl: source.url,
    matchKey: slugify(`${artist} ${cleanTitle}`),
    publishedAt: null,
    category: OLD_PERSIAN_CATEGORY,
    folder: { root: "Unknown", year: null, month: null, day: null },
    sources: [{ url: normalizedUrl, label: "Online stream", quality: null, kind: "stream", provider: source.provider, basePath: basePath(normalizedUrl), available: true, checkedAt: new Date().toISOString() }],
  };
}

function artistFromTitle(title, url) {
  const sourceName = decodeURIComponent(url).split("/").pop()?.replace(/\.(?:mp3|m4a|aac|flac).*$/i, "").split(/\s+-\s+/)[0]?.trim();
  const patterns = [
    /(?:از|خواننده[ٔه]?)\s+([آ-ی][آ-ی\s‌]{2,40}?)(?:\s+(?:با|به نام|آهنگ|ترانه)|$)/u,
    /([آ-ی][آ-ی\s‌]{2,40}?)\s+(?:آهنگ|ترانه|موسیقی)/u,
  ];
  for (const pattern of patterns) {
    const match = title.match(pattern)?.[1]?.trim();
    if (match && !/(?:قدیمی|خاطره|بهترین|گلچین)/u.test(match)) return match;
  }
  return sourceName && !/^unknown/i.test(sourceName) ? sourceName : UNKNOWN_ARTIST;
}

// Prefer the structured folder/file names from archive URLs. They are more
// reliable than SEO headlines such as "download song" or pages containing a
// long list of related singers.
function resolveClassicArtist(title, url) {
  try {
    const parts = decodeURIComponent(new URL(url).pathname).split("/").filter(Boolean);
    const folder = parts.at(-2)?.trim();
    if (usableClassicArtist(folder)) return folder;
    const filename = parts.at(-1)?.replace(/\.(?:mp3|m4a|aac|flac).*$/i, "") ?? "";
    const romanized = filename.replace(/[_.-]+/g, " ").replace(/\s+/g, " ").trim();
    const known = LEGACY_ROMAN_ARTISTS.find((name) => romanized.toLocaleLowerCase().startsWith(name.toLocaleLowerCase()));
    if (known) return known;
    const file = filename.split(/\s*(?:\u2013|\u2014|-)\s*/)[0]?.trim();
    if (usableClassicArtist(file)) return file;
  } catch {
    // The legacy heuristic below handles malformed URLs.
  }
  return artistFromTitle(title, url);
}

function usableClassicArtist(value) {
  const candidate = cleanText(value || "").trim();
  return Boolean(candidate)
    && candidate.length <= 64
    && !/\s+(?:vaveila|na|ye|del|ghalandarvar|shakhe|leyli|download1music)/i.test(candidate)
    && !/^(?:unknown(?:\s+artist)?|\u062f\u0627\u0646\u0644\u0648\u062f|\u0622\u0647\u0646\u06af|\u0627\u0647\u0646\u06af|\u0645\u0648\u0632\u06cc\u06a9|music|old|new)$/iu.test(candidate);
}

function cleanClassicTitle(value) {
  return cleanText(value)
    .replace(/^(?:\u062f\u0627\u0646\u0644\u0648\u062f\s+)?(?:\u0622\u0647\u0646\u06af|\u0627\u0647\u0646\u06af|\u0645\u0648\u0632\u06cc\u06a9|\u062a\u0631\u0627\u0646\u0647)\s+(?:\u0642\u062f\u06cc\u0645\u06cc\s+)?/u, "")
    .replace(/\s*(?:\+|\||\u0628\u0627\s+\u06a9\u06cc\u0641\u06cc\u062a|\u0645\u062a\u0646\s+(?:\u062a\u0631\u0627\u0646\u0647|\u0645\u0648\u0632\u06cc\u06a9)).*$/u, "")
    .trim();
}

function flattenJsonLd(value) {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (!value || typeof value !== "object") return [];
  return [value, ...(Array.isArray(value["@graph"]) ? value["@graph"].flatMap(flattenJsonLd) : [])];
}
function titleFromUrl(url) { return decodeURIComponent(url).split("/").pop()?.replace(/\.(?:mp3|m4a|aac|flac).*$/i, "").replace(/[_.]/g, " ").trim() || "موسیقی قدیمی"; }
function lastHeading(value) { const headings = [...value.matchAll(/<(?:h[1-4]|strong)[^>]*>([\s\S]*?)<\/(?:h[1-4]|strong)>/gi)]; return headings.at(-1)?.[1] ?? ""; }
function decodeEntities(value = "") { return value.replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&amp;/g, "&"); }
function openGraphImage(html) { return first(html, /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)/i) || first(html, /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i); }
function first(value, pattern) { return (value.match(pattern) ?? [])[1] ?? ""; }
function absolute(value, base) { try { return value ? new URL(value, base).toString() : ""; } catch { return ""; } }
function basePath(url) { try { const parsed = new URL(url); return `${parsed.origin}${parsed.pathname.slice(0, parsed.pathname.lastIndexOf("/") + 1)}`; } catch { return null; } }
async function fetchText(url) { const response = await fetch(url, { headers: { "user-agent": "SarvNema Persian classics catalog/1.0 (+https://sarvnema.ir)", "accept-language": "fa-IR,fa;q=0.9,en;q=0.8" }, signal: AbortSignal.timeout(30_000) }); if (!response.ok) throw new Error(`${response.status} ${response.statusText}`); return new TextDecoder("utf-8").decode(await response.arrayBuffer()); }
async function mergeIntoIndex(classics) { const index = await readJson(INDEX, null); if (!index) throw new Error("Music index is missing."); const tracks = uniqueBy([...classics, ...index.tracks], (track) => track.sources[0]?.url || track.id); index.tracks = tracks; index.artists = buildArtists(tracks); index.categories = [...new Set(tracks.map((track) => track.category).filter(Boolean))].sort((left, right) => left.localeCompare(right, "fa")); index.updatedAt = new Date().toISOString(); await writeJson(INDEX, index); }
async function readJson(file, fallback) { try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; } }
async function writeJson(file, value) { await mkdir(path.dirname(file), { recursive: true }); const temporary = `${file}.${process.pid}.${Date.now()}.tmp`; await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, file); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

main().catch((error) => { console.error(error); process.exitCode = 1; });
