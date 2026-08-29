import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  buildSourceLabel,
  decodeHtmlEntities,
  extractImdbIds,
  inferGroup,
  inferQuality,
  inferRelease,
  isSubtitleFile,
  isVideoFile,
  parseSeasonEpisode,
  plainText,
  subtitleLanguage,
} from "./moviesho-source-lib.mjs";
import { decodePlayerPayload, derivePersianTitle } from "./moviesho-archive-lib.mjs";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";

const ROOT = process.cwd();
const OUTPUT = resolvePath(process.env.CURATED_VOD_OUTPUT, ".media-cache/vod-sync/curated-vod-source.json");
const REPORT = resolvePath(process.env.CURATED_VOD_REPORT, ".media-cache/vod-sync/curated-vod-report.json");
const CACHE = resolvePath(process.env.CURATED_VOD_CACHE, ".media-cache/vod-sync/curated-vod-cache.json");
const CATALOG = resolvePath(process.env.CURATED_VOD_CATALOG, "public/data/vod-catalog.json");
const CONCURRENCY = numberEnv("CURATED_VOD_CONCURRENCY", 3, 1, 8);
const REQUEST_GAP_MS = numberEnv("CURATED_VOD_REQUEST_GAP_MS", 350, 0, 3_000);
const RETRIES = numberEnv("CURATED_VOD_RETRIES", 4, 1, 8);
const TIMEOUT_MS = numberEnv("CURATED_VOD_TIMEOUT_MS", 60_000, 5_000, 120_000);
const PAGE_LIMIT = numberEnv("CURATED_VOD_PAGE_LIMIT", 0, 0, 10_000);
const DETAIL_LIMIT = numberEnv("CURATED_VOD_DETAIL_LIMIT", 0, 0, 100_000);
const FORCE = process.env.CURATED_VOD_FORCE === "1";
const USER_AGENT = "SarvNemaCatalogBot/1.0 (+https://sarvnema.ir; metadata sync)";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// These are intentionally the source pages supplied for the catalog review. Categories are
// read through WordPress REST in batches of 100 so one refresh is fast and deterministic.
const ALL_SEEDS = [
  { id: "moviesho-lanterns", url: "https://www.moviesho.com/series/lanterns-tv-serial/", restPath: "wp/v2/series/37232", provider: "moviesho", type: "series", label: "Moviesho / Lanterns" },
  { id: "moviesho-turkey", url: "https://www.moviesho.com/category/turkey/", restPath: "wp/v2/categories/9627", provider: "moviesho", label: "Moviesho / Turkey" },
  { id: "moviesho-mini-series", url: "https://www.moviesho.com/genre-series/tv-mini-series/", restPath: "wp/v2/genre-series/2144", provider: "moviesho", type: "series", label: "Moviesho / Mini series" },
  { id: "moviesho-indian", url: "https://www.moviesho.com/category/indian/", restPath: "wp/v2/categories/936", provider: "moviesho", type: "movie", label: "Moviesho / Indian" },
  { id: "moviesho-series", url: "https://www.moviesho.com/series/", provider: "moviesho", type: "series", restCollection: "series", label: "Moviesho / Series" },
  { id: "moviesho-movies", url: "https://www.moviesho.com/category/movies/", restPath: "wp/v2/categories/1", provider: "moviesho", type: "movie", label: "Moviesho / Movies" },
  { id: "moviesho-korean", url: "https://www.moviesho.com/category/korean/", restPath: "wp/v2/categories/1306", provider: "moviesho", label: "Moviesho / Korean" },
  { id: "moviesho-war", url: "https://www.moviesho.com/genre-movies/war/", restPath: "wp/v2/genre-movies/1392", provider: "moviesho", type: "movie", label: "Moviesho / War" },
  { id: "zardfilm-animation", url: "https://zardfilm.in/animation/", restPath: "wp/v2/categories/48", restCollections: ["post"], provider: "zardfilm", label: "ZardFilm / Animation" },
  { id: "zardfilm-toy-story-5", url: "https://zardfilm.in/news/toy-story-5-2026/", restPath: "wp/v2/posts/76240", provider: "zardfilm", type: "movie", label: "ZardFilm / Toy Story 5" },
];
const REQUESTED_SEED_IDS = new Set(String(process.env.CURATED_VOD_SEED_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean));
const SEEDS = REQUESTED_SEED_IDS.size ? ALL_SEEDS.filter((seed) => REQUESTED_SEED_IDS.has(seed.id)) : ALL_SEEDS;

