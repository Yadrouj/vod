import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildSourceLabel,
  extractImdbIds,
  inferGroup,
  inferQuality,
  inferRelease,
  isSubtitleFile,
  isVideoFile,
  movieIdentityFromFile,
  normalizeSourcePath,
  normalizeTitle,
  parseDirectoryRows,
  parseSeasonEpisode,
  seriesTitleFromDirectory,
  sortQuality,
  sourceEvidenceScore,
  subtitleLanguage,
} from "./moviesho-source-lib.mjs";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";

const CATALOG_FILE = process.argv[2] || path.join("public", "data", "vod-catalog.json");
const OUT_FILE = process.argv[3] || path.join(".media-cache", "vod-sync", "moviesho-source.json");
const REPORT_FILE = process.argv[4] || path.join(".media-cache", "vod-sync", "moviesho-report.json");
const DOWNLOAD_BASE = ensureSlash(process.env.MOVIESHO_DOWNLOAD_BASE || "https://sr1.moviesho.com/");
const SITE_BASE = ensureSlash(process.env.MOVIESHO_SITE_BASE || "https://www.moviesho.com/");
const MOVIE_ROOT = new URL("Movie/", DOWNLOAD_BASE).toString();
const SERIES_ROOT = new URL("Series/", DOWNLOAD_BASE).toString();
const CACHE_FILE = path.resolve(
  process.env.MOVIESHO_MATCH_CACHE || path.join(".media-cache", "vod-sync", "moviesho-match-cache.json"),
);
const MOVIE_YEARS = new Set(splitEnv(process.env.MOVIESHO_MOVIE_YEARS || "2025,2026"));
const MOVIE_MONTHS = new Set(splitEnv(process.env.MOVIESHO_MOVIE_MONTHS || ""));
const MOVIE_NAMES = new Set(splitEnv(process.env.MOVIESHO_MOVIE_NAMES || "").map(normalizeTitle));
const SERIES_NAMES = new Set(splitEnv(process.env.MOVIESHO_SERIES_NAMES || "").map(normalizeTitle));
const MOVIE_GROUP_LIMIT = positiveNumber(process.env.MOVIESHO_MOVIE_GROUP_LIMIT, 0);
const SERIES_LIMIT = positiveNumber(process.env.MOVIESHO_SERIES_LIMIT, 0);
const DIRECTORY_CONCURRENCY = positiveNumber(process.env.MOVIESHO_DIRECTORY_CONCURRENCY, 5, 1);
const MATCH_CONCURRENCY = positiveNumber(process.env.MOVIESHO_MATCH_CONCURRENCY, 4, 1);
const CANDIDATE_LIMIT = positiveNumber(process.env.MOVIESHO_CANDIDATE_LIMIT, 12, 1);
const SITE_REQUEST_INTERVAL_MS = positiveNumber(process.env.MOVIESHO_SITE_REQUEST_INTERVAL_MS, 220, 50);
const SITE_RETRIES = positiveNumber(process.env.MOVIESHO_SITE_RETRIES, 7, 2);
const TIMEOUT_MS = positiveNumber(process.env.MOVIESHO_TIMEOUT_MS, 18_000, 3_000);
const MATCH_TTL_MS = positiveNumber(process.env.MOVIESHO_MATCH_TTL_MS, 30 * 24 * 60 * 60 * 1000, 60_000);
const UNRESOLVED_TTL_MS = positiveNumber(process.env.MOVIESHO_UNRESOLVED_TTL_MS, 12 * 60 * 60 * 1000, 60_000);
const MAX_TREE_DEPTH = positiveNumber(process.env.MOVIESHO_MAX_TREE_DEPTH, 5, 1);
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SarvNema-Catalog/2.0";

const stats = {
  directoryPages: 0,
  publicSearches: 0,
  publicPages: 0,
  rateLimited: 0,
  cacheHits: 0,
  movieFiles: 0,
  seriesFiles: 0,
  matched: 0,
  existingSkipped: 0,
  unresolved: [],
  warnings: [],
};
const directoryCache = new Map();
let nextSiteRequestAt = 0;

