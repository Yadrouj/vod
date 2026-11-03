import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { meloobitPlaylists } from './meloobit-source.mjs';

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
  ["persian", "فارسی", isPersianTrack],
  ["turkish", "ترکی", t => t.language === "tr" || /turkish|ترکی|ترکي/i.test([t.category, ...(t.moods ?? []), ...(t.album?.genres ?? [])].join(" "))],
  ["korean", "کره‌ای", t => t.language === "ko" || /korean|k-pop|kpop|کره ای|کره‌ای/i.test([t.category, ...(t.moods ?? []), ...(t.album?.genres ?? [])].join(" "))],
  ["international", "بین‌المللی", t => t.category === "موسیقی خارجی" || (t.album?.genres?.length > 0 && /^[a-z]/i.test(t.category))],
];
const hash = value => createHash("sha256").update(value).digest("hex");
const tags = t => [t.title, t.persianTitle, t.category, ...(t.moods ?? []), ...(t.album?.genres ?? [])].join(" ");

const normalize = value => String(value ?? "").normalize("NFKC").toLowerCase()
  .replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[\u064b-\u065f\u0670]/g, "").replace(/\u200c/g, " ");
const metadataTags = track => normalize([track.category, ...(track.moods ?? []), ...(track.album?.genres ?? []), ...(track.album?.moods ?? [])].join(" "));

function isPersianTrack(track) {
  if (track.language) return track.language === "fa";
  return /فارسی|ایرانی/.test(normalize(track.category))
    || ["آهنگ", "ریمیکس", "پاپ", "مسافرت و جاده", "مود ماشین", "رقص و پارتی", "نوستالژی", "عاشقانه"].includes(normalize(track.category));
}

/** Dates here are catalog publication metadata, never import/folder dates. */
export function playlistPublishedYear(track, currentYear = new Date().getUTCFullYear()) {
  for (const value of [track.publishedAt, track.album?.publishedAt]) {
    const date = String(value ?? "");
    const match = date.match(/^(19\d{2}|20\d{2})(?:$|-(\d{2})-(\d{2})(?:T.*)?$)/);
    if (!match || Number(match[1]) > currentYear) continue;
    if (match[2]) {
      const day = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
      if (!Number.isFinite(Date.parse(date)) || !Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date.slice(0, 10)) continue;
    }
    return Number(match[1]);
  }
  return null;
}

/** Also used when publishing the compact collection payload: library IDs must resolve. */
export function collectionTracks(tracks, libraryTracks = []) {
  const byId = new Map(tracks.map(track => [track.id, track]));
  for (const track of libraryTracks) if (!byId.has(track.id)) byId.set(track.id, track);
  return [...byId.values()];
}

function selectCuratedTracks(candidates, seed, limit = 40) {
  // Hash each candidate once, not inside the sort comparator on the full catalog.
  const ranked = candidates.map(track => ({ track, rank: hash(`${seed}:${track.id}`) }))
    .sort((a, b) => a.rank.localeCompare(b.rank));
  const selected = [], identities = new Set(), artists = new Map(), covers = new Map();
  for (const { track } of ranked) {
    const credits = (track.artists?.length ? track.artists : [track.artist]).filter(Boolean).map(artist => artist.slug);
    const identity = track.matchKey || `${credits[0]}:${normalize(track.title)}`;
    if (identities.has(identity) || credits.some(artist => (artists.get(artist) ?? 0) >= 3) || (track.coverUrl && (covers.get(track.coverUrl) ?? 0) >= 2)) continue;
    selected.push(track);
    identities.add(identity);
    for (const artist of credits) artists.set(artist, (artists.get(artist) ?? 0) + 1);
    if (track.coverUrl) covers.set(track.coverUrl, (covers.get(track.coverUrl) ?? 0) + 1);
    if (selected.length >= limit) break;
  }
  return { selected, artistCount: artists.size, covers: [...covers.keys()].slice(0, 4) };
}

