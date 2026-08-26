import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const valueOf = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const INPUT_FILE = valueOf("--input", path.join(".media-cache", "vod-sync", "old-iranian-wikidata-retry.json"));
const SOURCE_FILE = valueOf("--source", path.join(".media-cache", "vod-sync", "old-iranian-films-source.json"));
const OUT_FILE = valueOf("--out", path.join(".media-cache", "vod-sync", "old-iranian-metadata-final.json"));
const CACHE_FILE = valueOf("--cache", path.join(".media-cache", "vod-sync", "filmposters-db.json"));
const REPORT_FILE = valueOf("--report", path.join(".media-cache", "vod-sync", "old-iranian-poster-archive-report.json"));
const CONCURRENCY = Math.max(1, Math.min(4, Number(valueOf("--concurrency", "2")) || 2));
const USE_IMDB_API = !args.has("--no-imdb-api");
const REFRESH = args.has("--refresh");
const IMDB_API_BASE = process.env.IMDB_DATA_API_BASE || "http://185.203.118.87:8026";
const FILM_POSTERS_DB = "https://filmposters.ir/db.json";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const MAX_CREDITS = 16;
const ARCHIVE_MATCH_SCORE = 130;

async function main() {
  const [previous, source, db] = await Promise.all([
    readJson(INPUT_FILE),
    readJson(SOURCE_FILE),
    loadPosterDatabase(),
  ]);
  const sourceById = new Map((source.items ?? []).map((item) => [item.id, item]));
  const archiveIndex = buildArchiveIndex(db.films ?? {});
  const candidates = (previous.items ?? [])
    .filter((item) => item.status === "unmatched")
    .map((item) => ({ item, source: sourceById.get(item.id) ?? item }))
    .map(({ item, source: sourceItem }) => ({ item, sourceItem, film: chooseArchiveFilm(sourceItem, archiveIndex) }))
    .filter((entry) => entry.film);

  const personIds = new Set();
  for (const { film } of candidates) {
    for (const id of [...(film.directors ?? []), ...(film.cast ?? [])].slice(0, MAX_CREDITS)) personIds.add(id);
  }
  const wikidataPeople = await getWikidataEntities([...personIds]);
  const results = new Map();
  let imdbEnriched = 0;

  await mapPool(candidates, async ({ item, sourceItem, film }) => {
    const record = await enrichFromPosterArchive(item, sourceItem, film, db.secondary ?? {}, wikidataPeople);
    if (record.imdbEnriched) imdbEnriched += 1;
    results.set(item.id, record);
  }, CONCURRENCY);

  const items = (previous.items ?? []).map((item) => results.get(item.id) ?? item);
  const matched = items.filter((item) => item.status === "matched");
  const payload = {
    ...previous,
    sourceUrl: FILM_POSTERS_DB,
    generatedAt: new Date().toISOString(),
    posterArchive: "FilmPosters Iran",
    posterArchiveMatchedThisRun: results.size,
    imdbEnrichedThisRun: imdbEnriched,
    matchedTitles: matched.length,
    unmatchedTitles: items.filter((item) => item.status === "unmatched").length,
    failedTitles: items.filter((item) => item.status === "error").length,
    titlesWithPoster: matched.filter((item) => item.posterUrl).length,
    titlesWithBackdrop: matched.filter((item) => item.backdropUrl).length,
    titlesWithCast: matched.filter((item) => item.credits?.length).length,
    titlesWithCastImages: matched.filter((item) => item.credits?.some((credit) => credit.name_image_url)).length,
    titlesWithImdb: matched.filter((item) => item.imdbUrl).length,
    items,
  };
  await Promise.all([save(OUT_FILE, payload), save(REPORT_FILE, payload)]);
  console.log(JSON.stringify({
    outFile: OUT_FILE,
    candidates: candidates.length,
    ...summarize(payload),
  }, null, 2));
}

