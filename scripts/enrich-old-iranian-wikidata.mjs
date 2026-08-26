import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const valueOf = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const IN_FILE = valueOf("--input", path.join(".media-cache", "vod-sync", "old-iranian-films-source.json"));
const OUT_FILE = valueOf("--out", path.join(".media-cache", "vod-sync", "old-iranian-wikidata.json"));
const CACHE_FILE = valueOf("--cache", path.join(".media-cache", "vod-sync", "old-iranian-wikidata-cache.json"));
const REPORT_FILE = valueOf("--report", path.join(".media-cache", "vod-sync", "old-iranian-wikidata-report.json"));
const LIMIT = Math.max(0, Number(valueOf("--limit", "0")) || 0);
const CONCURRENCY = Math.max(1, Math.min(4, Number(valueOf("--concurrency", "2")) || 2));
const DELAY_MS = Math.max(120, Number(valueOf("--delay-ms", "420")) || 420);
const RETRIES = Math.max(0, Number(valueOf("--retries", "2")) || 2);
const USE_IMDB_API = !args.has("--no-imdb-api");
const REFRESH = args.has("--refresh");
const RETRY_UNMATCHED = args.has("--retry-unmatched");
const IMDB_API_BASE = process.env.IMDB_DATA_API_BASE || "http://185.203.118.87:8026";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const USER_AGENT = "SarvNemaCatalogBot/1.0 (classic Iranian cinema metadata; contact@sarvnema.ir)";
const FILM_QID = "Q11424";
const MAX_CAST = 16;
const MIN_MATCH_SCORE = 100;

let requestCounter = 0;

async function main() {
  const source = await readJson(IN_FILE);
  const cache = await readJson(CACHE_FILE, { entries: {}, people: {} });
  cache.entries ??= {};
  cache.people ??= {};

  const input = source.items ?? [];
  const selected = (LIMIT ? input.slice(0, LIMIT) : input).filter((item) => {
    const cached = cache.entries[item.id];
    return REFRESH || !cached || (RETRY_UNMATCHED && cached.status === "unmatched");
  });
  let completed = 0;
  let matched = 0;
  let imdbEnriched = 0;
  let failed = 0;

  await mapPool(selected, async (item) => {
    try {
      const entry = await enrichItem(item, cache.people);
      cache.entries[item.id] = entry;
      if (entry.status === "matched") matched += 1;
      if (entry.imdbEnriched) imdbEnriched += 1;
    } catch (error) {
      failed += 1;
      cache.entries[item.id] = {
        id: item.id,
        title: item.title,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        checkedAt: new Date().toISOString(),
      };
    } finally {
      completed += 1;
      if (completed % 10 === 0 || completed === selected.length) {
        await save(CACHE_FILE, cache);
      }
      console.log(`old-iranian metadata ${completed}/${selected.length} ${item.id}`);
    }
  }, CONCURRENCY);

  const items = input.map((item) => cache.entries[item.id] ?? {
    id: item.id,
    title: item.title,
    status: "pending",
  });
  const stats = summarize(items);
  const payload = {
    sourceUrl: "https://www.wikidata.org/",
    inputFile: IN_FILE,
    generatedAt: new Date().toISOString(),
    imdbApiEnabled: USE_IMDB_API,
    totalTitles: input.length,
    processedThisRun: selected.length,
    matchedThisRun: matched,
    imdbEnrichedThisRun: imdbEnriched,
    failedThisRun: failed,
    ...stats,
    items,
  };

  await Promise.all([save(OUT_FILE, payload), save(CACHE_FILE, cache), save(REPORT_FILE, payload)]);
  console.log(JSON.stringify({ outFile: OUT_FILE, reportFile: REPORT_FILE, ...stats, processedThisRun: selected.length, failedThisRun: failed }, null, 2));
}