function curatedPlaylists(tracks, date) {
  const week = Math.floor(date.getTime() / (7 * 86400_000));
  const usable = tracks.filter(track => track.kind === "track" && track.sources?.some(source => source.available !== false));
  const tagged = usable.map(track => ({ track, tags: metadataTags(track), title: normalize(`${track.title} ${track.persianTitle}`), persian: isPersianTrack(track) }));
  const persian = tagged.filter(item => item.persian);
  const road = item => /road|travel|مسافرت|جاده|مود ماشین/.test(item.tags);
  const nostalgia = item => /قدیمی|نوستالژی|nostalg/.test(item.tags);
  const dance = item => /dance|party|رقص|پارتی|ریمیکس|remix/.test(item.tags);
  const moodDescription = "گلچین پیشنهادی از آهنگ‌های واقعی آرشیو بر پایهٔ برچسب‌ها و نشانه‌های عنوان؛ نام این مجموعه حال‌وهواست، نه برچسب صریح تک‌تک آهنگ‌ها. صف پخش را پیش از حرکت انتخاب کنید.";
  const definitions = [
    ["iranian", "گلچین ایرانی", () => true],
    ["road", "ایرانی برای جاده", road],
    ["sad", "ایرانی غمگین و دلتنگ", item => /(?:^|[\s-])(?:غم(?:گین)?|اشک|دلتنگ\S*|تنهایی|sad|melancholy)(?=$|[\s-])/u.test(`${item.tags} ${item.title}`)],
    ["peykan", "پیکان؛ خاطره‌های جاده", nostalgia],
    ["peugeot", "پژو؛ مود ماشین", item => road(item) && !nostalgia(item)],
    ["shooti", "شوتی؛ ریمیکس و ضرب‌آهنگ", item => dance(item) && /ریمیکس|remix/.test(`${item.tags} ${item.title}`)],
    ["exciting", "ایرانی پرهیجان", dance],
    ["romance", "عاشقانه‌های ایرانی", item => /عاشقانه|romantic|love/.test(item.tags)],
  ];
  const playlists = [];
  const add = (id, title, scope, mood, description, selection, candidates) => {
    const { selected, artistCount, covers } = selectCuratedTracks(candidates.map(item => item.track), `${week}:${id}`);
    if (selected.length < 8 || artistCount < 4) return;
    playlists.push({ id, title, scope, mood, description, selection, trackIds: selected.map(track => track.id), covers, artistCount, updatedAt: date.toISOString() });
  };
  for (const [mood, title, accepts] of definitions) {
    add(`curated-persian-${mood}`, title, "persian", mood, moodDescription, "curated-mood", persian.filter(accepts));
  }
  // Styles require actual category/genre/mood metadata; song titles alone are not genre evidence.
  for (const [style, title, pattern, iranian] of [
    ["persian-pop", "پاپ ایرانی", /(?:^|\s)(?:پاپ|pop)(?:$|\s)/, true],
    ["persian-remix", "ریمیکس ایرانی", /ریمیکس|remix/, true],
    ["persian-classics", "نوستالژی ایرانی", /قدیمی|نوستالژی|nostalg/, true],
    ["persian-hip-hop", "رپ و هیپ‌هاپ ایرانی", /(?:^|\s)(?:رپ|هیپ هاپ|rap|hip hop|hip-hop)(?:$|\s)/, true],
    ["rock", "راک و آلترناتیو", /(?:^|[\s-])rock(?:$|\s)/, false],
    ["jazz", "جاز و بلوز", /jazz|blues/, false],
    ["electronic", "الکترونیک و دنس", /electronic|dance|disco/, false],
    ["classical", "کلاسیک و نئوکلاسیک", /classical|کلاسیک/, false],
    ["instrumental", "بی‌کلام", /instrumental|بی کلام/, false],
    ["folk", "فولک و موسیقی جهان", /(?:^|\s)(?:folk|world)(?:$|\s)/, false],
  ]) {
    add(`curated-style-${style}`, title, "styles", style, "گلچین متنوع از آهنگ‌های دارای برچسب واقعی این سبک در متادیتای آرشیو؛ با پخش پیوسته و صفحهٔ هر آهنگ.", "genre-tags", tagged.filter(item => (!iranian || item.persian) && pattern.test(item.tags)));
  }
  const currentYear = date.getUTCFullYear();
  const years = new Map();
  for (const item of tagged) {
    const year = playlistPublishedYear(item.track, currentYear);
    if (!year) continue;
    if (!years.has(year)) years.set(year, []);
    years.get(year).push(item);
  }
  for (const year of [...years.keys()].sort((a, b) => b - a).slice(0, 8)) {
    const description = `گلچین بر اساس سال ${year} در متادیتای انتشار آهنگ یا آلبوم؛ این تاریخ لزوماً سال نخستین انتشار اثر نیست. تاریخ ورود به آرشیو و نام پوشه مبنا قرار نگرفته‌اند.`;
    add(`curated-year-persian-${year}`, `ایرانی · انتشار ${year}`, "years", String(year), description, "published-year", years.get(year).filter(item => item.persian));
    add(`curated-year-mix-${year}`, `جهانی · انتشار ${year}`, "years", String(year), description, "published-year", years.get(year).filter(item => !item.persian));
  }
  return playlists;
}