async function enrichFromPosterArchive(item, sourceItem, film, secondary, wikidataPeople) {
  const imdbCode = (film.imdb ?? []).find((value) => /^tt\d+$/u.test(value)) ?? null;
  const poster = (film.posters ?? []).find((entry) => entry?.image) ?? null;
  const posterUrl = poster ? posterArchiveUrl(poster.image, poster.hash ?? "", 960) : null;
  const smallPosterUrl = poster ? posterArchiveUrl(poster.image, poster.hash ?? "", 520) : null;
  const credits = creditsFor(film, secondary, wikidataPeople);
  const base = {
    id: item.id,
    sourceTitle: sourceItem.title,
    title: film.labels?.en ?? sourceItem.title,
    originalTitle: film.labels?.en ?? null,
    persianTitle: film.labels?.fa ?? sourceItem.title,
    year: filmYear(film) ?? sourceItem.year ?? null,
    releaseDate: filmDate(film) ?? sourceItem.releaseDate ?? null,
    overview: null,
    persianOverview: null,
    genres: labelsFor(film.genres, secondary, "en"),
    persianGenres: labelsFor(film.genres, secondary, "fa"),
    countries: ["Iran"],
    persianCountries: ["ایران"],
    languages: ["Persian"],
    persianLanguages: ["فارسی"],
    posterUrl: smallPosterUrl,
    backdropUrl: posterUrl ?? smallPosterUrl,
    imdbUrl: imdbCode ? `https://www.imdb.com/title/${imdbCode}/` : null,
    imdbImages: posterUrl ? [{ image_id: `filmposters-${film.id}`, url: posterUrl, width: null, height: null, caption: film.labels?.fa ?? sourceItem.title }] : [],
    credits,
    metadataSources: [
      { provider: "FilmPosters Iran", url: `https://filmposters.ir/#/film/${film.id}` },
      ...(imdbCode ? [{ provider: "IMDb", url: `https://www.imdb.com/title/${imdbCode}/` }] : []),
    ],
    status: "matched",
    checkedAt: new Date().toISOString(),
    wikidataId: film.id,
    wikidataUrl: `https://www.wikidata.org/wiki/${film.id}`,
    matchScore: ARCHIVE_MATCH_SCORE,
    imdbExternalCode: imdbCode,
    posterArchiveEnriched: true,
  };
  const imdb = USE_IMDB_API && imdbCode ? await getImdbMetadata(imdbCode).catch(() => null) : null;
  return imdb ? { ...mergeImdb(base, imdb, imdbCode), imdbEnriched: true } : { ...base, imdbEnriched: false };
}

function buildArchiveIndex(films) {
  const byTitle = new Map();
  for (const film of Object.values(films)) {
    const names = [film.labels?.fa, ...(film.aliases?.fa ?? [])].filter(Boolean);
    for (const name of names) {
      const key = normalize(name);
      if (!key) continue;
      const values = byTitle.get(key) ?? [];
      values.push(film);
      byTitle.set(key, values);
    }
  }
  return byTitle;
}

function chooseArchiveFilm(sourceItem, archiveIndex) {
  const choices = archiveIndex.get(normalize(sourceItem.title)) ?? [];
  const unique = [...new Map(choices.map((film) => [film.id, film])).values()];
  if (unique.length !== 1) return null;
  const film = unique[0];
  const year = filmYear(film);
  if (sourceItem.year && year && Math.abs(sourceItem.year - year) > 4) return null;
  return film;
}

function creditsFor(film, secondary, wikidataPeople) {
  const credits = [
    ...(film.directors ?? []).map((id) => ({ id, category: "Director" })),
    ...(film.cast ?? []).map((id) => ({ id, category: "Actor" })),
  ].slice(0, MAX_CREDITS);
  return credits.map(({ id, category }) => {
    const local = secondary[id] ?? {};
    const remote = wikidataPeople[id] ?? {};
    return {
      category,
      name_id: `wd-${id}`,
      name_text: local.labels?.fa ?? remote.labels?.fa?.value ?? local.labels?.en ?? remote.labels?.en?.value ?? id,
      name_image_url: commonsImage(firstString(remote, "P18"), 320),
    };
  });
}

