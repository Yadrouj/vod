import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const SOURCE_URL = "https://www.oitn.com/copy-of-%D9%85%D8%B3%D8%AA%D9%86%D8%AF-%D9%87%D8%A7";
export function normalizePersian(text) {
  return String(text).normalize("NFKC").replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[أإآ]/g, "ا")
    .replace(/[\u064B-\u065F\u200c\u200f\u200e]/g, "").replace(/[^\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]/g, "");
}
export function readLegacyList(text) {
  return text.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^(\d{7})\s+(.+?)\s*$/u);
    return match ? [{ id: `old-iranian-${match[1]}`, title: match[2], year: Number(match[1].slice(0,4)) }] : [];
  });
}
export function durationSeconds(value) {
  const m = String(value).match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  return m ? Number(m[1] || 0)*3600 + Number(m[2] || 0)*60 + Number(m[3] || 0) : 0;
}
export function parseArchiveVideos(html) {
  const videos = new Map();
  const visit = value => {
    if (!value || typeof value !== "object") return;
    if (value["@type"] === "VideoObject") {
      // Description contains promotional links to unrelated films. Only embedUrl is evidence.
      const id = String(value.embedUrl).match(/^https:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]{11})(?:[?/#]|$)/)?.[1];
      const seconds = durationSeconds(value.duration);
      if (id && seconds >= 2400 && seconds <= 14400 && !/تریلر|آنونس|سکانس|trailer|teaser/i.test(value.name)) videos.set(id, { videoId: id, title: String(value.name || "").slice(0,300), durationSeconds: seconds });
    }
    for (const child of Object.values(value)) if (typeof child === "object") visit(child);
  };
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(match[1])); } catch { /* Ignore unrelated malformed markup. */ }
  }
  return [...videos.values()];
}
export function matchLegacyVideo(video, entries) {
  const name = video.title.replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  const year = Number(name.match(/\b(13\d{2})\b/)?.[1]) || null;
  const head = name.split(/[|｜]/)[0].split(/با بازی/)[0];
  const key = normalizePersian(head.replace(/فیلم(?:\s+(?:ایرانی|قدیمی|کامل|سینمایی))*/g, ""));
  // Exact title + source year when supplied. Never fuzzy-match a short ambiguous name.
  const matches = entries.filter(entry => normalizePersian(entry.title) === key && (!year || entry.year === year));
  return matches.length === 1 ? matches[0] : null;
}

async function main() {
  const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(25000), headers: { "User-Agent": "SarvnemaCatalog/1.0 (metadata and public embed references)" } });
  if (!response.ok) throw new Error(`OITN returned ${response.status}; last good references retained`);
  const reader = response.body.getReader(); let bytes = 0; const chunks = [];
  try { while (true) { const { value, done } = await reader.read(); if (done) break; bytes += value.length; if (bytes > 2_000_000) throw new Error("Archive page exceeded metadata limit"); chunks.push(value); } } finally { await reader.cancel().catch(() => {}); }
  const videos = parseArchiveVideos(Buffer.concat(chunks).toString("utf8"));
  if (!videos.length) throw new Error("No full-length video metadata; last good references retained");
  const entries = readLegacyList(await readFile("scripts/data/old-iranian-film-list.txt", "utf8"));
  const checkedAt = new Date().toISOString();
  const items = [], unmatched = [];
  for (const video of videos) {
    const entry = matchLegacyVideo(video, entries);
    if (!entry) { unmatched.push(video.title); continue; }
    items.push({ ...video, id: entry.id, filmTitle: entry.title, persianYear: entry.year, sourceUrl: SOURCE_URL, publisher: "OITN / تلویزیون امید ایران", checkedAt, evidence: "publisher-VideoObject", playbackStatus: "not-tested" });
  }
  if (!items.length) throw new Error("No unambiguous catalog matches; last good references retained");
  const file = "public/data/old-iranian-video-references.json";
  let previous = [];
  try { previous = JSON.parse(await readFile(file, "utf8")).items ?? []; } catch {}
  const keys = new Set(items.map(item => `${item.id}:${item.videoId}`));
  const retained = previous.filter(item => !keys.has(`${item.id}:${item.videoId}`));
  const report = { checkedAt, sourceUrl: SOURCE_URL, discovered: videos.length, matched: items.length, uniqueTitles: new Set(items.map(i => i.id)).size, retained: retained.length, unmatched, items: [...items, ...retained] };
  await mkdir("public/data", { recursive: true });
  await writeFile(`${file}.tmp-${process.pid}`, JSON.stringify(report, null, 2)); await rename(`${file}.tmp-${process.pid}`, file);
  console.log(JSON.stringify({ ...report, items: undefined }, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error); process.exitCode = 1; });