async function main() {
  // Only the identity set is needed for exact-match de-duplication. Stream the
  // archive so this daily task remains safe once the catalog grows past Node's
  // maximum JSON string size.
  const existingIds = new Set();
  await streamVodArchiveItems(CATALOG_FILE, async (item) => {
    const id = item.imdbCode || item.id;
    if (id) existingIds.add(id);
  });
  const cache = await readCache();
  const matcher = createMatcher(cache);

  console.log("Discovering Moviesho movie uploads...");
  const movieFiles = await discoverMovieFiles();
  stats.movieFiles = movieFiles.length;
  const movieGroups = limitMovieGroups(buildMovieGroups(movieFiles));
  console.log(`Movies: ${movieFiles.length} files in ${movieGroups.length} title groups.`);

  let checkedMovies = 0;
  const movieResults = await mapLimit(movieGroups, MATCH_CONCURRENCY, async (group) => {
    const match = await matcher({
      kind: "movie",
      title: group.title,
      year: group.year,
      cacheKey: `movie:${group.key}`,
      exactPaths: group.videos.map((entry) => entry.url),
      sourcePrefix: "",
      sourceUrl: group.videos[0]?.url ?? MOVIE_ROOT,
    });
    checkedMovies += 1;
    if (checkedMovies % 25 === 0 || checkedMovies === movieGroups.length) {
      console.log(`Movie matching: ${checkedMovies}/${movieGroups.length}`);
    }
    if (!match) {
      addUnresolved("movie", group.title, group.year, group.videos[0]?.url, "No page contained both an IMDb link and an exact source file.");
      return null;
    }
    if (existingIds.has(match.imdbCode)) {
      stats.existingSkipped += 1;
      return null;
    }
    return movieItem(group, match);
  });

  console.log("Discovering Moviesho series folders...");
  const seriesDirectories = await discoverSeriesDirectories();
  console.log(`Series: ${seriesDirectories.length} title folders to verify.`);
  let checkedSeries = 0;
  const seriesResults = await mapLimit(seriesDirectories, MATCH_CONCURRENCY, async (directory) => {
    const title = seriesTitleFromDirectory(directory.name);
    const prefix = normalizeSourcePath(directory.url);
    const match = await matcher({
      kind: "series",
      title,
      year: null,
      cacheKey: `series:${prefix}`,
      exactPaths: [],
      sourcePrefix: prefix,
      sourceUrl: directory.url,
    });
    checkedSeries += 1;
    if (checkedSeries % 25 === 0 || checkedSeries === seriesDirectories.length) {
      console.log(`Series matching: ${checkedSeries}/${seriesDirectories.length}`);
    }
    if (!match) {
      addUnresolved("series", title, null, directory.url, "No page contained both an IMDb link and this exact series directory.");
      return null;
    }
    if (existingIds.has(match.imdbCode)) {
      stats.existingSkipped += 1;
      return null;
    }

    const files = await crawlFileTree(directory.url, MAX_TREE_DEPTH);
    stats.seriesFiles += files.length;
    const links = buildSeriesLinks(files, directory.url);
    if (!links.length) {
      addUnresolved("series", title, null, directory.url, "The matched folder contains no playable files.");
      return null;
    }
    return baseItem({
      imdbCode: match.imdbCode,
      title,
      year: null,
      type: "tvSeries",
      links,
      pageUrl: match.pageUrl,
      sourceDirectory: directory.url,
    });
  });

  const items = mergeItems([...movieResults, ...seriesResults].filter(Boolean));
  const payload = {
    sourceUrl: DOWNLOAD_BASE,
    sourceUrls: [MOVIE_ROOT, SERIES_ROOT, SITE_BASE],
    preservePrimarySource: true,
    scrapedAt: new Date().toISOString(),
    totalTitles: items.length,
    totalLinks: items.reduce((sum, item) => sum + item.links.length, 0),
    items,
  };
  const report = {
    checkedAt: payload.scrapedAt,
    catalogFile: CATALOG_FILE,
    outFile: OUT_FILE,
    movieYears: Array.from(MOVIE_YEARS),
    movieFiles: stats.movieFiles,
    movieGroups: movieGroups.length,
    seriesFolders: seriesDirectories.length,
    seriesFiles: stats.seriesFiles,
    directoryPages: stats.directoryPages,
    publicSearches: stats.publicSearches,
    publicPages: stats.publicPages,
    rateLimited: stats.rateLimited,
    cacheHits: stats.cacheHits,
    exactMatches: stats.matched,
    existingSkipped: stats.existingSkipped,
    addedCandidates: payload.totalTitles,
    addedLinks: payload.totalLinks,
    unresolvedCount: stats.unresolved.length,
    unresolved: stats.unresolved.slice(0, 500),
    warnings: Array.from(new Set(stats.warnings)),
  };

  await Promise.all([
    writeAtomic(OUT_FILE, JSON.stringify(payload)),
    writeAtomic(REPORT_FILE, JSON.stringify(report, null, 2)),
    writeAtomic(CACHE_FILE, JSON.stringify({ ...cache, version: 1, updatedAt: new Date().toISOString() }, null, 2)),
  ]);
  console.log(JSON.stringify({ ...report, unresolved: undefined }, null, 2));
}