function labelsFor(ids, secondary, language) {
  return [...new Set((ids ?? []).map((id) => secondary[id]?.labels?.[language] ?? secondary[id]?.labels?.en).filter(Boolean))];
}

function filmDate(film) {
  const raw = (film.date ?? []).find(Boolean);
  return raw ? raw.replace(/^\+/u, "").slice(0, 10) : null;
}

function filmYear(film) {
  const match = /^(?:\+)?(\d{4})/u.exec((film.date ?? []).find(Boolean) ?? "");
  return match ? Number(match[1]) : null;
}

function posterArchiveUrl(name, hash, width) {
  if (!name) return null;
  if (!hash) return `https://archive.org/download/filmpostersofiran/${encodeURIComponent(width <= 520 ? name.replace(/\.jpg$/iu, "_thumb.jpg") : name)}`;
  const actualWidth = width <= 520 ? 250 : 960;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash[0]}/${hash}/${encodeURIComponent(name)}/${actualWidth}px-${encodeURIComponent(name)}`;
}

async function loadPosterDatabase() {
  if (!REFRESH) {
    const cached = await readJson(CACHE_FILE, null);
    if (cached?.films) return cached;
  }
  const db = await fetchJson(FILM_POSTERS_DB, { Accept: "application/json" }, { timeout: 45_000 });
  await save(CACHE_FILE, db);
  return db;
}

async function getWikidataEntities(ids) {
  const result = {};
  for (const chunk of chunks([...new Set(ids.filter(Boolean))], 40)) {
    const url = new URL(WIKIDATA_API);
    for (const [key, value] of Object.entries({ action: "wbgetentities", format: "json", origin: "*", ids: chunk.join("|"), props: "labels|claims", languages: "fa|en" })) url.searchParams.set(key, value);
    const payload = await fetchJson(url, { Accept: "application/json" });
    for (const [id, entity] of Object.entries(payload.entities ?? {})) if (!entity.missing) result[id] = entity;
    await sleep(360);
  }
  return result;
}

async function getImdbMetadata(imdbCode) {
  return fetchJson(new URL(`/titles/${imdbCode}/fetch`, IMDB_API_BASE), { Accept: "application/json" }, { method: "POST", timeout: 20_000 });
}

function mergeImdb(base, data, imdbCode) {
  const apiImages = [
    data.primary_image_url ? imageFromApi(data.primary_image_url, data.primary_image_caption ?? null, "primary") : null,
    ...(Array.isArray(data.images) ? data.images.map((image, index) => imageFromApi(image.url, image.caption ?? null, image.image_id ?? `imdb-${index}`)) : []),
  ].filter(Boolean);
  const imdbCredits = (Array.isArray(data.credits) ? data.credits : []).slice(0, MAX_CREDITS).map((credit, index) => ({
    category: credit.category ?? "Cast",
    name_id: credit.name_id ?? `imdb-${imdbCode}-${index}`,
    name_text: credit.name_text ?? credit.name ?? "Unknown",
    name_image_url: credit.name_image_url ?? null,
  }));
  const images = uniqueByUrl([...apiImages, ...(base.imdbImages ?? [])]).slice(0, 24);
  const primary = apiImages[0]?.url ?? base.posterUrl ?? null;
  const backdrop = images.find((image) => (image.width ?? 0) > (image.height ?? 0))?.url ?? base.backdropUrl ?? primary;
  return {
    ...base,
    title: data.title_text ?? base.title,
    originalTitle: data.original_title_text ?? base.originalTitle,
    year: data.release_year ?? base.year,
    releaseDate: data.release_date ?? base.releaseDate,
    runtimeMinutes: data.runtime_seconds ? Math.round(data.runtime_seconds / 60) : base.runtimeMinutes,
    overview: data.plot ?? base.overview,
    imdbRating: data.rating ?? null,
    imdbVotes: data.vote_count ?? null,
    metascore: data.metascore ?? null,
    certificate: data.certificate ?? null,
    genres: Array.isArray(data.genres) && data.genres.length ? data.genres : base.genres,
    countries: asTextList(data.countries).length ? asTextList(data.countries) : base.countries,
    languages: asTextList(data.languages).length ? asTextList(data.languages) : base.languages,
    posterUrl: primary,
    backdropUrl: backdrop,
    imdbImages: images,
    imdbVideos: Array.isArray(data.videos) ? data.videos.slice(0, 8) : [],
    credits: mergeCredits(imdbCredits, base.credits ?? []),
    companies: Array.isArray(data.companies) ? data.companies.slice(0, 12) : [],
    keywords: Array.isArray(data.keywords) ? data.keywords.slice(0, 16) : [],
    imdbUrl: `https://www.imdb.com/title/${imdbCode}/`,
    apiFetchedAt: data.fetched_at ?? new Date().toISOString(),
  };
}