export function buildMoodPlaylists(tracks, date = new Date(), libraryTracks = [], sourceCollections = []) {
  const week = Math.floor(date.getTime() / (7 * 86400_000));
  const playlists = [], gaps = [];
  playlists.push(...curatedPlaylists(collectionTracks(tracks, libraryTracks), date));
  playlists.push(...meloobitPlaylists(tracks, sourceCollections, date));
  const taggedLibrary = libraryTracks
    .filter(t => t.kind === "track" && t.sources?.some(s => s.provider === "melodify" && s.available !== false))
    .sort((a, b) => String(b.addedAt ?? "").localeCompare(String(a.addedAt ?? "")) || String(a.id).localeCompare(String(b.id), "en", { numeric: true }));
  if (taggedLibrary.length) {
    const covers = [...new Set(taggedLibrary.map(t => t.coverUrl).filter(Boolean))].slice(0, 4);
    const artists = new Set(taggedLibrary.flatMap(t => (t.artists ?? [t.artist]).filter(Boolean).map(a => a.slug)));
    playlists.push({
      id: "melodify-tagged-library",
      title: "آرشیو تگ‌دار ملودیفای",
      scope: "archive",
      mood: "tags",
      description: "همهٔ آهنگ‌های تازه‌وارد ملودیفای، مرتب‌شده با تگ‌های واقعی فایل‌ها؛ هر تگ را می‌توانی از دسته‌بندی‌های موسیقی جداگانه دنبال کنی.",
      trackIds: taggedLibrary.map(t => t.id),
      covers,
      artistCount: artists.size,
      selection: "library-tags",
      updatedAt: date.toISOString(),
    });
    const byTag = new Map();
    for (const track of taggedLibrary) {
      for (const tag of new Set([track.category, ...(track.moods ?? [])].map(value => String(value ?? '').trim()).filter(Boolean))) {
        if (!byTag.has(tag)) byTag.set(tag, []);
        byTag.get(tag).push(track);
      }
    }
    for (const [tag, tagged] of [...byTag].sort(([a], [b]) => a.localeCompare(b, 'fa'))) {
      const slug = tag.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
      playlists.push({
        id: `library-tag-${slug || hash(tag).slice(0, 12)}`,
        title: tag,
        scope: 'tags',
        mood: tag,
        description: `پلی‌لیست «${tag}» از تگ‌های واقعی آرشیو موسیقی؛ همهٔ ${tagged.length.toLocaleString('fa-IR')} آهنگ این دسته، با صفحهٔ خوانندگان و پخش پیوسته.`,
        trackIds: tagged.map(track => track.id),
        covers: [...new Set(tagged.map(track => track.coverUrl).filter(Boolean))].slice(0, 4),
        artistCount: new Set(tagged.flatMap(track => (track.artists ?? [track.artist]).filter(Boolean).map(artist => artist.slug))).size,
        selection: 'library-tags',
        updatedAt: date.toISOString(),
      });
    }
  }
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
      const candidates = usable.filter(t => accepts(t) && pattern.test(tags(t)))
        .map(track => ({ track, rank: hash(`${week}:${id}:${track.id}`) }))
        .sort((a, b) => a.rank.localeCompare(b.rank)).map(item => item.track);
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
      if (playlists.some(p => p.selection === "editorial-tags" && p.trackIds.filter(id => trackIds.includes(id)).length / Math.min(p.trackIds.length, trackIds.length) > .8)) continue;
      playlists.push({ id, title: `${title} · ${scopeTitle}`, scope, mood, description: "گلچین پیشنهادی سرونما بر پایهٔ برچسب‌های آرشیو؛ ترکیب هنرمندها و کاورها هر هفته بازچینی می‌شود.", trackIds, covers: [...covers.keys()].slice(0, 4), artistCount: artistCounts.size, selection: "editorial-tags", updatedAt: date.toISOString() });
    }
  }
  return { version: 1, updatedAt: date.toISOString(), playlists, gaps, uniqueTracks: new Set(playlists.flatMap(p => p.trackIds)).size };
}

async function main() {
  const index = JSON.parse(await readFile("public/data/music-index.json", "utf8"));
  const library = JSON.parse(await readFile("public/data/melodify-library.json", "utf8").catch(() => "{\"tracks\":[]}"));
  const meloobit = JSON.parse(await readFile(`${process.env.MELOOBIT_STATE_DIR || '.media-cache/music'}/meloobit-source.json`, 'utf8').catch(() => '{"collections":[]}'));
  const result = buildMoodPlaylists(index.tracks, new Date(), library.tracks ?? [], meloobit.collections ?? []);
  await mkdir("public/data", { recursive: true });
  const file = "public/data/music-mood-playlists.json";
  const ids = new Set(result.playlists.filter(p => p.selection !== "library-tags").flatMap(p => p.trackIds));
  const tracksFile = "public/data/music-mood-tracks.json";
  const tracks = collectionTracks(index.tracks, library.tracks ?? []).filter(t => ids.has(t.id)).map(t => ({ ...t, description: null }));
  // Publish media metadata first; landing cards never load the full audio catalog.
  await writeFile(`${tracksFile}.tmp-${process.pid}`, JSON.stringify({ updatedAt: result.updatedAt, tracks }));
  await rename(`${tracksFile}.tmp-${process.pid}`, tracksFile);
  await writeFile(`${file}.tmp-${process.pid}`, JSON.stringify(result)); await rename(`${file}.tmp-${process.pid}`, file);
  console.log(JSON.stringify({ playlists: result.playlists.length, uniqueTracks: result.uniqueTracks, gaps: result.gaps.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error); process.exitCode = 1; });