async function discoverMovieFiles() {
  const rootEntries = await listDirectory(MOVIE_ROOT);
  if (!rootEntries) {
    stats.warnings.push(`Moviesho movie root is unavailable: ${MOVIE_ROOT}`);
    return [];
  }
  const years = rootEntries.filter((entry) => entry.isDirectory && MOVIE_YEARS.has(entry.name.replace(/\/$/, "")));
  const monthRoots = (await mapLimit(years, DIRECTORY_CONCURRENCY, async (yearEntry) => {
    const year = yearEntry.name.replace(/\/$/, "");
    const entries = await listDirectory(yearEntry.url);
    if (!entries) return [];
    return entries
      .filter((entry) => entry.isDirectory && /^(?:0[1-9]|1[0-2])$/.test(entry.name.replace(/\/$/, "")))
      .filter((entry) => {
        if (!MOVIE_MONTHS.size) return true;
        const month = entry.name.replace(/\/$/, "");
        return MOVIE_MONTHS.has(month) || MOVIE_MONTHS.has(`${year}/${month}`);
      })
      .map((entry) => entry.url);
  })).flat();
  const files = await mapLimit(monthRoots, DIRECTORY_CONCURRENCY, (url) => crawlFileTree(url, 2));
  return files.flat();
}

async function discoverSeriesDirectories() {
  const rootEntries = await listDirectory(SERIES_ROOT);
  if (!rootEntries) {
    stats.warnings.push(`Moviesho series root is unavailable: ${SERIES_ROOT}`);
    return [];
  }
  let directories = rootEntries.filter((entry) => entry.isDirectory);
  if (SERIES_NAMES.size) {
    directories = directories.filter((entry) => SERIES_NAMES.has(normalizeTitle(seriesTitleFromDirectory(entry.name))));
  }
  directories.sort((left, right) => left.name.localeCompare(right.name));
  return SERIES_LIMIT > 0 ? directories.slice(0, SERIES_LIMIT) : directories;
}

async function listDirectory(url) {
  if (directoryCache.has(url)) return directoryCache.get(url);
  const promise = (async () => {
    const html = await fetchText(url, "text/html,application/xhtml+xml");
    if (!html) return null;
    stats.directoryPages += 1;
    return parseDirectoryRows(html, url).filter((entry) => {
      try {
        const root = new URL(DOWNLOAD_BASE);
        const target = new URL(entry.url);
        return target.hostname === root.hostname && normalizeSourcePath(entry.url).startsWith(normalizeSourcePath(url));
      } catch {
        return false;
      }
    });
  })();
  directoryCache.set(url, promise);
  return promise;
}

async function crawlFileTree(rootUrl, maxDepth) {
  const seen = new Set();
  const rootPath = normalizeSourcePath(rootUrl);
  async function visit(url, depth) {
    const key = normalizeSourcePath(url);
    if (seen.has(key) || !key.startsWith(rootPath) || depth > maxDepth) return [];
    seen.add(key);
    const entries = await listDirectory(url);
    if (!entries) return [];
    const files = entries.filter((entry) => !entry.isDirectory);
    if (depth === maxDepth) return files;
    const children = entries.filter((entry) => entry.isDirectory && normalizeSourcePath(entry.url).startsWith(rootPath));
    const nested = await mapLimit(children, DIRECTORY_CONCURRENCY, (entry) => visit(entry.url, depth + 1));
    return [...files, ...nested.flat()];
  }
  return visit(rootUrl, 0);
}