function mergeCredits(primary, secondary) {
  const byName = new Map();
  for (const credit of [...primary, ...secondary]) {
    const key = normalize(credit.name_text);
    if (!key) continue;
    const existing = byName.get(key);
    byName.set(key, existing ? { ...existing, ...credit, name_image_url: existing.name_image_url ?? credit.name_image_url ?? null } : credit);
  }
  return Array.from(byName.values()).slice(0, MAX_CREDITS);
}

function imageFromApi(url, caption, id) {
  return url ? { image_id: id, url, width: null, height: null, caption } : null;
}

function uniqueByUrl(images) {
  return images.filter((image, index, all) => image?.url && all.findIndex((other) => other?.url === image.url) === index);
}

function asTextList(values) {
  return Array.isArray(values) ? values.map((value) => value?.text ?? value).filter(Boolean) : [];
}

function claims(entity, property) {
  return entity?.claims?.[property] ?? [];
}

function firstString(entity, property) {
  return claims(entity, property).map((claim) => claim.mainsnak?.datavalue?.value).find((value) => typeof value === "string") ?? null;
}

function commonsImage(fileName, width) {
  return fileName ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}` : null;
}

function normalize(value) {
  return String(value ?? "")
    .replace(/[ئ]/gu, "ی")
    .replace(/[ؤ]/gu, "و")
    .replace(/[ةۀ]/gu, "ه")
    .replace(/[ك]/gu, "ک")
    .replace(/طالئی|طالی/gu, "طلایی")
    .replace(/ارسالن/gu, "ارسلان")
    .replace(/گیالن/gu, "گیلان")
    .replace(/النه/gu, "لانه")
    .replace(/کاله/gu, "کلاه")
    .replace(/ناقال/gu, "نقال")
    .replace(/تامرگ/gu, "تا مرگ")
    .toLowerCase()
    .replace(/\u200c/gu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

async function fetchJson(url, headers, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { "User-Agent": "SarvNemaCatalogBot/1.0 (classic Iranian cinema metadata)", ...headers },
        signal: AbortSignal.timeout(options.timeout ?? 20_000),
      });
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          await sleep((attempt + 1) * 1_250);
          continue;
        }
        throw new Error(`HTTP ${response.status} ${url}`);
      }
      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep((attempt + 1) * 850);
    }
  }
  throw lastError ?? new Error(`Unable to fetch ${url}`);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function chunks(values, size) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
}

async function mapPool(items, worker, concurrency) {
  let index = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (index < items.length) await worker(items[index++]);
  }));
}

function summarize(payload) {
  return {
    totalTitles: payload.items.length,
    matchedTitles: payload.matchedTitles,
    unmatchedTitles: payload.unmatchedTitles,
    titlesWithPoster: payload.titlesWithPoster,
    titlesWithCast: payload.titlesWithCast,
    titlesWithCastImages: payload.titlesWithCastImages,
    titlesWithImdb: payload.titlesWithImdb,
  };
}

async function readJson(file, fallback = undefined) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

async function save(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
