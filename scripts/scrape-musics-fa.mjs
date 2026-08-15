import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = "https://musics-fa.com";
const OUTPUT = path.join(".media-cache", "music", "musics-fa-source.json");
const STATUS = path.join("data", "musics-fa-status.json");
const args = new Set(process.argv.slice(2));
const value = (name, fallback) => { const raw = process.argv.find((argument) => argument.startsWith(`${name}=`)); return Math.max(1, Number(raw?.slice(name.length + 1) ?? fallback) || fallback); };
const pages = args.has("--full") ? 1247 : value("--pages", 3);
const detailLimit = value("--detail-limit", args.has("--full") ? 0 : 80);
const onlyId = process.argv.find((argument) => argument.startsWith("--only-id="))?.slice("--only-id=".length) ?? "";
const concurrency = Math.min(4, value("--concurrency", 3));
const delayMs = Math.max(180, value("--delay-ms", 400));
const status = { state: "running", startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pages: { total: pages, complete: 0 }, tracks: { discovered: 0, new: 0, updated: 0, failures: 0 }, details: { requested: 0, complete: 0 }, current: null, warnings: [] };
let writeChain = Promise.resolve();

async function main() {
  const existing = await readJson(OUTPUT, []);
  const tracks = new Map(existing.map((track) => [track.id, track]));
  await pool(Array.from({ length: pages }, (_, index) => index + 1), concurrency, async (page) => {
    status.current = `archive page ${page}`; await saveStatus();
    try {
      const discovered = parseListing(await fetchText(page === 1 ? ROOT : `${ROOT}/page/${page}/`));
      for (const track of discovered) { const before = tracks.has(track.id); tracks.set(track.id, mergeTrack(tracks.get(track.id), track)); before ? status.tracks.updated++ : status.tracks.new++; }
      status.tracks.discovered += discovered.length; status.pages.complete++;
    } catch (error) { status.tracks.failures++; status.warnings.push(`page ${page}: ${message(error)}`); }
    await saveStatus(); await sleep(delayMs);
  });
  const forceDetails = args.has("--refresh-details");
  const detailCandidates = [...tracks.values()].filter((track) => (!onlyId || track.id === onlyId) && (forceDetails || !track.detailCheckedAt)).slice(0, detailLimit || undefined);
  status.details.requested = detailCandidates.length;
  await pool(detailCandidates, concurrency, async (track) => {
    status.current = `details: ${track.title}`; await saveStatus();
    try { tracks.set(track.id, mergeTrack(track, await parseDetail(fetchText(track.sourceUrl), track))); status.details.complete++; }
    catch (error) { status.warnings.push(`detail ${track.sourceUrl}: ${message(error)}`); }
    await saveStatus(); await sleep(delayMs);
  });
  const data = [...tracks.values()]
    .filter(hasPlayableSource)
    .filter((track) => !isExcluded(track))
    .map(normalizeArtistSelection)
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  status.state = "complete"; status.current = null; await Promise.all([writeJson(OUTPUT, data), saveStatus()]);
  console.log(JSON.stringify({ source: "musics-fa", tracks: data.length, ...status.tracks, details: status.details.complete }, null, 2));
}

function parseListing(html) {
  const entries = html.match(/<article\b[\s\S]*?<\/article>/gi) ?? [];
  return entries.map(parseArticle).filter(Boolean);
}