function buildMovieGroups(files) {
  const groups = new Map();
  const subtitles = new Map();
  for (const entry of files) {
    if (!isVideoFile(entry.name) && !isSubtitleFile(entry.name)) continue;
    const identity = movieIdentityFromFile(entry.name);
    if (!identity.title || !identity.key.replace(/:unknown$/, "")) continue;
    if (isSubtitleFile(entry.name)) {
      const list = subtitles.get(identity.key) ?? [];
      list.push(entry);
      subtitles.set(identity.key, list);
      continue;
    }
    const group = groups.get(identity.key) ?? { ...identity, videos: [], subtitles: [] };
    group.videos.push(entry);
    groups.set(identity.key, group);
  }
  for (const group of groups.values()) group.subtitles = subtitles.get(group.key) ?? [];
  return Array.from(groups.values()).sort((left, right) => left.title.localeCompare(right.title) || (left.year ?? 0) - (right.year ?? 0));
}

function limitMovieGroups(groups) {
  let selected = groups;
  if (MOVIE_NAMES.size) selected = selected.filter((group) => MOVIE_NAMES.has(normalizeTitle(group.title)));
  return MOVIE_GROUP_LIMIT > 0 ? selected.slice(0, MOVIE_GROUP_LIMIT) : selected;
}

function movieItem(group, match) {
  const subtitles = group.subtitles.map(toSubtitleLink).sort(sortSubtitleLinks);
  const links = group.videos.map((entry) => {
    const quality = inferQuality(entry.name);
    const release = inferRelease(entry.name);
    const fileGroup = inferGroup(entry.name);
    return {
      label: buildSourceLabel({ season: null, episode: null, quality, release, group: fileGroup }),
      url: entry.url,
      size: entry.size,
      group: fileGroup,
      quality,
      release,
      season: null,
      episode: null,
      fileName: entry.name,
      sourceUrl: parentUrl(entry.url),
      modified: entry.modified,
      subtitleUrl: subtitles[0]?.url ?? null,
      subtitles,
    };
  });
  return baseItem({
    imdbCode: match.imdbCode,
    title: group.title,
    year: group.year,
    type: "movie",
    links,
    pageUrl: match.pageUrl,
    sourceDirectory: parentUrl(group.videos[0]?.url ?? MOVIE_ROOT),
  });
}

function buildSeriesLinks(files, sourceDirectory) {
  const subtitleMap = new Map();
  for (const entry of files.filter((candidate) => isSubtitleFile(candidate.name))) {
    const parsed = parseSeasonEpisode(entry.url);
    const key = episodeKey(parsed.season, parsed.episode);
    if (!key) continue;
    const list = subtitleMap.get(key) ?? [];
    list.push(toSubtitleLink(entry));
    subtitleMap.set(key, list);
  }

  const links = files
    .filter((entry) => isVideoFile(entry.name))
    .map((entry) => {
      const parsed = parseSeasonEpisode(entry.url);
      const quality = inferQuality(entry.name);
      const release = inferRelease(entry.name);
      const group = inferGroup(entry.name);
      const subtitles = (subtitleMap.get(episodeKey(parsed.season, parsed.episode)) ?? []).sort(sortSubtitleLinks);
      return {
        label: buildSourceLabel({ ...parsed, quality, release, group }),
        url: entry.url,
        size: entry.size,
        group,
        quality,
        release,
        season: parsed.season,
        episode: parsed.episode,
        fileName: entry.name,
        sourceUrl: parentUrl(entry.url) || sourceDirectory,
        modified: entry.modified,
        subtitleUrl: subtitles[0]?.url ?? null,
        subtitles,
      };
    });
  const hasNumberedEpisodes = links.some((link) => link.episode != null);
  return (hasNumberedEpisodes ? links.filter((link) => link.episode != null) : links).sort(sortVodLinks);
}

function toSubtitleLink(entry) {
  return {
    label: entry.name.replace(/\.[^.]+$/, "") || "Source subtitle",
    url: entry.url,
    language: subtitleLanguage(entry.name),
    format: entry.name.split(".").at(-1)?.toLowerCase() ?? "srt",
    size: entry.size,
    modified: entry.modified,
  };
}

function baseItem({ imdbCode, title, year, type, links, pageUrl, sourceDirectory }) {
  const uniqueLinks = deduplicateLinks(links).sort(sortVodLinks);
  return {
    id: imdbCode,
    title,
    imdbCode,
    imdbUrl: `https://www.imdb.com/title/${imdbCode}/`,
    type,
    year,
    imdbVotes: null,
    imdbRating: null,
    groups: Array.from(new Set(uniqueLinks.map((link) => link.group).filter(Boolean))).sort(),
    qualities: Array.from(new Set(uniqueLinks.map((link) => link.quality).filter(Boolean))).sort(sortQuality),
    links: uniqueLinks,
    source: "Moviesho",
    sourcePageUrl: pageUrl,
    movieshoSourceDirectories: [sourceDirectory].filter(Boolean),
  };
}

