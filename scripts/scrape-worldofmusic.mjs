import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanText, normalizeComparable, slugify, uniqueBy } from "./music-catalog.mjs";

const ROOT = "https://worldofmusic.ir";
const ARTISTS_URL = `${ROOT}/artists/`;
const SITEMAP_URL = `${ROOT}/sitemap-prod`;
const OUTPUT = path.join(".media-cache", "music", "worldofmusic-source.json");
const CHECKPOINT = path.join(".media-cache", "worldofmusic", "checkpoint.json");
const STATUS = path.join("data", "worldofmusic-status.json");
const args = new Set(process.argv.slice(2));

const numberArg = (name, fallback, minimum = 0) => {
  const raw = process.argv.find((argument) => argument.startsWith(`${name}=`));
  const value = Number(raw?.slice(name.length + 1) ?? fallback);
  return Math.max(minimum, Number.isFinite(value) ? value : fallback);
};

const concurrency = Math.min(4, numberArg("--concurrency", 2, 1));
const delayMs = Math.max(250, numberArg("--delay-ms", 450, 0));
const timeoutMs = Math.max(8_000, numberArg("--timeout-ms", 30_000, 1_000));
const retries = Math.max(2, numberArg("--retries", 4, 1));
const artistLimit = numberArg("--limit-artists", 0, 0);
const albumLimit = numberArg("--limit-albums", 0, 0);
const refreshArtists = args.has("--refresh-artists") || args.has("--refresh");
const refreshAlbums = args.has("--refresh-albums") || args.has("--refresh");
const includeSitemap = args.has("--include-sitemap");
const sitemapAlbumLimit = numberArg("--sitemap-albums", 0, 0);

const status = {
  state: "running",
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  artists: { discovered: 0, complete: 0, failures: 0 },
  albums: { discovered: 0, complete: 0, failures: 0 },
  tracks: { discovered: 0, playable: 0 },
  current: null,
  warnings: [],
};

let nextRequestAt = 0;
let checkpointWrite = Promise.resolve();
let statusWrite = Promise.resolve();

async function main() {
  const checkpoint = await readJson(CHECKPOINT, emptyCheckpoint());
  const listingHtml = await fetchText(ARTISTS_URL);
  const artistEntries = extractArtistEntries(listingHtml).slice(0, artistLimit || undefined);
  status.artists.discovered = artistEntries.length;

  await mapPool(artistEntries, concurrency, async (entry) => {
    const cached = checkpoint.artists[entry.slug];
    if (cached && !refreshArtists && cached.albumUrls?.length) {
      status.artists.complete += 1;
      return;
    }

    status.current = `artist: ${entry.slug}`;
    try {
      const html = await fetchText(entry.sourceUrl);
      checkpoint.artists[entry.slug] = parseArtistPage(html, entry);
      status.artists.complete += 1;
    } catch (error) {
      status.artists.failures += 1;
      status.warnings.push(`artist ${entry.sourceUrl}: ${message(error)}`);
      checkpoint.artists[entry.slug] = { ...entry, albumUrls: cached?.albumUrls ?? [], checkedAt: cached?.checkedAt ?? null };
    }
    await saveCheckpoint(checkpoint);
    await saveStatus();
  });

  if (includeSitemap) {
    status.current = "discovering album sitemap";
    try {
      checkpoint.sitemapAlbums = extractSitemapAlbums(await fetchText(SITEMAP_URL));
    } catch (error) {
      status.warnings.push(`sitemap ${SITEMAP_URL}: ${message(error)}`);
    }
    await saveCheckpoint(checkpoint);
    await saveStatus();
  }

  const albumEntries = collectAlbumEntries(checkpoint, albumLimit, includeSitemap, sitemapAlbumLimit);
  status.albums.discovered = albumEntries.length;
  await mapPool(albumEntries, concurrency, async (entry) => {
    const cached = checkpoint.albums[entry.slug];
    if (cached && !refreshAlbums && cached.tracks?.length) {
      status.albums.complete += 1;
      return;
    }

    status.current = `album: ${entry.slug}`;
    try {
      const html = await fetchText(entry.sourceUrl);
      checkpoint.albums[entry.slug] = parseAlbumPage(html, entry);
      status.albums.complete += 1;
      status.tracks.discovered += checkpoint.albums[entry.slug].tracks.length;
      status.tracks.playable += checkpoint.albums[entry.slug].tracks.filter((track) => track.sources?.some((source) => source.kind === "stream")).length;
    } catch (error) {
      status.albums.failures += 1;
      status.warnings.push(`album ${entry.sourceUrl}: ${message(error)}`);
    }
    await saveCheckpoint(checkpoint);
    await saveStatus();
  });

  const albums = Object.values(checkpoint.albums);
  const tracks = uniqueBy(albums.flatMap((album) => album.tracks ?? []), (track) => track.id || track.sources?.[0]?.url);
  const artistProfiles = Object.values(checkpoint.artists)
    .map(toArtistProfile)
    .filter((profile) => profile.slug && profile.name);

  status.state = "complete";
  status.current = null;
  status.tracks.discovered = tracks.length;
  status.tracks.playable = tracks.filter((track) => track.sources?.some((source) => source.kind === "stream")).length;
  checkpoint.updatedAt = new Date().toISOString();
  await Promise.all([
    writeJsonAtomic(OUTPUT, {
      version: 1,
      source: "worldofmusic",
      sourceUrl: ARTISTS_URL,
      updatedAt: checkpoint.updatedAt,
      artists: artistProfiles,
      albums: albums.map(({ tracks: _tracks, ...album }) => ({ ...album, trackCount: _tracks?.length ?? 0 })),
      tracks,
    }),
    saveCheckpoint(checkpoint),
    saveStatus(),
  ]);
  console.log(JSON.stringify({ source: "worldofmusic", artists: artistProfiles.length, albums: albums.length, tracks: tracks.length, playable: status.tracks.playable, failures: status.artists.failures + status.albums.failures }, null, 2));
}