// The catalog itself stores source timestamps. Do not cache full WordPress responses or
// detail HTML here: a single full run can otherwise exceed Node's maximum string size.
const cache = { version: 2, updatedAt: null };
let nextRequestAt = 0;
let throttleQueue = Promise.resolve();

const stats = {
  requestedSeeds: SEEDS.length,
  collections: 0,
  restPages: 0,
  postsReceived: 0,
  postsWithFiles: 0,
  uniqueTitles: 0,
  links: 0,
  subtitles: 0,
  failures: [],
  sourceBreakdown: {},
  alreadyCurrent: 0,
};

const knownSources = FORCE ? new Map() : await loadKnownSources(CATALOG);
console.log(`[curated-vod] reviewing ${SEEDS.length} supplied source pages; ${knownSources.size} existing source pages indexed; concurrency=${CONCURRENCY}`);
const collections = await mapLimit(SEEDS, CONCURRENCY, discoverSeed);
const rawPosts = dedupePosts(collections.flatMap((value) => value?.posts ?? []));
const changedPosts = rawPosts.filter((post) => needsHydration(post, knownSources));
stats.alreadyCurrent = rawPosts.length - changedPosts.length;
const selectedPosts = DETAIL_LIMIT > 0 ? changedPosts.slice(0, DETAIL_LIMIT) : changedPosts;
console.log(`[curated-vod] resolving download links for ${selectedPosts.length} new/changed pages; ${stats.alreadyCurrent} already current; ${rawPosts.length} total`);
const items = mergeItems((await mapLimit(selectedPosts, CONCURRENCY, hydratePost)).filter(Boolean));
stats.uniqueTitles = items.length;
stats.links = items.reduce((sum, item) => sum + item.links.length, 0);
stats.subtitles = items.reduce((sum, item) => sum + item.links.reduce((total, link) => total + (link.subtitles?.length ?? 0), 0), 0);

const scrapedAt = new Date().toISOString();
const payload = {
  sourceUrl: "curated-vod-sources",
  sourceUrls: SEEDS.map((seed) => seed.url),
  preservePrimarySource: true,
  scrapedAt,
  updatedAt: scrapedAt,
  sourceMode: "wordpress-rest-curated-source-sync",
  totalTitles: items.length,
  totalLinks: stats.links,
  items,
};
const report = { checkedAt: scrapedAt, ...stats, itemsWithFiles: items.filter((item) => item.links.length).length };
cache.updatedAt = scrapedAt;
await Promise.all([writeJsonAtomic(OUTPUT, payload), writeJsonAtomic(REPORT, report), writeJsonAtomic(CACHE, cache)]);
console.log(JSON.stringify({ output: relative(OUTPUT), report: relative(REPORT), ...report, failures: report.failures.length }, null, 2));

