import { readFile, mkdir, writeFile, rename } from "node:fs/promises";

// Metadata HTML/API checks only. A successful page is not a playback guarantee.
export const SOURCES = [
  ["donyaye-serial", "film", "https://dls2.aparatchi-dlcenter.top/DonyayeSerial/donyaye_serial_all_archive.html"],
  ["f2my", "film", "https://www.f2my.top/"],
  ["moviesho-korean", "film", "https://www.moviesho.com/wp-json/wp/v2/posts?categories=1306&per_page=1"],
  ["moviesho-turkish", "film", "https://www.moviesho.com/wp-json/wp/v2/posts?categories=9627&per_page=1"],
  ["zardfilm", "film", "https://zardfilm.in/animation/"],
  ["uptvs", "film", "https://www.uptvs.com/category/irani"],
  ["oldfarsi", "film", "https://oldfarsi.blogspot.com/"],
  ["rozmusic", "music", "https://rozmusic.com/"],
  ["musics-fa", "music", "https://musics-fa.com/"],
  ["sevilmusics", "music", "https://sevilmusics.com/singer/habibmusic/"],
  ["remiixbaz", "music", "https://remiixbaz.com/playlist/old-music/"],
  ["worldofmusic", "music", "https://worldofmusic.ir/artists/"],
  ["aftabmusic", "music", "https://aftabmusic.com/foreign/"],
];

const [vod, old, music] = await Promise.all(["vod-index", "vod-old-iranian", "music-index"].map(name => readFile(`public/data/${name}.json`, "utf8").then(JSON.parse)));
const count = (items, predicate) => items.filter(predicate).length;
const has = (item, field, pattern) => (item[field] ?? []).some(value => pattern.test(value));
const report = {
  checkedAt: new Date().toISOString(),
  scope: "Catalog metadata and source-page reachability; no media files downloaded; not an exhaustive playback check",
  catalog: {
    films: count(vod.items, i => i.type === "movie"), series: count(vod.items, i => i.type === "series"),
    korean: count(vod.items, i => has(i, "countries", /South Korea|کره جنوبی/i)),
    turkish: count(vod.items, i => has(i, "countries", /Turkey|Türkiye|ترکیه/i)),
    iranian: count(vod.items, i => has(i, "countries", /^Iran$|ایران/i)),
    documentary: count(vod.items, i => has(i, "genres", /documentary|مستند/i)),
    short: count(vod.items, i => has(i, "genres", /^short$|فیلم کوتاه/i)),
    oldIranian: old.items.length, oldIranianWithFiles: count(old.items, i => i.linksCount > 0),
    oldIranianSuspiciousYear: count(old.items, i => /^old-iranian-(\d{4})/.test(i.id) && i.year && Math.abs(i.year - (Number(i.id.match(/^old-iranian-(\d{4})/)[1]) + 621)) > 2),
    music: music.tracks.length, musicVideos: count(music.tracks, i => i.kind === "video"), artists: music.artists.length,
    foreignCategory: count(music.tracks, i => i.category === "موسیقی خارجی"), musicUpdatedAt: music.updatedAt,
  }, sources: [],
};
for (const [id, kind, url] of SOURCES) {
  const started = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { "User-Agent": "SarvNemaCatalogBot/1.0 (metadata audit)", Accept: "text/html,application/json" } });
    const reader = response.body?.getReader();
    let size = 0, text = "";
    if (reader) {
      const decoder = new TextDecoder();
      while (size < 256 * 1024) { const part = await reader.read(); if (part.done) break; size += part.value.length; text += decoder.decode(part.value, { stream: true }); }
      await reader.cancel();
    }
    const challenge = /<title[^>]*>\s*(?:just a moment|bot verification|captcha)/i.test(text) || (text.length < 30_000 && /verifying that you are not a robot/i.test(text));
    const entry = { id, kind, url, status: response.status, state: !response.ok ? "http-error" : challenge ? "challenge" : "reachable", sampledBytes: size, elapsedMs: Date.now() - started };
    report.sources.push(entry); console.log(JSON.stringify(entry));
  } catch (error) { report.sources.push({ id, kind, url, state: "unreachable", message: error.message, elapsedMs: Date.now() - started }); }
}
await mkdir("data", { recursive: true });
await writeFile("data/catalog-source-audit.json.tmp", JSON.stringify(report, null, 2) + "\n");
await rename("data/catalog-source-audit.json.tmp", "data/catalog-source-audit.json");
console.log(JSON.stringify(report.catalog));