function parseArticle(article) {
  const url = first(article, /<h2[^>]*>\s*<a[^>]+href=["']([^"']+)["']/i);
  if (!url || !/\/download-song\//.test(url)) return null;
  const title = cleanTitle(clean(first(article, /<h2[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i)));
  const english = clean((article.match(/Download (?:New|Old) Music\s+BY\s*:\s*([^<\n]+)/i) ?? [])[1]);
  const parsedEnglish = parseEnglishSong(english);
  const image = first(article, /(?:data-src|src)=["'](https:\/\/musics-fa\.com\/wp-content\/uploads\/[^"']+)/i);
  const publishedAt = first(article, /<time[^>]+datetime=["']([^"']+)/i);
  const category = clean(first(article, /(?:class=["'][^"']*(?:cat|category)[^"']*["'][^>]*>|<time[\s\S]*?<\/time>)[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)) || "آهنگ";
  const archiveArtist = extractArtist(article)[0];
  const artist = parsedEnglish.artist ? { name: parsedEnglish.artist, slug: slugify(parsedEnglish.artist), sourceUrl: archiveArtist?.sourceUrl ?? ROOT } : archiveArtist ?? deriveArtist(title);
  return { id: `musicfa-${hash(url)}`, kind: "track", title: parsedEnglish.title || title, persianTitle: title, artist, artists: [artist], coverUrl: image || null, description: null, sourceUrl: absolute(url), matchKey: parsedEnglish.matchKey, publishedAt: publishedAt || null, category, folder: { root: "Unknown", year: null, month: null, day: null }, sources: [] };
}

async function parseDetail(htmlPromise, track) {
  const html = await htmlPromise;
  const media = [];
  for (const match of html.matchAll(/(?:data-song|href)=["'](https?:\/\/(?:dls\.)?musics-fa\.com\/[^"']+\.(?:mp3|m4a|aac|flac|mp4)(?:\?[^"']*)?)["'][^>]*(?:title=["']([^"']*)["'])?/gi)) {
    const url = decode(match[1]);
    if (!media.some((item) => item.url === url)) media.push({ url, label: /data-song=/i.test(match[0]) ? "Online stream" : "Direct download", quality: quality(match[0], url), kind: /data-song=/i.test(match[0]) ? "stream" : "download", provider: "musics-fa", basePath: basePath(url) });
  }
  const direct = media.find((item) => item.kind === "download");
  if (direct && !media.some((item) => item.kind === "stream")) media.unshift({ ...direct, label: "Online stream", kind: "stream" });
  const artistList = extractPrimaryArtist(html, track);
  const image = first(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i);
  const description = clean(first(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i));
  const publishedAt = first(html, /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)/i);
  return { ...track, title: cleanTitle(track.title), persianTitle: cleanTitle(track.persianTitle || track.title), coverUrl: image || track.coverUrl, description: description || track.description, publishedAt: publishedAt || track.publishedAt, artist: artistList[0] ?? track.artist, artists: artistList.length ? artistList : track.artists, sources: media.length ? media : track.sources, folder: parseFolder(media[0]?.url ?? ""), detailCheckedAt: new Date().toISOString() };
}

function extractArtist(html) {
  const artists = [];
  for (const match of html.matchAll(/<a[^>]+href=["']([^"']*\/artists\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const name = clean(match[2]).replace(/^آرشیو آهنگ های\s*/u, ""); if (!name || /آهنگ جدید|موزیکفا|کردی|شاد/u.test(name)) continue;
    const sourceUrl = absolute(decode(match[1])); const slug = decodeURIComponent(sourceUrl.split("/artists/")[1]?.replace(/\/$/, "") ?? "").toLocaleLowerCase();
    if (slug && !artists.some((artist) => artist.slug === slug)) artists.push({ name, slug, sourceUrl });
  }
  return artists;
}

function extractPrimaryArtist(html, track) {
  const anchor = html.indexOf("class=\"article-content\"") >= 0 ? html.slice(html.indexOf("class=\"article-content\""), html.indexOf("class=\"related-posts\"")) : html;
  const candidates = extractArtist(anchor);
  const expected = track.artist?.name;
  const preferred = candidates.find((artist) => normalizeComparable(artist.name) === normalizeComparable(expected)) ?? candidates[0] ?? track.artist;
  return preferred ? [preferred] : [];
}

function normalizeArtistSelection(track) {
  const primary = track.artist ?? track.artists?.[0] ?? deriveArtist(track.persianTitle || track.title);
  return { ...track, artist: primary, artists: [primary] };
}

function hasPlayableSource(track) { return (track.sources ?? []).some((source) => source?.url && /\.(?:mp3|m4a|aac|flac|mp4)(?:$|\?)/i.test(source.url)); }
function isExcluded(track) { return /(?:مداح|مداحی|نوحه|اربعین|محرم|هیئت|روضه|شور|مناجات|شهادت|امام\s*حسین|بنی\s*فاطمه|پویانفر|نریمانی|میرداماد|کویتی\s*پور|حسین\s*طاهری|حمید\s*علیمی|جواد\s*مقدم|میثم\s*مطیعی)/iu.test([track.title, track.persianTitle, track.description, ...(track.artists ?? []).map((artist) => artist.name)].filter(Boolean).join(" ")); }

function deriveArtist(value) { const name = clean(value).split(/[|–-]/)[0].trim().replace(/^دانلود آهنگ\s*/u, "") || "موزیکفا"; return { name, slug: slugify(name), sourceUrl: ROOT }; }
function parseEnglishSong(value) {
  const cleaned = clean(value).replace(/\s+With Text.*$/i, "").replace(/\s+On Music-fa.*$/i, "").trim();
  const parts = cleaned.split(/\s*\|\s*/);
  if (parts.length >= 2) {
    const artist = parts.shift()?.trim() ?? "";
    const title = parts.join(" | ").trim();
    return { artist, title, matchKey: normalizeComparable(`${artist} ${title}`) };
  }
  return { artist: "", title: cleaned, matchKey: normalizeComparable(cleaned) };
}
function cleanTitle(value = "") { return clean(value).replace(/^(?:\u062f\u0627\u0646\u0644\u0648\u062f\s+)?(?:\u0622\u0647\u0646\u06af|\u0627\u0647\u0646\u06af|\u0645\u0648\u0632\u06cc\u06a9)\s+/u, "").replace(/\s+(?:\u0628\u0627\s+\u0635\u062f\u0627\u06cc|\u0631\u0627\u06cc\u06af\u0627\u0646|\u0628\u0627\s+\u062a\u06a9\u0633\u062a).*$/u, "").trim(); }
function mergeTrack(old, next) { if (!old) return next; const sources = [...next.sources, ...old.sources].filter((source, index, all) => all.findIndex((current) => current.url === source.url && current.kind === source.kind) === index); return { ...old, ...next, coverUrl: next.coverUrl ?? old.coverUrl, description: next.description ?? old.description, publishedAt: next.publishedAt ?? old.publishedAt, sources }; }
function parseFolder(url) { try { const parts = decodeURIComponent(new URL(url).pathname).split("/").filter(Boolean); const year = parts.find((part) => /^(?:19|20|14)\d{2}$/.test(part)) ?? null; const index = year ? parts.indexOf(year) : -1; return { root: "Unknown", year, month: index >= 0 ? parts[index + 1] ?? null : null, day: null }; } catch { return { root: "Unknown", year: null, month: null, day: null }; } }
function basePath(url) { try { const parsed = new URL(url); const parts = parsed.pathname.split("/").filter(Boolean); return `${parsed.origin}/${parts.slice(0, Math.min(parts.length - 1, 4)).join("/")}/`; } catch { return null; } }
function quality(value, url) { const joined = `${value} ${decode(url)}`; return /320/.test(joined) ? "320kbps" : /128/.test(joined) ? "128kbps" : null; }
function first(value, pattern) { return (value.match(pattern) ?? [])[1] ?? ""; }
function clean(value = "") { return decode(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()); }
function decode(value = "") { return value.replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code))).replace(/&amp;/g, "&").replace(/&#8211;/g, "–").replace(/&nbsp;/g, " "); }
function absolute(value) { try { return new URL(value, ROOT).toString(); } catch { return value; } }
function hash(value) { return createHash("sha1").update(value).digest("hex").slice(0, 14); }
function slugify(value) { return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/(^-|-$)/g, ""); }
function normalizeComparable(value) { return String(value).toLocaleLowerCase().replace(/[\u200c\u200f]/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim(); }
async function fetchText(url) { const response = await fetch(url, { headers: { "user-agent": "SarvNema music catalog updater/1.0 (+https://sarvnema.ir)", "accept-language": "fa-IR,fa;q=0.9,en;q=0.8" }, signal: AbortSignal.timeout(30_000) }); if (!response.ok) throw new Error(`${response.status} ${response.statusText}`); return new TextDecoder("utf-8").decode(await response.arrayBuffer()); }
async function pool(values, workers, callback) { let cursor = 0; await Promise.all(Array.from({ length: Math.min(workers, values.length || 1) }, async () => { while (true) { const index = cursor++; if (index >= values.length) return; await callback(values[index]); } })); }
async function readJson(file, fallback) { try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; } }
async function writeJson(file, value) { await mkdir(path.dirname(file), { recursive: true }); const temporary = `${file}.${process.pid}.${Date.now()}.tmp`; await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, file); }
async function saveStatus() { status.updatedAt = new Date().toISOString(); const snapshot = JSON.parse(JSON.stringify(status)); writeChain = writeChain.catch(() => undefined).then(() => writeJson(STATUS, snapshot)); await writeChain; }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function message(error) { return error instanceof Error ? error.message : String(error); }
main().catch(async (error) => { status.state = "failed"; status.error = message(error); await saveStatus().catch(() => undefined); console.error(error); process.exitCode = 1; });