function mergeItems(rawItems) {
  const byId = new Map();
  for (const item of rawItems) {
    const previous = byId.get(item.imdbCode);
    if (!previous) {
      byId.set(item.imdbCode, item);
      continue;
    }
    const links = deduplicateLinks([...previous.links, ...item.links]).sort(sortVodLinks);
    byId.set(item.imdbCode, {
      ...previous,
      type: isSeriesType(previous.type) || isSeriesType(item.type) ? "tvSeries" : previous.type,
      links,
      groups: Array.from(new Set(links.map((link) => link.group).filter(Boolean))).sort(),
      qualities: Array.from(new Set(links.map((link) => link.quality).filter(Boolean))).sort(sortQuality),
      movieshoSourceDirectories: Array.from(new Set([...(previous.movieshoSourceDirectories ?? []), ...(item.movieshoSourceDirectories ?? [])])),
    });
  }
  return Array.from(byId.values()).sort((left, right) => left.title.localeCompare(right.title));
}

function isSeriesType(type) {
  const value = String(type ?? "").trim().toLowerCase();
  return !/movie|film|short|documentary|video/i.test(value)
    && /series|episode|show|tvmini|tvspecial|tvepisode/i.test(value);
}

function createMatcher(cache) {
  cache.entries ??= {};
  return async ({ kind, title, year, cacheKey, exactPaths, sourcePrefix, sourceUrl }) => {
    const cached = cache.entries[cacheKey];
    const age = cached?.checkedAt ? Date.now() - Date.parse(cached.checkedAt) : Number.POSITIVE_INFINITY;
    if (cached?.imdbCode && age < MATCH_TTL_MS) {
      stats.cacheHits += 1;
      stats.matched += 1;
      return cached;
    }
    if (cached?.unresolved && age < UNRESOLVED_TTL_MS) {
      stats.cacheHits += 1;
      return null;
    }

    const queries = Array.from(new Set([year ? `${title} ${year}` : title, title].map((value) => value.trim()).filter(Boolean)));
    const checkedPages = new Set();
    let transientFailure = false;
    let best = null;
    search: for (const query of queries) {
      const endpoint = new URL("wp-json/wp/v2/search", SITE_BASE);
      endpoint.searchParams.set("search", query);
      endpoint.searchParams.set("per_page", "20");
      stats.publicSearches += 1;
      const raw = await fetchText(endpoint.toString(), "application/json");
      if (!raw) {
        transientFailure = true;
        continue;
      }
      let results;
      try {
        results = JSON.parse(raw);
      } catch {
        stats.warnings.push(`Moviesho search returned invalid JSON for ${query}.`);
        continue;
      }
      if (!Array.isArray(results)) continue;
      const ranked = results
        .filter((result) => result?.url && allowedSubtype(kind, result.subtype) && !checkedPages.has(result.url))
        .sort((left, right) => candidateScore(right, title, year) - candidateScore(left, title, year))
        .slice(0, CANDIDATE_LIMIT);
      for (const candidate of ranked) {
        checkedPages.add(candidate.url);
        const html = await fetchText(candidate.url, "text/html,application/xhtml+xml");
        if (!html) {
          transientFailure = true;
          continue;
        }
        stats.publicPages += 1;
        const imdbIds = extractImdbIds(html);
        if (imdbIds.length !== 1) continue;
        const evidence = sourceEvidenceScore(html, { exactPaths, sourcePrefix });
        if (!evidence.accepted) continue;
        best = { imdbCode: imdbIds[0], pageUrl: candidate.url, evidence };
        break search;
      }
    }

    if (!best) {
      if (transientFailure) return null;
      cache.entries[cacheKey] = {
        unresolved: true,
        checkedAt: new Date().toISOString(),
        kind,
        title,
        year,
        sourceUrl,
        reason: "No exact source evidence",
      };
      return null;
    }

    const match = {
      imdbCode: best.imdbCode,
      pageUrl: best.pageUrl,
      checkedAt: new Date().toISOString(),
      kind,
      title,
      year,
      sourceUrl,
      evidence: { exactMatches: best.evidence.exactMatches, prefixMatches: best.evidence.prefixMatches },
    };
    cache.entries[cacheKey] = match;
    stats.matched += 1;
    return match;
  };
}