async function enrichItem(item, peopleCache) {
  const candidates = await searchEntities(item.title);
  const entities = await getEntities(candidates.map((candidate) => candidate.id));
  const candidate = chooseFilm(item, entities);
  const checkedAt = new Date().toISOString();

  if (!candidate) {
    return {
      id: item.id,
      title: item.title,
      status: "unmatched",
      checkedAt,
      candidateIds: candidates.map((entry) => entry.id),
    };
  }

  const entity = candidate.entity;
  const imdbCode = firstString(entity, "P345");
  const base = await enrichFromWikidata(item, entity, candidate.score, peopleCache);
  const imdb = USE_IMDB_API && imdbCode ? await getImdbMetadata(imdbCode).catch(() => null) : null;
  const result = imdb ? mergeImdb(base, imdb, imdbCode) : base;

  return {
    ...result,
    id: item.id,
    sourceTitle: item.title,
    status: "matched",
    checkedAt,
    wikidataId: entity.id,
    wikidataUrl: `https://www.wikidata.org/wiki/${entity.id}`,
    matchScore: candidate.score,
    imdbExternalCode: imdbCode ?? null,
    imdbEnriched: Boolean(imdb),
  };
}

async function enrichFromWikidata(item, entity, score, peopleCache) {
  const imageFile = firstString(entity, "P18");
  const title = label(entity, "en") ?? item.title;
  const persianTitle = label(entity, "fa") ?? item.title;
  const description = descriptionFor(entity, "en");
  const persianDescription = descriptionFor(entity, "fa");
  const releaseDate = firstTime(entity, "P577");
  const runtimeMinutes = amount(entity, "P2047");
  const genreIds = entityIds(entity, "P136");
  const genreEntities = await getEntities(genreIds);
  const credits = await creditsFor(entity, peopleCache);
  const imageUrl = commonsImage(imageFile, 900);
  const thumbnail = commonsImage(imageFile, 520);
  const imdbCode = firstString(entity, "P345");

  return {
    id: item.id,
    title,
    originalTitle: title,
    persianTitle,
    year: releaseDate?.year ?? item.year ?? null,
    releaseDate: releaseDate?.value ?? item.releaseDate ?? null,
    runtimeMinutes: runtimeMinutes ?? item.runtimeMinutes ?? null,
    overview: description ?? item.overview ?? null,
    persianOverview: persianDescription ?? item.persianOverview ?? null,
    genres: labelsFor(genreEntities, "en"),
    persianGenres: labelsFor(genreEntities, "fa"),
    countries: ["Iran"],
    persianCountries: ["ایران"],
    languages: ["Persian"],
    persianLanguages: ["فارسی"],
    posterUrl: thumbnail ?? null,
    backdropUrl: imageUrl ?? thumbnail ?? null,
    imdbUrl: imdbCode ? `https://www.imdb.com/title/${imdbCode}/` : null,
    imdbImages: imageUrl ? [{ image_id: `wikidata-${entity.id}`, url: imageUrl, width: null, height: null, caption: persianTitle }] : [],
    credits,
    metadataSources: [
      { provider: "Wikidata", url: `https://www.wikidata.org/wiki/${entity.id}` },
      ...(imdbCode ? [{ provider: "IMDb", url: `https://www.imdb.com/title/${imdbCode}/` }] : []),
    ],
    matchScore: score,
  };
}

async function creditsFor(entity, peopleCache) {
  const people = [
    ...entityIds(entity, "P57").map((id) => ({ id, category: "Director" })),
    ...entityIds(entity, "P161").map((id) => ({ id, category: "Actor" })),
  ].slice(0, MAX_CAST);
  if (!people.length) return [];

  const missing = people.map((person) => person.id).filter((id) => !peopleCache[id]);
  if (missing.length) {
    const entities = await getEntities(missing);
    for (const [id, person] of Object.entries(entities)) {
      peopleCache[id] = {
        id,
        name: label(person, "fa") ?? label(person, "en") ?? id,
        imageUrl: commonsImage(firstString(person, "P18"), 320),
      };
    }
  }

  return people.map((person) => {
    const data = peopleCache[person.id] ?? { name: person.id, imageUrl: null };
    return {
      category: person.category,
      name_id: `wd-${person.id}`,
      name_text: data.name,
      name_image_url: data.imageUrl ?? null,
    };
  });
}

