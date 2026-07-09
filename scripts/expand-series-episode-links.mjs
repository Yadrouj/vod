import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const IN_FILE = process.argv[2] || path.join("public", "data", "vod-catalog.json");
const OUT_FILE = process.argv[3] || IN_FILE;
const CACHE_FILE = process.env.VOD_SERIES_EXPAND_CACHE || path.join("data", "series-expansion-cache.json");
const LIMIT = Number(process.env.VOD_SERIES_EXPAND_LIMIT || 0);
const CONCURRENCY = Number(process.env.VOD_SERIES_EXPAND_CONCURRENCY || 18);
const FETCH_TIMEOUT_MS = Number(process.env.VOD_SERIES_FETCH_TIMEOUT_MS || 12000);
const MAX_DEPTH = Number(process.env.VOD_SERIES_MAX_DEPTH || 6);
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 VOD-Series-Expander";

const VIDEO_EXTENSIONS = /\.(mkv|mp4|m4v|avi|webm|mov|wmv|ts)(?:$|[?#])/i;
const ARCHIVE_EXTENSIONS = /\.(zip|rar|7z)(?:$|[?#])/i;
const DIRECTORY_HTML = /<title>\s*index of\s*<\/title>|Parent Directory/i;
const SEASON_SEGMENT_RE = /^s\d{1,2}$/i;

function decodeText(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;|\u00a0/g, " ");
}

function cleanHtml(value) {
  return decodeText(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function isSeries(item) {
  return /series|tv|episode/i.test(item.type ?? "");
}

function ensureSlash(url) {
  return /\/$/.test(url) ? url : `${url}/`;
}

function sortQuality(a, b) {
  return Number.parseInt(b, 10) - Number.parseInt(a, 10) || a.localeCompare(b);
}

function inferQuality(value) {
  const match = /\b(2160p|1080p|720p|480p|360p|4K)\b/i.exec(value);
  return match ? match[1].replace(/^4k$/i, "4K") : null;
}

function inferRelease(value) {
  const match = /\b(BluRay|WEB[-.]?DL|WEBRip|WEB|HDTV|HDRip|DVDRip|BRRip|Remux)\b/i.exec(value);
  return match ? match[1].replace(".", "-") : null;
}

function parseSeasonEpisode(value) {
  const decoded = decodeText(value);
  const pair = decoded.match(/S(?:eason)?[.\s_-]?(\d{1,2})[.\s_-]*E(?:pisode)?[.\s_-]?(\d{1,3})/i);
  if (pair) return { season: Number(pair[1]), episode: Number(pair[2]) };

  const pathSeason = decoded.match(/(?:\/|\\)S(\d{1,2})(?:\/|\\|$)/i);
  const labelSeason = decoded.match(/season[.\s_-]?(\d{1,2})/i);
  const season = pathSeason?.[1] ?? labelSeason?.[1] ?? null;
  const episode = decoded.match(/(?:episode|ep|E)[.\s_-]?(\d{1,3})/i)?.[1] ?? null;
  return {
    season: season ? Number(season) : null,
    episode: episode ? Number(episode) : null,
  };
}

function normalizePathSegment(segment) {
  return decodeURIComponent(segment).replace(/[._\s-]+/g, "").toLowerCase();
}

function isGroupSegment(segment) {
  const value = normalizePathSegment(segment);
  return (
    value.includes("softsub") ||
    value.includes("hardsub") ||
    value.includes("subbed") ||
    value.includes("dubbed") ||
    value === "dub" ||
    value === "nosub" ||
    value === "original"
  );
}

function groupNameFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const segment = parts.find(isGroupSegment);
    if (!segment) return "Files";
    const normalized = normalizePathSegment(segment);
    if (normalized.includes("dub")) return "Dubbed";
    if (normalized.includes("hardsub")) return "HardSub";
    if (normalized.includes("softsub")) return "SoftSub";
    if (normalized.includes("nosub")) return "NoSub";
    return decodeURIComponent(segment).replace(/[._-]+/g, " ");
  } catch {
    return "Files";
  }
}

function inferSeriesRoots(item) {
  const roots = new Set();

  for (const link of item.links ?? []) {
    try {
      const url = new URL(link.url);
      const parts = url.pathname.split("/").filter(Boolean);
      const groupIndex = parts.findIndex(isGroupSegment);
      const seasonIndex = parts.findIndex((part) => SEASON_SEGMENT_RE.test(part));
      const cutIndex = groupIndex >= 0 ? groupIndex : seasonIndex;

      if (cutIndex > 0) {
        const rootPath = `/${parts.slice(0, cutIndex).join("/")}/`;
        roots.add(`${url.origin}${rootPath}`);
      } else {
        roots.add(ensureSlash(link.url));
      }
    } catch {
      // Keep bad URLs out of the crawler.
    }
  }

  return Array.from(roots);
}

function isInsideRoot(url, rootUrl) {
  try {
    const current = new URL(url);
    const root = new URL(rootUrl);
    return current.origin === root.origin && current.pathname.startsWith(root.pathname);
  } catch {
    return false;
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function parseDirectoryRows(html, currentUrl, rootUrl) {
  const rows = Array.from(html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi));
  const directories = [];
  const files = [];

  for (const [, row] of rows) {
    const href = row.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
    if (!href || href === "../" || href.startsWith("?") || href.startsWith("#")) continue;

    let url;
    try {
      url = new URL(decodeText(href), ensureSlash(currentUrl)).toString();
    } catch {
      continue;
    }

    if (!isInsideRoot(url, rootUrl)) continue;

    const name = cleanHtml(row.match(/<code\b[^>]*>([\s\S]*?)<\/code>/i)?.[1] ?? href);
    const cells = Array.from(row.matchAll(/<td\b[^>]*class=["']([ms])["'][^>]*>\s*(?:<code\b[^>]*>)?([\s\S]*?)(?:<\/code>)?\s*<\/td>/gi));
    const modified = cleanHtml(cells.find((cell) => cell[1] === "m")?.[2] ?? "") || null;
    const size = cleanHtml(cells.find((cell) => cell[1] === "s")?.[2] ?? "") || null;
    const isDirectory = /\/$/.test(href) || (!VIDEO_EXTENSIONS.test(name) && !ARCHIVE_EXTENSIONS.test(name) && size === "-");

    if (isDirectory) {
      directories.push(ensureSlash(url));
      continue;
    }

    if (!VIDEO_EXTENSIONS.test(name) && !VIDEO_EXTENSIONS.test(url) && !ARCHIVE_EXTENSIONS.test(name)) continue;

    const parsed = parseSeasonEpisode(`${name} ${url}`);
    const quality = inferQuality(`${name} ${url}`);
    const release = inferRelease(`${name} ${url}`);
    const group = groupNameFromUrl(url);
    const episodePrefix =
      parsed.season && parsed.episode
        ? `S${String(parsed.season).padStart(2, "0")}E${String(parsed.episode).padStart(2, "0")}`
        : parsed.season
          ? `Season ${parsed.season}`
          : "File";

    files.push({
      label: [episodePrefix, quality, release, group].filter(Boolean).join(" / "),
      url,
      size: size && size !== "-" ? size : null,
      group,
      quality,
      release,
      season: parsed.season,
      episode: parsed.episode,
      fileName: name,
      sourceUrl: currentUrl,
      modified,
    });
  }

  return { directories, files };
}

async function crawlRoot(rootUrl) {
  const root = ensureSlash(rootUrl);
  const queue = [{ url: root, depth: 0 }];
  const seenDirectories = new Set();
  const filesByUrl = new Map();
  let requests = 0;

  while (queue.length) {
    const { url, depth } = queue.shift();
    if (seenDirectories.has(url) || depth > MAX_DEPTH) continue;
    seenDirectories.add(url);
    requests += 1;

    const html = await fetchText(url);
    if (!html || !DIRECTORY_HTML.test(html)) continue;

    const parsed = parseDirectoryRows(html, url, root);
    for (const file of parsed.files) filesByUrl.set(file.url, file);
    for (const directory of parsed.directories) {
      if (!seenDirectories.has(directory)) queue.push({ url: directory, depth: depth + 1 });
    }
  }

  return {
    rootUrl: root,
    requests,
    links: Array.from(filesByUrl.values()),
  };
}

function mergeExpandedLinks(existingLinks, expandedLinks) {
  const byUrl = new Map();
  for (const link of expandedLinks) byUrl.set(link.url, link);
  if (byUrl.size === 0) {
    for (const link of existingLinks ?? []) byUrl.set(link.url, link);
  }
  return Array.from(byUrl.values()).sort((a, b) => {
    const season = (a.season ?? 9999) - (b.season ?? 9999);
    if (season !== 0) return season;
    const episode = (a.episode ?? 9999) - (b.episode ?? 9999);
    if (episode !== 0) return episode;
    const quality = sortQuality(a.quality ?? "", b.quality ?? "");
    if (quality !== 0) return quality;
    return (a.group ?? "").localeCompare(b.group ?? "") || a.url.localeCompare(b.url);
  });
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function readCache() {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf8"));
  } catch {
    return { roots: {}, items: {} };
  }
}

async function writeCache(cache) {
  await mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await writeFile(CACHE_FILE, `${JSON.stringify(cache)}\n`);
}

async function main() {
  const archive = JSON.parse(await readFile(IN_FILE, "utf8"));
  const cache = await readCache();
  const seriesItems = archive.items.filter(isSeries).slice(0, LIMIT || undefined);
  let processed = 0;
  let expandedItems = 0;
  let expandedLinks = 0;
  let totalRequests = 0;

  const byKey = new Map(archive.items.map((item) => [item.imdbCode || item.id, item]));

  await mapLimit(seriesItems, CONCURRENCY, async (item) => {
    const key = item.imdbCode || item.id;
    const roots = inferSeriesRoots(item);
    const rootResults = [];

    for (const root of roots) {
      if (!cache.roots[root]) {
        cache.roots[root] = await crawlRoot(root);
      }
      rootResults.push(cache.roots[root]);
    }

    const links = mergeExpandedLinks(
      item.links ?? [],
      rootResults.flatMap((result) => result.links ?? [])
    );
    const hasEpisodeFiles = links.some((link) => link.episode || VIDEO_EXTENSIONS.test(link.url));
    const nextItem = {
      ...item,
      links,
      groups: Array.from(new Set(links.map((link) => link.group).filter(Boolean))).sort(),
      qualities: Array.from(new Set(links.map((link) => link.quality).filter(Boolean))).sort(sortQuality),
      seriesLinksExpandedAt: new Date().toISOString(),
      seriesLinksExpanded: hasEpisodeFiles,
    };

    byKey.set(key, nextItem);
    processed += 1;
    if (hasEpisodeFiles) expandedItems += 1;
    expandedLinks += links.length;
    totalRequests += rootResults.reduce((sum, result) => sum + (result.requests ?? 0), 0);

    if (processed % 25 === 0 || processed === seriesItems.length) {
      await writeCache(cache);
      console.log(
        JSON.stringify({
          processed,
          total: seriesItems.length,
          expandedItems,
          expandedLinks,
          totalRequests,
          current: item.title,
        })
      );
    }
  });

  const items = archive.items.map((item) => byKey.get(item.imdbCode || item.id) ?? item);
  const payload = {
    ...archive,
    seriesLinksRescrapedAt: new Date().toISOString(),
    seriesLinksExpandedTitles: expandedItems,
    totalTitles: items.length,
    totalLinks: items.reduce((sum, item) => sum + (item.links?.length ?? 0), 0),
    items,
  };

  await writeCache(cache);
  await writeFile(OUT_FILE, JSON.stringify(payload));
  console.log(
    JSON.stringify(
      {
        outFile: OUT_FILE,
        processed,
        expandedItems,
        totalTitles: payload.totalTitles,
        totalLinks: payload.totalLinks,
        totalRequests,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