async function discoverSeed(seed) {
  try {
    let html = null;
    const apiRoot = apiRootForSeed(seed);
    if (!apiRoot) throw new Error("WordPress REST root was not found");
    if (seed.restCollection) {
      const posts = await fetchCollection({ seed, apiRoot, collection: seed.restCollection });
      return { seed, posts };
    }
    if (seed.restPath) {
      const endpoint = new URL(seed.restPath, apiRoot);
      const route = endpoint.pathname.match(/\/wp-json\/wp\/v2\/([^/]+)\/(\d+)\/?$/i);
      if (!route) return { seed, posts: [decoratePost(await fetchJson(endpoint.toString()), seed)] };
      const [, restBase, sourceId] = route;
      if (!isTaxonomy(restBase)) return { seed, posts: [decoratePost(await fetchJson(endpoint.toString()), seed)] };
      const batches = await mapLimit(seed.restCollections ?? collectionsForTaxonomy(restBase, seed.type), CONCURRENCY, async (collection) => {
        try {
          return await fetchCollection({ seed, apiRoot, collection, taxonomy: restBase, sourceId });
        } catch (error) {
          stats.failures.push({ seed: seed.id, url: `${apiRoot}wp/v2/${collection}`, message: message(error) });
          return [];
        }
      });
      return { seed, posts: batches.flat() };
    }
    html = await fetchText(seed.url);
    const restUrl = restAlternateUrl(html, seed.url);
    if (!restUrl) throw new Error("WordPress REST endpoint was not found");
    const endpoint = new URL(restUrl);
    const route = endpoint.pathname.match(/\/wp-json\/wp\/v2\/([^/]+)\/(\d+)\/?$/i);
    if (!route) {
      const post = await fetchJson(endpoint.toString());
      return { seed, posts: [decoratePost(post, seed)] };
    }
    const [, restBase, sourceId] = route;
    if (isTaxonomy(restBase)) {
    const candidateCollections = collectionsForTaxonomy(restBase, seed.type);
    const batches = await mapLimit(candidateCollections, Math.min(CONCURRENCY, candidateCollections.length), async (collection) => {
      try {
        return await fetchCollection({ seed, apiRoot, collection, taxonomy: restBase, sourceId });
      } catch (error) {
        stats.failures.push({ seed: seed.id, url: `${apiRoot}wp/v2/${collection}`, message: message(error) });
        return [];
      }
    });
      return { seed, posts: batches.flat() };
    }
    const post = await fetchJson(endpoint.toString());
    return { seed, posts: [decoratePost(post, seed)] };
  } catch (error) {
    stats.failures.push({ seed: seed.id, url: seed.url, message: message(error) });
    console.warn(`[curated-vod] ${seed.id} failed: ${message(error)}`);
    return { seed, posts: [] };
  }
}

function collectionsForTaxonomy(taxonomy, hint) {
  if (/^genre-series$/i.test(taxonomy)) return ["series"];
  if (/^genre-movies$/i.test(taxonomy)) return ["post"];
  if (hint === "series") return ["series", "post"];
  if (hint === "movie") return ["post", "series"];
  return ["post", "series", "anime"];
}

function isTaxonomy(restBase) {
  return /^(?:categories|tags|genre-movies|genre-series|country|language)$/i.test(restBase);
}

async function fetchCollection({ seed, apiRoot, collection, taxonomy, sourceId }) {
  const root = new URL(apiRoot);
  const endpoint = new URL(`wp/v2/${collection === "post" ? "posts" : collection}`, root);
  endpoint.searchParams.set("per_page", "100");
  endpoint.searchParams.set("_embed", "1");
  if (taxonomy && sourceId) endpoint.searchParams.set(taxonomy, sourceId);
  const first = await fetchJsonWithHeaders(endpoint.toString());
  if (!first || !Array.isArray(first.value)) return [];
  const totalPages = Math.max(1, Number(first.headers.get("x-wp-totalpages") ?? "1"));
  const pageCount = PAGE_LIMIT > 0 ? Math.min(totalPages, PAGE_LIMIT) : totalPages;
  const pages = Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => index + 2);
  const values = [first.value];
  const rest = await mapLimit(pages, CONCURRENCY, async (page) => {
    const url = new URL(endpoint);
    url.searchParams.set("page", String(page));
    const response = await fetchJsonWithHeaders(url.toString());
    return Array.isArray(response?.value) ? response.value : [];
  });
  for (const page of rest) values.push(page);
  const posts = values.flat().map((post) => decoratePost(post, seed));
  stats.collections += 1;
  stats.restPages += pageCount;
  stats.postsReceived += posts.length;
  stats.sourceBreakdown[seed.id] = {
    provider: seed.provider,
    collection,
    totalPosts: Number(first.headers.get("x-wp-total") ?? posts.length),
    pagesRead: pageCount,
  };
  console.log(`[curated-vod] ${seed.id}: ${posts.length}/${Number(first.headers.get("x-wp-total") ?? posts.length)} ${collection} posts`);
  return posts;
}