function mergeImdb(base, data, imdbCode) {
  const apiImages = [
    data.primary_image_url ? imageFromApi(data.primary_image_url, data.primary_image_caption ?? null, "primary") : null,
    ...(Array.isArray(data.images) ? data.images.map((image, index) => imageFromApi(image.url, image.caption ?? null, image.image_id ?? `imdb-${index}`)) : []),
  ].filter(Boolean);
  const imdbCredits = (Array.isArray(data.credits) ? data.credits : []).slice(0, MAX_CAST).map((credit, index) => ({
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
    originalTitle: data.original_title_text ?? base.originalTitle ?? null,
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
    byName.set(key, existing ? {
      ...existing,
      ...credit,
      name_image_url: existing.name_image_url ?? credit.name_image_url ?? null,
    } : credit);
  }
  return Array.from(byName.values()).slice(0, MAX_CAST);
}

function imageFromApi(url, caption, id) {
  if (!url) return null;
  return { image_id: id, url, width: null, height: null, caption };
}

function uniqueByUrl(images) {
  return images.filter((image, index, all) => image?.url && all.findIndex((other) => other?.url === image.url) === index);
}

function asTextList(values) {
  return Array.isArray(values) ? values.map((value) => value?.text ?? value).filter(Boolean) : [];
}

function chooseFilm(item, entities) {
  const candidates = Object.values(entities).map((entity) => ({ entity, score: scoreFilm(item, entity) }));
  const winner = candidates.sort((a, b) => b.score - a.score)[0] ?? null;
  // An exact name alone can point to a song, book, or person. Do not enrich a
  // title unless Wikidata also identifies the candidate as a film.
  return winner && isFilm(winner.entity) && winner.score >= MIN_MATCH_SCORE ? winner : null;
}

function scoreFilm(item, entity) {
  const names = [label(entity, "fa"), label(entity, "en"), ...aliases(entity, "fa"), ...aliases(entity, "en")]
    .filter(Boolean)
    .map(normalize);
  const target = normalize(item.title);
  let score = names.includes(target) ? 75 : names.some((name) => name.includes(target) || target.includes(name)) ? 38 : 0;
  const release = firstTime(entity, "P577")?.year ?? null;
  if (release && item.year && Math.abs(release - item.year) <= 3) score += 22;
  if (isFilm(entity)) score += 20;
  const description = `${descriptionFor(entity, "fa") ?? ""} ${descriptionFor(entity, "en") ?? ""}`;
  if (/film|movie|فیلم/iu.test(description)) score += 8;
  return score;
}

function isFilm(entity) {
  return entityIds(entity, "P31").includes(FILM_QID) || /film|movie|فیلم/iu.test(`${descriptionFor(entity, "fa") ?? ""} ${descriptionFor(entity, "en") ?? ""}`);
}

async function searchEntities(title) {
  const matches = [];
  for (const query of titleVariants(title)) {
    const payload = await wikidata({ action: "wbsearchentities", search: query, language: "fa", limit: "10" });
    matches.push(...(payload.search ?? []));
  }
  return Array.from(new Map(matches.map((match) => [match.id, match])).values());
}

async function getEntities(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const payload = await wikidata({ action: "wbgetentities", ids: unique.join("|"), props: "labels|aliases|descriptions|claims", languages: "fa|en" });
  return Object.fromEntries(Object.entries(payload.entities ?? {}).filter(([, entity]) => !entity.missing));
}

async function wikidata(params) {
  const url = new URL(WIKIDATA_API);
  for (const [key, value] of Object.entries({ format: "json", origin: "*", ...params })) url.searchParams.set(key, value);
  return fetchJson(url, { Accept: "application/json", "User-Agent": USER_AGENT });
}

async function getImdbMetadata(imdbCode) {
  return fetchJson(new URL(`/titles/${imdbCode}/fetch`, IMDB_API_BASE), { Accept: "application/json" }, { method: "POST", timeout: 20_000 });
}

async function fetchJson(url, headers, options = {}) {
  let lastError;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      await throttle();
      const response = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(options.timeout ?? 15_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${url.hostname}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await sleep((attempt + 1) * 600);
    }
  }
  throw lastError;
}

async function throttle() {
  requestCounter += 1;
  if (requestCounter > 1) await sleep(DELAY_MS);
}

function label(entity, language) {
  return entity?.labels?.[language]?.value ?? null;
}

function aliases(entity, language) {
  return entity?.aliases?.[language]?.map((alias) => alias.value).filter(Boolean) ?? [];
}

function descriptionFor(entity, language) {
  return entity?.descriptions?.[language]?.value ?? null;
}

function claims(entity, property) {
  return entity?.claims?.[property] ?? [];
}

function firstString(entity, property) {
  return claims(entity, property).map((claim) => claim.mainsnak?.datavalue?.value).find((value) => typeof value === "string") ?? null;
}

function entityIds(entity, property) {
  return claims(entity, property)
    .map((claim) => claim.mainsnak?.datavalue?.value?.id)
    .filter((id) => typeof id === "string");
}

function firstTime(entity, property) {
  const raw = claims(entity, property).map((claim) => claim.mainsnak?.datavalue?.value?.time).find(Boolean);
  const match = raw ? /^\+?(\d{4})-/.exec(raw) : null;
  return match ? { value: raw.slice(1, 11), year: Number(match[1]) } : null;
}

function amount(entity, property) {
  const value = claims(entity, property).map((claim) => claim.mainsnak?.datavalue?.value?.amount).find(Boolean);
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function labelsFor(entities, language) {
  return [...new Set(Object.values(entities).map((entity) => label(entity, language) ?? label(entity, "en")).filter(Boolean))];
}

function commonsImage(fileName, width) {
  if (!fileName) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}`;
}

function normalize(value) {
  return canonicalPersian(value)
    .toLowerCase()
    .replace(/[آأإ]/gu, "ا")
    .replace(/[ىي]/gu, "ی")
    .replace(/\u200c/gu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function titleVariants(value) {
  const original = String(value ?? "").trim();
  const canonical = canonicalPersian(original).trim();
  return [...new Set([original, canonical].filter(Boolean))];
}

function canonicalPersian(value) {
  return String(value ?? "")
    .replace(/[ئ]/gu, "ی")
    .replace(/[ؤ]/gu, "و")
    .replace(/[ةۀ]/gu, "ه")
    .replace(/[ك]/gu, "ک")
    // Common spellings and OCR errors in the scanned classic-film index.
    .replace(/طالئی|طالی/gu, "طلایی")
    .replace(/ارسالن/gu, "ارسلان")
    .replace(/گیالن/gu, "گیلان")
    .replace(/النه/gu, "لانه")
    .replace(/کاله/gu, "کلاه")
    .replace(/ناقال/gu, "نقال")
    .replace(/تامرگ/gu, "تا مرگ")
    .replace(/\s+/gu, " ");
}

function summarize(items) {
  const matched = items.filter((item) => item.status === "matched");
  return {
    matchedTitles: matched.length,
    unmatchedTitles: items.filter((item) => item.status === "unmatched").length,
    failedTitles: items.filter((item) => item.status === "error").length,
    titlesWithPoster: matched.filter((item) => item.posterUrl).length,
    titlesWithBackdrop: matched.filter((item) => item.backdropUrl).length,
    titlesWithCast: matched.filter((item) => item.credits?.length).length,
    titlesWithCastImages: matched.filter((item) => item.credits?.some((credit) => credit.name_image_url)).length,
    titlesWithImdb: matched.filter((item) => item.imdbUrl).length,
  };
}

async function mapPool(items, worker, concurrency) {
  let index = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const current = index++;
      await worker(items[current]);
    }
  }));
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (fallback !== null) return fallback;
    throw error;
  }
}

async function save(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
