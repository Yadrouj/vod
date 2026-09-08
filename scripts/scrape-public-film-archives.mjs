import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { durationSeconds } from "./scrape-oitn-films.mjs";

// Selected publisher pages, not a third-party download mirror. NFB explicitly
// offers its own embed player: https://help.nfb.ca/knowledge-base/how-do-i-share-videos/
const NFB = [
  ["hypersensitive", 2025, "بیش‌حساس", ["Animation", "Short"], "انیمیشنی کوتاه دربارهٔ سوگ و تجربهٔ حساسیت؛ ساختهٔ مارتین فروسار."],
  ["my-knitting-circle", 2026, "حلقهٔ بافندگی من", ["Documentary", "Short"], "مستندی کوتاه دربارهٔ همراهی و ارتباط در یک جمع بافندگی در یوکان."],
  ["the-girl-who-cried-pearls", 2025, "دختری که مروارید گریه می‌کرد", ["Animation", "Short"], "قصه‌ای استاپ‌موشن دربارهٔ عشق، طمع و اشک‌هایی که به مروارید تبدیل می‌شوند."],
  ["what-is-democracy-2018", 2018, "دموکراسی چیست؟", ["Documentary"], "مستندی با پرسش‌هایی دربارهٔ دموکراسی و معنای آن در زندگی امروز."],
  ["this-is-not-a-movie", 2019, "این یک فیلم نیست", ["Documentary"], "مستندی دربارهٔ روزنامه‌نگاری و کار رابرت فیسک."],
];
const KOFA = [
  ["the-coachman-1961", "The Coachman", "درشکه‌چی", "UqqB0HUFmUU"],
  ["uijeok-iljimae-1961", "Uijeok Iljimae", "ایلجی‌مه", "nd8rMoHjprs"],
];
const index = JSON.parse(await readFile("public/data/vod-index.json", "utf8"));
const key = title => title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const existingId = (title, year) => { const matches = index.items.filter(i => key(i.title) === key(title) && i.year === year); return matches.length === 1 ? matches[0].imdbCode || matches[0].id : null; };
const items = [], failures = [];
const checkedAt = new Date().toISOString();
function base(id, title, year, persianTitle, sourcePageUrl) {
  return { id, imdbCode: id, title, persianTitle, type: "movie", year, links: [], groups: [], qualities: [], imdbUrl: /^tt\d+$/.test(id) ? `https://www.imdb.com/title/${id}/` : null, imdbVotes: null, imdbRating: null, sourcePageUrl, source: "public-film-archive", apiFetchedAt: checkedAt };
}
async function metadataPage(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": "SarvnemaCatalog/1.0 (publisher metadata)" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const reader = response.body.getReader(), chunks = []; let bytes = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; bytes += value.length; if (bytes > 2_000_000) throw new Error("Metadata exceeds limit"); chunks.push(value); } } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks).toString("utf8");
}
for (const [slug, year, persianTitle, genres, overview] of NFB) {
  const url = `https://www.nfb.ca/film/${slug}/`;
  try {
    const html = await metadataPage(url);
    const objects = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m => { try { return [JSON.parse(m[1])]; } catch { return []; } });
    const movie = objects.find(o => (Array.isArray(o["@type"]) ? o["@type"] : [o["@type"]]).includes("Movie") && o.url === url);
    if (!movie?.name || movie.embedUrl !== `${url}embed/player/`) throw new Error("Publisher film/embed metadata missing");
    const id = existingId(movie.name, year) || `nfb-${slug}`;
    items.push({ ...base(id, movie.name, year, persianTitle, url), countries: ["Canada"], genres,
      persianGenres: genres.map(g => ({ Animation: "انیمیشن", Short: "فیلم کوتاه", Documentary: "مستند" })[g]),
      persianOverview: overview, runtimeMinutes: Math.round(durationSeconds(movie.duration)/60) || null,
      posterUrl: movie.image, backdropUrl: movie.thumbnailUrl,
      credits: (movie.director || []).map(d => ({ category: "Director", name_text: d.name })),
      publisherPlayer: { provider: "nfb", embedUrl: movie.embedUrl, sourceUrl: url, checkedAt, playbackStatus: "not-tested" },
    });
  } catch (error) { failures.push({ url, error: error.message }); }
  await new Promise(resolve => setTimeout(resolve, 700));
}
const kofaUrl = "https://www.koreafilm.or.kr/kofa/news/news/BC_0000059393";
try {
  const html = await metadataPage(kofaUrl);
  for (const [slug, title, persianTitle, videoId] of KOFA) {
    if (!html.includes(videoId)) throw new Error(`Publisher no longer references ${videoId}`);
    const id = existingId(title, 1961) || `kofa-${slug}`;
    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    items.push({ ...base(id, title, 1961, persianTitle, kofaUrl), countries: ["South Korea"], languages: ["Korean"],
      genres: ["Classic"], posterUrl: thumbnailUrl, backdropUrl: thumbnailUrl,
      youtubeVideos: [{ videoId, title, channel: "Korean Film Archive · KOFA", thumbnailUrl, sourceUrl: `https://www.youtube.com/watch?v=${videoId}`, evidenceUrl: kofaUrl, checkedAt, playbackStatus: "not-tested" }],
    });
  }
} catch (error) { failures.push({ url: kofaUrl, error: error.message }); }
if (!items.length) throw new Error("No publisher references available; catalog retained");
await mkdir(".media-cache/vod-sync", { recursive: true });
const file = ".media-cache/vod-sync/public-film-archives.json";
await writeFile(`${file}.tmp-${process.pid}`, JSON.stringify({ sourceUrl: "https://www.nfb.ca/", scrapedAt: checkedAt, items })); await rename(`${file}.tmp-${process.pid}`, file);
await writeFile("data/public-film-archives-report.json", JSON.stringify({ checkedAt, reviewed: NFB.length + KOFA.length, matched: items.length, failures, items: items.map(i => ({ id: i.id, title: i.title, sourceUrl: i.sourcePageUrl })) }, null, 2));
console.log(JSON.stringify({ titles: items.length, failures }));
