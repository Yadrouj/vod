import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export const MOODS = [
  ["travel", "همسفر جاده", /road|travel|folk|world|سفر|جاده|مسافرت/i],
  ["driving", "پشت فرمان", /driv|road|rock|pop|ماشین|جاده/i],
  ["truck", "جاده‌های طولانی", /country|folk|blues|سفر|جاده|کامیون/i],
  ["sad", "وقتی دلت گرفته", /sad|melanchol|غمگین|دلتنگ|تنهایی|غم|اشک/i],
  ["calm", "کمی آرام‌تر", /ambient|relax|new age|آرام|نگران|دلشوره/i],
  ["workout", "انرژی برای حرکت", /electronic|dance|epic|ورزش|انرژی|ترنس/i],
  ["focus", "وقت تمرکز", /lo-fi|lofi|chillhop|piano|تمرکز|پیانو/i],
  ["sleep", "آخر شب", /ambient|sleep|new age|خواب|شبانه/i],
  ["party", "دورهمی", /dance|disco|remix|ریمیکس|شاد|رقص/i],
  ["romance", "برای تو", /love|romantic|عاشقانه|عشق/i],
  ["rain", "هوای بارانی", /rain|acoustic|jazz|باران|بارون/i],
  ["cinema", "تصویر و موسیقی", /soundtrack|film score|game score|سینما|موسیقی متن/i],
  ["classical", "لحظه‌های کلاسیک", /classical|کلاسیک/i],
  ["jazz", "کافه جاز", /jazz|blues|جاز/i],
  ["nostalgia", "خاطره‌بازی", /قدیمی|nostalg|classic rock/i],
  ["instrumental", "بدون کلام", /instrumental|بی کلام|بی‌کلام/i],
];
export const SCOPES = [
  ["mix", "ترکیبی", () => true],
  ["persian", "فارسی", t => t.language === "fa" || /فارسی|ایرانی/.test(t.category)],
  ["turkish", "ترکی", t => t.language === "tr" || /turkish|ترکی|ترکي/i.test([t.category, ...(t.moods ?? []), ...(t.album?.genres ?? [])].join(" "))],
  ["korean", "کره‌ای", t => t.language === "ko" || /korean|k-pop|kpop|کره ای|کره‌ای/i.test([t.category, ...(t.moods ?? []), ...(t.album?.genres ?? [])].join(" "))],
  ["international", "بین‌المللی", t => t.category === "موسیقی خارجی" || (t.album?.genres?.length > 0 && /^[a-z]/i.test(t.category))],
];
const hash = value => createHash("sha256").update(value).digest("hex");
const tags = t => [t.title, t.persianTitle, t.category, ...(t.moods ?? []), ...(t.album?.genres ?? [])].join(" ");

export function buildMoodPlaylists(tracks, date = new Date()) {
  const week = Math.floor(date.getTime() / (7 * 86400_000));
  const playlists = [], gaps = [];
  const freshVideos = tracks
    .filter(t => t.kind === "video" && t.sources?.some(s => s.available !== false) && t.coverUrl)
    .sort((a, b) => String(b.publishedAt || b.releaseDate || "").localeCompare(String(a.publishedAt || a.releaseDate || "")));
  const videoSelection = [], videoArtists = new Map(), videoCovers = new Map(), videoIdentities = new Set();
  for (const track of freshVideos) {
    const artist = track.artist.slug;
    const identity = track.matchKey || `${artist}:${track.title}`;
    if (videoIdentities.has(identity) || (videoArtists.get(artist) ?? 0) >= 3) continue;
    videoSelection.push(track); videoIdentities.add(identity);
    videoArtists.set(artist, (videoArtists.get(artist) ?? 0) + 1);
    videoCovers.set(track.coverUrl, (videoCovers.get(track.coverUrl) ?? 0) + 1);
    if (videoSelection.length === 40) break;
  }
  if (videoSelection.length) playlists.push({
    id: "fresh-music-videos", title: "موزیک‌ویدئوهای تازه", scope: "video", mood: "new",
    description: "آخرین موزیک‌ویدئوهای قابل‌پخش آرشیو؛ هر بار با انتشارهای تازه دوباره مرتب می‌شود.",
    trackIds: videoSelection.map(t => t.id), covers: [...videoCovers.keys()].slice(0, 4),
    artistCount: videoArtists.size, selection: "published-video", updatedAt: date.toISOString(),
  });
  const usable = tracks.filter(t => t.kind === "track" && t.sources?.some(s => s.available !== false) && t.coverUrl);
  for (const [scope, scopeTitle, accepts] of SCOPES) {
    for (const [mood, title, pattern] of MOODS) {
      const id = `${scope}-${mood}`;
      const candidates = usable.filter(t => accepts(t) && pattern.test(tags(t))).sort((a,b) => hash(`${week}:${id}:${a.id}`).localeCompare(hash(`${week}:${id}:${b.id}`)));
      const selected = [], artistCounts = new Map(), covers = new Map(), identities = new Set();
      for (const track of candidates) {
        const artist = track.artist.slug;
        const identity = track.matchKey || `${artist}:${track.title}`;
        if (identities.has(identity) || (artistCounts.get(artist) ?? 0) >= 3 || (covers.get(track.coverUrl) ?? 0) >= 2) continue;
        selected.push(track); identities.add(identity);
        artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1); covers.set(track.coverUrl, (covers.get(track.coverUrl) ?? 0) + 1);
        if (selected.length === 40) break;
      }
      if (selected.length < 8 || artistCounts.size < 4 || covers.size < 4) { gaps.push({ scope, mood, candidates: candidates.length, selected: selected.length }); continue; }
      const trackIds = selected.map(t => t.id);
      if (playlists.some(p => p.trackIds.filter(id => trackIds.includes(id)).length / Math.min(p.trackIds.length, trackIds.length) > .8)) continue;
      playlists.push({ id, title: `${title} · ${scopeTitle}`, scope, mood, description: "گلچین پیشنهادی سرونما بر پایهٔ برچسب‌های آرشیو؛ ترکیب هنرمندها و کاورها هر هفته بازچینی می‌شود.", trackIds, covers: [...covers.keys()].slice(0, 4), artistCount: artistCounts.size, selection: "editorial-tags", updatedAt: date.toISOString() });
    }
  }
  return { version: 1, updatedAt: date.toISOString(), playlists, gaps, uniqueTracks: new Set(playlists.flatMap(p => p.trackIds)).size };
}

async function main() {
  const index = JSON.parse(await readFile("public/data/music-index.json", "utf8"));
  const result = buildMoodPlaylists(index.tracks);
  await mkdir("public/data", { recursive: true });
  const file = "public/data/music-mood-playlists.json";
  const ids = new Set(result.playlists.flatMap(p => p.trackIds));
  const tracksFile = "public/data/music-mood-tracks.json";
  const tracks = index.tracks.filter(t => ids.has(t.id)).map(t => ({ ...t, description: null }));
  // Publish media metadata first; landing cards never load the full audio catalog.
  await writeFile(`${tracksFile}.tmp-${process.pid}`, JSON.stringify({ updatedAt: result.updatedAt, tracks }));
  await rename(`${tracksFile}.tmp-${process.pid}`, tracksFile);
  await writeFile(`${file}.tmp-${process.pid}`, JSON.stringify(result)); await rename(`${file}.tmp-${process.pid}`, file);
  console.log(JSON.stringify({ playlists: result.playlists.length, uniqueTracks: result.uniqueTracks, gaps: result.gaps.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error); process.exitCode = 1; });