function decoratePost(post, seed) {
  return { ...post, __seed: seed, __sourceType: seed.type ?? inferPostType(post) };
}

async function hydratePost(post) {
  const seed = post.__seed;
  if (!seed || !post?.id) return null;
  const pageUrl = post.link || seed.url;
  let detailHtml;
  try {
    detailHtml = await fetchText(pageUrl);
  } catch (error) {
    stats.failures.push({ seed: seed.id, url: pageUrl, message: message(error) });
    return null;
  }
  return mapPost({ ...post, __detailHtml: detailHtml });
}

function mapPost(post) {
  const seed = post.__seed;
  if (!seed || !post?.id) return null;
  const content = String(post.content?.rendered ?? "");
  const detailHtml = String(post.__detailHtml ?? content);
  const pageUrl = post.link || seed.url;
  const media = extractMedia(detailHtml, pageUrl, seed.provider);
  if (!media.links.length) return null;
  stats.postsWithFiles += 1;
  const terms = taxonomyTerms(post._embedded?.["wp:term"] ?? []);
  const titleText = plainText(post.title?.rendered ?? "");
  const year = extractYear(`${titleText} ${plainText(content).slice(0, 400)}`);
  const title = cleanTitle(titleText, year) || `Source title ${post.id}`;
  const imdbCode = extractImdbIds(detailHtml)[0] ?? extractImdbIds(content)[0] ?? extractImdbIds(JSON.stringify(post.yoast_head_json ?? {}))[0] ?? null;
  const id = imdbCode ?? `${seed.provider}-${post.type ?? "post"}-${post.id}`;
  const images = collectImages(post, pageUrl);
  const inferredType = post.__sourceType ?? inferPostType(post);
  const modified = post.modified_gmt ?? post.modified ?? post.date_gmt ?? post.date ?? null;
  const sourceLabel = seed.label;
  const links = media.links.map((link) => ({ ...link, sourceProvider: seed.provider, sourceUrl: pageUrl, modified: modified ?? null }));
  const type = links.some((link) => link.episode != null) ? "tvSeries" : inferredType;
  return {
    id,
    title,
    imdbCode: imdbCode ?? id,
    imdbUrl: imdbCode ? `https://www.imdb.com/title/${imdbCode}/` : null,
    type,
    year,
    imdbVotes: null,
    imdbRating: null,
    groups: unique(links.map((link) => link.group)),
    qualities: unique(links.map((link) => link.quality).filter(Boolean)),
    links,
    genres: unique([...(terms["genre-movies"] ?? []), ...(terms["genre-series"] ?? []), ...(terms.category ?? [])]),
    runtimeMinutes: null,
    originalTitle: title,
    overview: plainText(post.excerpt?.rendered ?? post.yoast_head_json?.og_description ?? "") || null,
    countries: terms.country ?? [],
    languages: terms.language ?? [],
    posterUrl: images[0]?.url ?? null,
    backdropUrl: images.find((image) => (image.width ?? 0) > (image.height ?? Infinity))?.url ?? images[0]?.url ?? null,
    source: sourceLabel,
    sourcePageUrl: pageUrl,
    persianTitle: derivePersianTitle(titleText, title, year) || null,
    persianOverview: plainText(post.excerpt?.rendered ?? post.yoast_head_json?.og_description ?? "") || null,
    persianDescription: plainText(content).slice(0, 3_000) || null,
    persianGenres: unique([...(terms["genre-movies"] ?? []), ...(terms["genre-series"] ?? []), ...(terms.category ?? [])]),
    persianCountries: terms.country ?? [],
    persianLanguages: terms.language ?? [],
    movieshoImages: seed.provider === "moviesho" ? images : [],
    curatedSourcePages: [pageUrl],
    sourceUpdatedAt: modified,
    catalogUpdatedAt: new Date().toISOString(),
  };
}

