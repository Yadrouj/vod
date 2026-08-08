const VIDEO_EXTENSION = /\.(mkv|mp4|m4v|avi|webm|mov|wmv|ts)(?:$|[?#])/i;
const SUBTITLE_EXTENSION = /\.(srt|vtt|ass|ssa)(?:$|[?#])/i;
const QUALITY_TOKEN = /(?:^|[.\s_-])(2160p|1440p|1080p|720p|576p|480p|360p|4k)(?=$|[.\s_-])/i;

export function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;|\u00a0/gi, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)));
}

export function plainText(value) {
  return decodeHtmlEntities(String(value ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function parseDirectoryRows(html, baseUrl) {
  const entries = [];
  for (const rowMatch of String(html ?? "").matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = rowMatch[1];
    const anchor = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(row);
    if (!anchor) continue;
    const href = decodeHtmlEntities(anchor[1]).trim();
    if (!href || href === "../" || href.startsWith("?") || href.startsWith("#")) continue;

    let url;
    try {
      url = new URL(href, ensureSlash(baseUrl));
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol)) continue;

    const pathParts = url.pathname.split("/").filter(Boolean);
    const pathName = safeDecode(pathParts.at(-1) ?? "");
    const visibleName = plainText(anchor[2]);
    const name = pathName || visibleName;
    if (!name) continue;

    const size = plainText(/<td\b[^>]*class=["'][^"']*size[^"']*["'][^>]*>([\s\S]*?)<\/td>/i.exec(row)?.[1] ?? "") || null;
    const modified = plainText(/<td\b[^>]*class=["'][^"']*(?:date|modified)[^"']*["'][^>]*>([\s\S]*?)<\/td>/i.exec(row)?.[1] ?? "") || null;
    entries.push({
      name,
      url: url.toString(),
      isDirectory: href.endsWith("/") || url.pathname.endsWith("/"),
      size: size === "-" ? null : size,
      modified,
    });
  }
  return entries;
}

export function isVideoFile(value) {
  return VIDEO_EXTENSION.test(String(value ?? ""));
}

export function isSubtitleFile(value) {
  return SUBTITLE_EXTENSION.test(String(value ?? ""));
}

export function movieIdentityFromFile(fileName) {
  const decoded = safeDecode(String(fileName ?? "").split(/[?#]/)[0]);
  let stem = decoded.replace(/\.(mkv|mp4|m4v|avi|webm|mov|wmv|ts|srt|vtt|ass|ssa)$/i, "");
  const quality = QUALITY_TOKEN.exec(stem);
  if (quality) stem = stem.slice(0, quality.index);
  stem = stem
    .replace(/[.\s_-]+(?:farsi|persian|english|subbed|subtitle|softsub|hardsub|dubbed)(?:[.\s_-].*)?$/i, "")
    .replace(/[.\s_-]+$/, "");

  const years = Array.from(stem.matchAll(/(?:^|[.\s_-])((?:19|20)\d{2})(?=$|[.\s_-])/g));
  const yearMatch = years.at(-1);
  const year = yearMatch ? Number(yearMatch[1]) : null;
  const titleStem = yearMatch ? stem.slice(0, yearMatch.index).replace(/[.\s_-]+$/, "") : stem;
  const title = readableTitle(titleStem);
  return {
    title,
    year,
    key: `${normalizeTitle(title)}:${year ?? "unknown"}`,
  };
}

export function seriesTitleFromDirectory(name) {
  return readableTitle(safeDecode(String(name ?? "")).replace(/\/$/, ""));
}

export function parseSeasonEpisode(value) {
  const decoded = safeDecode(String(value ?? ""));
  const pair = /S(?:eason)?[.\s_-]?(\d{1,2})[.\s_-]*E(?:pisode)?[.\s_-]?(\d{1,3})/i.exec(decoded);
  if (pair) return { season: Number(pair[1]), episode: Number(pair[2]) };

  const alternate = /(?:^|[.\s_/-])(\d{1,2})x(\d{1,3})(?=$|[.\s_/-])/i.exec(decoded);
  if (alternate) return { season: Number(alternate[1]), episode: Number(alternate[2]) };

  const seasonMatch = /(?:^|[\\/])S(?:eason)?[.\s_-]?(\d{1,2})(?=$|[\\/])/i.exec(decoded)
    ?? /(?:^|[.\s_-])Season[.\s_-]?(\d{1,2})(?=$|[.\s_/-])/i.exec(decoded);
  const season = seasonMatch ? Number(seasonMatch[1]) : null;
  const fileName = decoded.split(/[\\/]/).at(-1)?.split(/[?#]/)[0] ?? "";
  const episodeMatch = /(?:^|[.\s_-])(?:E|Ep|Episode)[.\s_-]?(\d{1,3})(?=$|[.\s_-])/i.exec(fileName);
  const numericEpisode = /^(\d{1,3})(?:[.\s_-]|$)/.exec(fileName);
  const episode = episodeMatch ? Number(episodeMatch[1]) : numericEpisode ? Number(numericEpisode[1]) : null;
  return {
    season: season ?? (episode != null ? 1 : null),
    episode,
  };
}

export function inferQuality(value) {
  const match = QUALITY_TOKEN.exec(String(value ?? ""));
  return match ? match[1].replace(/^4k$/i, "4K") : null;
}

export function inferRelease(value) {
  const match = /\b(BluRay|WEB[-.]?DL|WEBRip|WEB|HDTV|HDRip|DVDRip|BRRip|Remux)\b/i.exec(String(value ?? ""));
  return match ? match[1].replace(".", "-") : null;
}

export function inferGroup(value) {
  const text = String(value ?? "");
  if (/farsi[.\s_-]*dubbed|persian[.\s_-]*dubbed|dubbed|dub(?:[.\s_/-]|$)/i.test(text)) return "Dubbed";
  if (/farsi[.\s_-]*subbed|persian[.\s_-]*subbed|hard[.\s_-]*sub|hardsub/i.test(text)) return "HardSub";
  if (/soft[.\s_-]*sub|softsub/i.test(text)) return "SoftSub";
  if (/no[.\s_-]*sub|nosub/i.test(text)) return "NoSub";
  return "Files";
}

export function subtitleLanguage(value) {
  const text = String(value ?? "");
  if (/farsi|persian|(?:^|[._-])fa(?:[._-]|$)/i.test(text)) return "fa";
  if (/english|(?:^|[._-])en(?:[._-]|$)/i.test(text)) return "en";
  return "und";
}

export function buildSourceLabel({ season, episode, quality, release, group }) {
  return [
    season != null && episode != null
      ? `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`
      : null,
    quality,
    release,
    group && group !== "Files" ? group : null,
  ].filter(Boolean).join(" / ") || "Source file";
}

export function extractImdbIds(html) {
  const ids = new Set();
  for (const anchor of String(html ?? "").matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = decodeHtmlEntities(anchor[1]).replace(/\\\//g, "/");
    const id = /(?:^|\.)imdb\.com\/title\/(tt\d{5,12})/i.exec(href)?.[1];
    if (id) ids.add(id.toLowerCase());
  }
  return Array.from(ids);
}

export function extractMovieshoSourcePaths(html) {
  const paths = new Set();
  const normalizedHtml = String(html ?? "").replace(/\\\//g, "/");
  for (const anchor of normalizedHtml.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = decodeHtmlEntities(anchor[1]);
    try {
      const url = new URL(href);
      if (url.hostname.toLowerCase() !== "sr1.moviesho.com") continue;
      paths.add(normalizeSourcePath(url.toString()));
    } catch {
      // Ignore malformed and unrelated page links.
    }
  }
  return paths;
}

export function sourceEvidenceScore(html, { exactPaths = [], sourcePrefix = "" } = {}) {
  const pagePaths = extractMovieshoSourcePaths(html);
  const expected = new Set(exactPaths.map(normalizeSourcePath).filter(Boolean));
  let exactMatches = 0;
  for (const path of expected) {
    if (pagePaths.has(path)) exactMatches += 1;
  }
  const normalizedPrefix = normalizeSourcePath(sourcePrefix);
  const prefixMatches = normalizedPrefix
    ? Array.from(pagePaths).filter((path) => path.startsWith(normalizedPrefix)).length
    : 0;
  return {
    accepted: exactMatches > 0 || prefixMatches > 0,
    exactMatches,
    prefixMatches,
    score: exactMatches * 100 + prefixMatches * 10,
    pagePaths: pagePaths.size,
  };
}

export function normalizeSourcePath(value) {
  if (!value) return "";
  try {
    const url = new URL(value, "https://sr1.moviesho.com/");
    return safeDecode(url.pathname).replace(/\/{2,}/g, "/").toLowerCase();
  } catch {
    return safeDecode(String(value)).split(/[?#]/)[0].replace(/\/{2,}/g, "/").toLowerCase();
  }
}

export function normalizeTitle(value) {
  return readableTitle(value)
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function readableTitle(value) {
  return safeDecode(String(value ?? ""))
    .replace(/[._]+/g, " ")
    .replace(/\s*-\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sortQuality(left, right) {
  const rank = (value) => Number(/(\d{3,4})p/i.exec(String(value ?? ""))?.[1] ?? (/4k/i.test(String(value ?? "")) ? 2160 : 0));
  return rank(right) - rank(left) || String(left).localeCompare(String(right));
}

export function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function ensureSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
