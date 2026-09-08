import { readFile, stat, open, unlink } from "node:fs/promises";
import { writeJsonAtomic } from "./atomic-json.mjs";
import { pathToFileURL } from "node:url";
const hosts = new Set(["rozmusic.com", "musics-fa.com", "worldofmusic.ir", "remiixbaz.com", "sevilmusics.com", "aftabmusic.com", "download1music.ir", "musics-mehr.com"]);
const key = value => String(value || "").toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1]?.replace(/&amp;/g, "&");
export function findTrackArtwork(html, track, singleTrackPage = false) {
  const titles = [key(track.persianTitle), key(track.title)].filter(value => value.length >= 5);
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const label = key(attr(tag, "alt"));
    // A name match must include a whole title, not a common one-word fragment.
    if (!titles.some(title => title.split(" ").length >= 2 && label.includes(title))) continue;
    const image = attr(tag, "data-src") || attr(tag, "src");
    if (image) { try { const url = new URL(image, track.sourceUrl); if (url.protocol === "https:") return url.href; } catch {} }
  }
  if (singleTrackPage) for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (attr(tag, "property") !== "og:image") continue;
    try { const url = new URL(attr(tag, "content"), track.sourceUrl); if (url.protocol === "https:") return url.href; } catch {}
  }
  return null;
}
async function sourceHtml(address) {
  for (let redirects = 0; redirects < 4; redirects++) {
    const url = new URL(address);
    if (url.protocol !== "https:" || !hosts.has(url.hostname.replace(/^www\./, ""))) throw new Error("Unapproved source");
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(12000) });
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) { address = new URL(response.headers.get("location"), url).href; continue; }
    if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
    const reader = response.body.getReader(); let length = 0; const chunks = [];
    try { while (true) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > 3000000) throw new Error("Page too large"); chunks.push(Buffer.from(value)); } }
    finally { await reader.cancel(); }
    return Buffer.concat(chunks).toString("utf8");
  }
  throw new Error("Too many redirects");
}
export async function enrichArtwork(limit = 40) {
  const file = "public/data/music-index.json";
  const journalFile = "data/music-artwork-journal.json";
  const before = await stat(file);
  const index = JSON.parse(await readFile(file, "utf8"));
  const journal = await readFile(journalFile, "utf8").then(JSON.parse).catch(() => ({ pages: {}, matches: {} }));
  const covers = new Map(), pages = new Map();
  for (const track of index.tracks) {
    covers.set(track.coverUrl, (covers.get(track.coverUrl) || 0) + 1);
    if (!pages.has(track.sourceUrl)) pages.set(track.sourceUrl, []);
    pages.get(track.sourceUrl).push(track);
  }
  const targets = [...pages].filter(([url, tracks]) => {
    try { if (!hosts.has(new URL(url).hostname.replace(/^www\./, ""))) return false; } catch { return false; }
    return tracks.some(track => !track.coverUrl || covers.get(track.coverUrl) > 8)
      && Date.now() - (Date.parse(journal.pages[url]?.at) || 0) > 7 * 86400000;
  }).sort(([a], [b]) => (Date.parse(journal.pages[a]?.at) || 0) - (Date.parse(journal.pages[b]?.at) || 0)).slice(0, limit);
  let checked = 0, matched = 0, failed = 0;
  for (const [url, tracks] of targets) {
    try {
      const html = await sourceHtml(url);
      for (const track of tracks) {
        const image = findTrackArtwork(html, track, tracks.length === 1);
        if (image && image !== track.coverUrl) { journal.matches[track.id] = { url: image, source: url }; matched++; }
      }
      journal.pages[url] = { at: new Date().toISOString(), state: "checked" };
    } catch (error) { failed++; journal.pages[url] = { at: new Date().toISOString(), state: "failed", error: String(error.message) }; }
    checked++;
    await writeJsonAtomic(journalFile, journal);
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  let applied = 0;
  for (const track of index.tracks) {
    const match = journal.matches[track.id];
    if (match?.source === track.sourceUrl && match.url !== track.coverUrl) { track.coverUrl = match.url; applied++; }
  }
  if ((await stat(file)).mtimeMs !== before.mtimeMs) throw new Error("Catalog changed during artwork review; retry next run");
  if (applied) await writeJsonAtomic(file, index);
  const result = { checked, matched, applied, failed, remainingWithoutCover: index.tracks.filter(track => !track.coverUrl).length };
  console.log(JSON.stringify(result));
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const lockPath = "data/music-artwork.lock";
  let lock;
  try {
    const previous = await readFile(lockPath, "utf8").then(JSON.parse).catch(() => null);
    const info = await stat(lockPath).catch(() => null);
    let alive = false;
    if (Number.isInteger(previous?.pid)) { try { process.kill(previous.pid, 0); alive = true; } catch (error) { alive = error.code !== "ESRCH"; } }
    if (info && Date.now() - info.mtimeMs > 12 * 3600000 && !alive) await unlink(lockPath);
    lock = await open(lockPath, "wx");
    await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    const requested = Number(process.argv.find(arg => arg.startsWith("--limit="))?.split("=")[1] || 40);
    await enrichArtwork(Number.isFinite(requested) ? Math.max(1, Math.min(100, requested)) : 40);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { if (lock) { await lock.close(); await unlink(lockPath); } }
}