function extractMedia(html, pageUrl, provider) {
  const videoUrls = new Set();
  const subtitleUrls = new Set();
  const normalized = decodeHtmlEntities(String(html ?? "")).replace(/\\\//g, "/");
  const add = (value) => {
    const url = normalizeMediaUrl(value, pageUrl);
    if (!url) return;
    if (isVideoMediaUrl(url)) videoUrls.add(url);
    if (isSubtitleMediaUrl(url)) subtitleUrls.add(url);
  };
  for (const match of normalized.matchAll(/(?:href|src)=["']([^"']+)["']/gi)) {
    add(match[1]);
    const candidate = decodePlayerPayload(extractQueryValue(match[1], "player")) ?? decodePlayerPayload(extractQueryValue(match[1], "subtitle"));
    if (candidate) add(candidate);
  }
  for (const match of normalized.matchAll(/https?:[^"'<>\s]+\.(?:mkv|mp4|m4v|avi|webm|mov|wmv|ts|m3u8|srt|vtt|ass|ssa)(?:\?[^"'<>\s]*)?/gi)) add(match[0]);
  const subtitles = [...subtitleUrls].map((url) => toSubtitle(url)).sort(sortSubtitles);
  const links = [...videoUrls].map((url) => {
    const fileName = fileNameFromUrl(url);
    const parsed = parseSourceEpisode(url, fileName);
    const quality = inferQuality(fileName) ?? inferQuality(url);
    const release = inferRelease(fileName) ?? inferRelease(url);
    const group = inferGroup(fileName);
    return {
      label: buildSourceLabel({ ...parsed, quality, release, group }),
      url,
      size: null,
      group,
      quality,
      release,
      season: parsed.season,
      episode: parsed.episode,
      fileName,
      sourceUrl: pageUrl,
      modified: null,
      subtitleUrl: subtitles[0]?.url ?? null,
      subtitles,
      sourceProvider: provider,
      mediaKind: /\.m3u8(?:$|[?#])/i.test(url) ? "stream" : "video",
    };
  }).sort(sortLinks);
  return { links, subtitles };
}

function normalizeMediaUrl(value, base) {
  if (!value || /^(?:javascript:|data:|#)/i.test(String(value).trim())) return null;
  try {
    const url = new URL(String(value).replace(/&amp;/gi, "&"), base);
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function isVideoMediaUrl(value) {
  try {
    const url = new URL(value);
    const pathname = url.pathname;
    return isVideoFile(pathname)
      || /\.m3u8$/i.test(pathname)
      || (/\/download\//i.test(pathname) && /^(?:mp4|mkv|webm|m3u8)$/i.test(url.searchParams.get("format") ?? ""));
  } catch {
    return false;
  }
}

function isSubtitleMediaUrl(value) {
  try { return isSubtitleFile(new URL(value).pathname); } catch { return false; }
}

function extractQueryValue(value, key) {
  try {
    return new URL(decodeHtmlEntities(value), "https://placeholder.invalid/").searchParams.get(key);
  } catch {
    return null;
  }
}

function parseSourceEpisode(url, fileName) {
  const parsed = parseSeasonEpisode(fileName);
  try {
    const params = new URL(url).searchParams;
    const season = numberOrNull(params.get("season")) ?? parsed.season;
    const episode = numberOrNull(params.get("episode")) ?? parsed.episode;
    return { season, episode };
  } catch {
    return parsed;
  }
}

function toSubtitle(url) {
  const name = fileNameFromUrl(url);
  return { label: name.replace(/\.[^.]+$/, "") || "Source subtitle", url, language: subtitleLanguage(name), format: name.split(".").at(-1)?.toLowerCase() ?? "srt", size: null, modified: null };
}

function collectImages(post, pageUrl) {
  const images = [];
  const add = (value, width = null, height = null) => {
    const url = normalizeMediaUrl(value, pageUrl);
    if (url && /\.(?:jpe?g|png|webp|avif)(?:$|[?#])/i.test(url)) images.push({ url, width: numberOrNull(width), height: numberOrNull(height), caption: null });
  };
  const featured = post._embedded?.["wp:featuredmedia"]?.[0];
  add(featured?.source_url, featured?.media_details?.width, featured?.media_details?.height);
  for (const image of post.yoast_head_json?.og_image ?? []) add(image?.url, image?.width, image?.height);
  const seen = new Set();
  return images.filter((image) => !seen.has(image.url) && seen.add(image.url));
}

function taxonomyTerms(groups) {
  const output = {};
  for (const group of groups) for (const term of group ?? []) {
    const taxonomy = String(term?.taxonomy ?? "category");
    const name = plainText(term?.name);
    if (name) (output[taxonomy] ??= []).push(name);
  }
  for (const key of Object.keys(output)) output[key] = unique(output[key]);
  return output;
}

function inferPostType(post) {
  return /series|anime/i.test(`${post?.type ?? ""} ${post?.link ?? ""} ${post?.title?.rendered ?? ""}`) ? "tvSeries" : "movie";
}

function cleanTitle(value, year) {
  let result = plainText(value)
    .replace(/^(?:دانلود|تماشای آنلاین)\s+(?:(?:رایگان|کامل)\s+)?(?:فیلم|سریال|انیمیشن|انیمه|مستند)\s*/u, "")
    .replace(/\s+(?:با|زیرنویس|دوبله|رایگان|کامل)\b.*$/iu, "")
    .trim();
  const yearMatch = /\b(?:19|20)\d{2}\b/.exec(result);
  if (yearMatch && yearMatch.index > 0) result = result.slice(0, yearMatch.index).trim();
  if (year && result.endsWith(String(year))) result = result.slice(0, -String(year).length).trim();
  return result.replace(/[\-|:]+$/g, "").trim();
}

function extractYear(value) {
  const match = /\b((?:19|20)\d{2})\b/.exec(String(value ?? ""));
  return match ? Number(match[1]) : null;
}

function mergeItems(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = String(item.imdbCode || item.id).toLowerCase();
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, item);
      continue;
    }
    const links = dedupeLinks([...previous.links, ...item.links]);
    const pages = unique([...(previous.curatedSourcePages ?? []), ...(item.curatedSourcePages ?? [])]);
    byKey.set(key, {
      ...previous,
      type: /series|tv/i.test(`${previous.type} ${item.type}`) ? "tvSeries" : previous.type,
      links,
      groups: unique(links.map((link) => link.group)),
      qualities: unique(links.map((link) => link.quality).filter(Boolean)),
      genres: unique([...(previous.genres ?? []), ...(item.genres ?? [])]),
      countries: unique([...(previous.countries ?? []), ...(item.countries ?? [])]),
      languages: unique([...(previous.languages ?? []), ...(item.languages ?? [])]),
      posterUrl: previous.posterUrl ?? item.posterUrl ?? null,
      backdropUrl: previous.backdropUrl ?? item.backdropUrl ?? null,
      curatedSourcePages: pages,
      sourceUpdatedAt: newestDate(previous.sourceUpdatedAt, item.sourceUpdatedAt),
      catalogUpdatedAt: item.catalogUpdatedAt,
    });
  }
  return [...byKey.values()].sort((a, b) => String(b.sourceUpdatedAt ?? "").localeCompare(String(a.sourceUpdatedAt ?? "")));
}

function dedupePosts(posts) {
  const seen = new Set();
  return posts.filter((post) => {
    const key = `${post?.__seed?.provider ?? "source"}:${post?.type ?? "post"}:${post?.id ?? post?.link ?? ""}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function needsHydration(post, known) {
  const pageUrl = String(post?.link ?? "");
  const previous = known.get(pageUrl);
  if (!previous) return true;
  const modified = post?.modified_gmt ?? post?.modified ?? post?.date_gmt ?? post?.date ?? null;
  return !modified || previous.modified !== modified;
}

async function loadKnownSources(file) {
  const known = new Map();
  try {
    await streamVodArchiveItems(file, async (item) => {
      const modified = item.sourceUpdatedAt ?? item.movieshoModifiedAt ?? item.f2myModifiedAt ?? null;
      for (const page of unique([item.movieshoPageUrl, item.sourcePageUrl, ...(item.curatedSourcePages ?? [])])) {
        if (page) known.set(String(page), { modified });
      }
    });
  } catch (error) {
    console.warn(`[curated-vod] catalog source index unavailable: ${message(error)}`);
  }
  return known;
}

function dedupeLinks(links) {
  const map = new Map();
  for (const link of links) {
    const key = canonicalLinkKey(link.url);
    if (!key) continue;
    map.set(key, map.has(key) ? { ...map.get(key), ...link } : link);
  }
  return [...map.values()];
}

function canonicalLinkKey(value) {
  try {
    const url = new URL(value);
    const identityParams = ["season", "episode", "quality", "format", "part", "id"]
      .flatMap((name) => url.searchParams.has(name) ? [[name, url.searchParams.get(name)]] : [])
      .map(([name, value]) => `${name}=${value}`)
      .join("&");
    return `${url.hostname.toLowerCase()}${decodeURIComponent(url.pathname).toLowerCase()}${identityParams ? `?${identityParams}` : ""}`;
  } catch {
    return String(value ?? "").toLowerCase();
  }
}

function sortLinks(a, b) {
  return (a.season ?? 0) - (b.season ?? 0) || (a.episode ?? 0) - (b.episode ?? 0) || Number.parseInt(b.quality ?? "0", 10) - Number.parseInt(a.quality ?? "0", 10) || a.url.localeCompare(b.url);
}

function sortSubtitles(a, b) {
  const rank = (language) => language === "fa" ? 3 : language === "en" ? 2 : 1;
  return rank(b.language) - rank(a.language) || a.url.localeCompare(b.url);
}

function restAlternateUrl(html, base) {
  const match = /<link\b(?=[^>]*rel=["']alternate["'])(?=[^>]*type=["']application\/json["'])[^>]*href=["']([^"']+)/i.exec(html);
  return normalizeMediaUrl(match?.[1], base);
}

function apiRootForSeed(seed) {
  try { return new URL("/wp-json/", seed.url).toString(); } catch { return null; }
}

async function fetchJsonWithHeaders(url) {
  const response = await request(url, { Accept: "application/json" });
  if (response.status === 400 || response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const value = await response.json();
  return { value, headers: response.headers };
}

async function fetchJson(url) {
  const result = await fetchJsonWithHeaders(url);
  if (!result) throw new Error("REST endpoint was unavailable");
  return result.value;
}

async function fetchText(url) {
  const response = await request(url, { Accept: "text/html,application/xhtml+xml" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function request(url, extraHeaders) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      await throttle();
      const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "User-Agent": USER_AGENT, "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.7", ...extraHeaders } });
      if (response.status === 429 || response.status >= 500) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await sleep(500 * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

async function throttle() {
  // `mapLimit` hydrates detail pages concurrently. Queue request starts so
  // concurrent workers cannot race through the same throttle window and cause
  // a WordPress rate-limit burst (HTTP 429).
  const previous = throttleQueue;
  let release;
  throttleQueue = new Promise((resolve) => { release = resolve; });
  await previous;
  try {
    const wait = Math.max(0, nextRequestAt - Date.now());
    if (wait) await sleep(wait);
    nextRequestAt = Date.now() + REQUEST_GAP_MS;
  } finally {
    release();
  }
}

async function mapLimit(values, limit, worker) {
  if (!values.length) return [];
  const results = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await worker(values[index], index);
    }
  }));
  return results;
}

function unique(values) {
  return [...new Set(values.filter((value) => value != null && value !== ""))];
}

function newestDate(a, b) {
  return Date.parse(a ?? "") >= Date.parse(b ?? "") ? a ?? b ?? null : b ?? a ?? null;
}

function fileNameFromUrl(value) {
  try { return decodeURIComponent(new URL(value).pathname.split("/").at(-1) ?? "source-file"); } catch { return "source-file"; }
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function numberEnv(name, fallback, minimum, maximum) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, Math.floor(value))) : fallback;
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(value));
  await rename(temp, file);
}

function resolvePath(value, fallback) { return path.resolve(ROOT, value || fallback); }
function relative(value) { return path.relative(ROOT, value).split(path.sep).join("/"); }
function message(error) { return error instanceof Error ? error.message : String(error); }