function extractArtistEntries(html) {
  const entries = [];
  for (const match of html.matchAll(/<a[^>]+href=["'](?:https?:\/\/worldofmusic\.ir)?\/artist\/([^"'#?]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const slug = decodeURIComponent(match[1]).toLocaleLowerCase();
    const body = match[2];
    const image = first(body, /(?:data-src|src)=["'](https?:\/\/worldofmusic\.ir\/[^"']+)/i);
    const name = cleanText(first(body, /class=["'][^"']*topartistname[^"']*["'][^>]*>([\s\S]*?)<\//i)) || cleanText(first(body, /alt=["']([^"']+)/i)).replace(/^آثار\s+/u, "");
    if (!slug || !name || entries.some((entry) => entry.slug === slug)) continue;
    entries.push({ slug, name, sourceUrl: `${ROOT}/artist/${encodeURIComponent(slug)}`, profileImageUrl: image || `${ROOT}/upls/artists/${encodeURIComponent(slug)}.jpg` });
  }
  return entries;
}

function parseArtistPage(html, entry) {
  const fname = cleanText(first(html, /<h1[^>]*class=["'][^"']*fname[^"']*["'][^>]*>([\s\S]*?)<\//i));
  const ename = cleanText(first(html, /<h2[^>]*class=["'][^"']*ename[^"']*["'][^>]*>([\s\S]*?)<\//i));
  const image = first(html, /<div[^>]*class=["'][^"']*aimg[^"']*["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)/i) || entry.profileImageUrl;
  const bio = cleanText(first(html, /<div[^>]*class=["'][^"']*atxt[^"']*["'][^>]*>([\s\S]*?)<\/div>/i));
  const albumUrls = uniqueBy([...html.matchAll(/href=["'](?:https?:\/\/worldofmusic\.ir)?\/p\/([^"'#?]+)["']/gi)].map((match) => ({
    slug: decodeURIComponent(match[1]),
    sourceUrl: `${ROOT}/p/${encodeURIComponent(decodeURIComponent(match[1]))}`,
  })), (album) => album.slug);
  return { ...entry, name: fname || entry.name, aliases: uniqueBy([ename, entry.name].filter(Boolean), (value) => slugify(value)).filter((value) => slugify(value) !== entry.slug), profileImageUrl: absolute(image), bio: bio || null, albumUrls, checkedAt: new Date().toISOString() };
}

function collectAlbumEntries(checkpoint, limit, includeSitemap = false, sitemapLimit = 0) {
  const bySlug = new Map();
  for (const artist of Object.values(checkpoint.artists)) {
    for (const album of artist.albumUrls ?? []) {
      const current = bySlug.get(album.slug) ?? { ...album, artistSlugs: [] };
      if (!current.artistSlugs.includes(artist.slug)) current.artistSlugs.push(artist.slug);
      bySlug.set(album.slug, current);
    }
  }
  if (includeSitemap) {
    let addedFromSitemap = 0;
    for (const album of checkpoint.sitemapAlbums ?? []) {
      if (bySlug.has(album.slug)) continue;
      if (sitemapLimit > 0 && addedFromSitemap >= sitemapLimit) break;
      bySlug.set(album.slug, { ...album, artistSlugs: [] });
      addedFromSitemap += 1;
    }
  }
  return [...bySlug.values()].sort((left, right) => left.slug.localeCompare(right.slug)).slice(0, limit || undefined);
}

function extractSitemapAlbums(xml) {
  return uniqueBy([...String(xml).matchAll(/<loc>\s*(https?:\/\/worldofmusic\.ir\/p\/[^<]+)\s*<\/loc>/gi)].map((match) => {
    const sourceUrl = decodeXml(match[1]);
    return { slug: decodeURIComponent(sourceUrl.split("/p/")[1] ?? ""), sourceUrl };
  }), (album) => album.slug);
}

function parseAlbumPage(html, entry) {
  const schema = parseAlbumSchema(html);
  const albumId = first(html, /(?:coverm|cover)\/(\d+)\.(?:jpg|jpeg|png)/i) || hash(entry.slug).slice(0, 12);
  const title = cleanText(schema?.name || first(html, /<h1[^>]*class=["'][^"']*(?:prodtitle|fname|title)[^"']*["'][^>]*>([\s\S]*?)<\//i) || entry.slug.replace(/-/g, " "));
  const coverUrl = absolute(schema?.image || `${ROOT}/upls/coverm/${albumId}.jpg`);
  const genres = uniqueBy((Array.isArray(schema?.genre) ? schema.genre : schema?.genre ? [schema.genre] : []).map(cleanText).filter(Boolean), (genre) => normalizeComparable(genre));
  const artistSlugs = uniqueBy([
    ...(entry.artistSlugs ?? []),
    ...[...html.matchAll(/href=["'](?:https?:\/\/worldofmusic\.ir)?\/artist\/([^"'#?]+)["']/gi)].map((match) => decodeURIComponent(match[1]).toLocaleLowerCase()),
  ], (slug) => slug);
  const tracks = parseCurPlaylist(html).filter((item) => item.url && !/\/upls\/sample\//i.test(item.url)).map((item, index) => ({
    id: item.trackId ? `worldofmusic-${item.trackId}` : `worldofmusic-${hash(`${entry.slug}:${item.url}`)}`,
    kind: "track",
    title: item.title || `${title} ${index + 1}`,
    persianTitle: item.title || `${title} ${index + 1}`,
    artist: { name: item.artist || artistSlugs[0] || "World of Music", slug: slugify(item.artist || artistSlugs[0] || "world-of-music"), sourceUrl: artistSlugs[0] ? `${ROOT}/artist/${encodeURIComponent(artistSlugs[0])}` : ROOT },
    artists: [{ name: item.artist || artistSlugs[0] || "World of Music", slug: slugify(item.artist || artistSlugs[0] || "world-of-music"), sourceUrl: artistSlugs[0] ? `${ROOT}/artist/${encodeURIComponent(artistSlugs[0])}` : ROOT }],
    coverUrl,
    description: cleanText(schema?.description || "") || null,
    sourceUrl: entry.sourceUrl,
    matchKey: normalizeComparable(`${item.artist || artistSlugs[0] || ""} ${item.title}`),
    publishedAt: String(schema?.datePublished || "") || null,
    category: genres[0] || "World of Music",
    moods: genres,
    album: { id: `worldofmusic-album-${albumId}`, title, sourceUrl: entry.sourceUrl, coverUrl, publishedAt: String(schema?.datePublished || "") || null, genres, moods: genres },
    folder: { root: "Unknown", year: null, month: null, day: null },
    sources: [{ url: item.url, label: item.quality || "Online / download", quality: item.quality, kind: "stream", provider: "worldofmusic", basePath: basePath(item.url) }],
  }));
  return { ...entry, albumId, title, coverUrl, artistSlugs, genres, moods: genres, publishedAt: String(schema?.datePublished || "") || null, tracks, checkedAt: new Date().toISOString() };
}

function parseCurPlaylist(html) {
  const script = first(html, /curplaylist\s*=\s*\[([\s\S]*?)\]\s*;/i);
  const items = [];
  for (const match of script.matchAll(/\{[\s\S]*?\}/g)) {
    const object = match[0];
    const url = decodeUrl(first(object, /\bsrc\s*:\s*["']([^"']+)/i));
    if (!url || !/\.(?:mp3|m4a|aac|flac|ogg)(?:\?|$)/i.test(url)) continue;
    items.push({
      url,
      title: cleanText(first(object, /\btitle\s*:\s*["']([^"']+)/i)),
      artist: cleanText(first(object, /\bartist\s*:\s*["']([^"']+)/i)),
      trackId: first(object, /\btrackId\s*:\s*(\d+)/i),
      quality: qualityFromUrl(url),
    });
  }
  return uniqueBy(items, (item) => item.url);
}

function parseAlbumSchema(html) {
  const raw = first(html, /<script[^>]+id=["']schema-MusicAlbum["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!raw) return null;
  try { return JSON.parse(raw.trim()); } catch { return null; }
}

function toArtistProfile(artist) {
  return { slug: artist.slug, name: artist.name, aliases: artist.aliases ?? [], sourceUrl: artist.sourceUrl, profileSourceUrl: artist.sourceUrl, profileImageUrl: artist.profileImageUrl || null, bio: artist.bio || null };
}

function qualityFromUrl(url) {
  const value = decodeURIComponent(url);
  return value.match(/(?:^|[\s_.(-])(320|256|192|128)\s*kbps/i)?.[1] ? `${value.match(/(?:^|[\s_.(-])(320|256|192|128)\s*kbps/i)[1]}kbps` : null;
}

function basePath(url) {
  try { const parsed = new URL(url); const parts = parsed.pathname.split("/").filter(Boolean); return `${parsed.origin}/${parts.slice(0, Math.max(1, parts.length - 1)).join("/")}/`; } catch { return null; }
}

function absolute(value) { try { return new URL(value, ROOT).toString(); } catch { return value; } }
function decodeUrl(value) { return value.replace(/\\(["'])/g, "$1").replace(/\\x([\da-f]{2})/gi, (_, code) => String.fromCharCode(parseInt(code, 16))).replace(/&amp;/g, "&"); }
function decodeXml(value) { return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim(); }
function first(value, pattern) { return (String(value).match(pattern) ?? [])[1] ?? ""; }
function hash(value) { return createHash("sha1").update(value).digest("hex"); }
function message(error) { return error instanceof Error ? error.message : String(error); }

async function fetchText(url) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    await waitForRequestSlot();
    try {
      const response = await fetch(url, { headers: { "user-agent": "SarvNema music catalog updater/1.0 (+https://sarvnema.ir)", "accept-language": "fa-IR,fa;q=0.9,en;q=0.8" }, signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok) return new TextDecoder("utf-8").decode(await response.arrayBuffer());
      throw new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
      if (attempt < retries) await sleep(Math.min(30_000, 1_000 * 2 ** (attempt - 1)));
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

async function mapPool(values, workers, callback) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(workers, values.length || 1) }, async () => {
    while (true) { const index = cursor++; if (index >= values.length) return; await callback(values[index]); }
  }));
}

async function readJson(file, fallback) { try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; } }
async function writeJsonAtomic(file, value) { await mkdir(path.dirname(file), { recursive: true }); const temporary = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`; await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, file); }
async function saveCheckpoint(value) { checkpointWrite = checkpointWrite.catch(() => undefined).then(() => writeJsonAtomic(CHECKPOINT, value)); await checkpointWrite; }
async function saveStatus() { status.updatedAt = new Date().toISOString(); const snapshot = JSON.parse(JSON.stringify(status)); statusWrite = statusWrite.catch(() => undefined).then(() => writeJsonAtomic(STATUS, snapshot)); await statusWrite; }
function emptyCheckpoint() { return { version: 1, updatedAt: "", artists: {}, albums: {}, sitemapAlbums: [] }; }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

main().catch(async (error) => { status.state = "failed"; status.error = message(error); await saveStatus().catch(() => undefined); console.error(error); process.exitCode = 1; });