async function fetchText(url, accept) {
  let lastError;
  const isPublicSite = isMovieshoPublicUrl(url);
  const attempts = isPublicSite ? SITE_RETRIES : 2;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (isPublicSite) await pacePublicSite();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: { "user-agent": USER_AGENT, accept, "accept-language": "en,fa;q=0.8" },
      });
      if (response.status === 429) {
        stats.rateLimited += 1;
        const retryAfter = retryAfterMilliseconds(response.headers.get("retry-after"));
        const backoff = Math.max(retryAfter, Math.min(30_000, 1_500 * 2 ** (attempt - 1)));
        nextSiteRequestAt = Math.max(nextSiteRequestAt, Date.now() + backoff);
        throw new RetryableRequestError(`HTTP 429`, backoff);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const delay = error instanceof RetryableRequestError
          ? error.delay
          : Math.min(4_000, 300 * 2 ** (attempt - 1));
        await sleep(delay);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  stats.warnings.push(`${url}: ${lastError instanceof Error ? lastError.message : "request failed"}`);
  return null;
}

async function pacePublicSite() {
  const now = Date.now();
  const scheduledAt = Math.max(now, nextSiteRequestAt);
  nextSiteRequestAt = scheduledAt + SITE_REQUEST_INTERVAL_MS;
  if (scheduledAt > now) await sleep(scheduledAt - now);
}

function isMovieshoPublicUrl(value) {
  try {
    return new URL(value).hostname.toLowerCase() === new URL(SITE_BASE).hostname.toLowerCase();
  } catch {
    return false;
  }
}

function retryAfterMilliseconds(value) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

class RetryableRequestError extends Error {
  constructor(message, delay) {
    super(message);
    this.delay = delay;
  }
}

async function mapLimit(items, limit, worker) {
  if (!items.length) return [];
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function readCache() {
  try {
    const value = JSON.parse(await readFile(CACHE_FILE, "utf8"));
    return value?.version === 1 && value.entries ? value : { version: 1, entries: {} };
  } catch {
    return { version: 1, entries: {} };
  }
}

async function writeAtomic(file, content) {
  await mkdir(path.dirname(path.resolve(file)), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  await writeFile(temporary, content);
  try {
    await rename(temporary, file);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

function allowedSubtype(kind, subtype) {
  return kind === "series" ? /^(series|anime)$/i.test(subtype ?? "") : /^(post|anime)$/i.test(subtype ?? "");
}

function candidateScore(candidate, title, year) {
  const haystack = normalizeTitle(`${candidate.title ?? ""} ${candidate.url ?? ""}`);
  const tokens = normalizeTitle(title).split(" ").filter((token) => token.length > 1);
  const tokenScore = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 5 : 0), 0);
  return tokenScore + (year && haystack.includes(String(year)) ? 8 : 0);
}

function deduplicateLinks(links) {
  const byPath = new Map();
  for (const link of links) {
    const key = normalizeSourcePath(link.url);
    if (!key) continue;
    const previous = byPath.get(key);
    byPath.set(key, previous ? { ...previous, ...link, subtitles: link.subtitles?.length ? link.subtitles : previous.subtitles } : link);
  }
  return Array.from(byPath.values());
}

function sortVodLinks(left, right) {
  return (left.season ?? 0) - (right.season ?? 0)
    || (left.episode ?? 0) - (right.episode ?? 0)
    || sortQuality(left.quality, right.quality)
    || left.url.localeCompare(right.url);
}

function sortSubtitleLinks(left, right) {
  const rank = (value) => value === "fa" ? 3 : value === "en" ? 2 : 1;
  return rank(right.language) - rank(left.language) || left.url.localeCompare(right.url);
}

function episodeKey(season, episode) {
  return season != null && episode != null ? `${season}:${episode}` : "";
}

function parentUrl(value) {
  try {
    return new URL("./", value).toString();
  } catch {
    return null;
  }
}

function addUnresolved(kind, title, year, sourceUrl, reason) {
  stats.unresolved.push({ kind, title, year, sourceUrl, reason });
}

function splitEnv(value) {
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

function positiveNumber(value, fallback, minimum = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.floor(parsed)) : fallback;
}

function ensureSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
