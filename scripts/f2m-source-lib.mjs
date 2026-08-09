import path from "node:path";
import {
  buildSourceLabel,
  decodeHtmlEntities,
  extractImdbIds,
  inferQuality,
  inferRelease,
  isSubtitleFile,
  isVideoFile,
  parseSeasonEpisode,
  plainText,
  subtitleLanguage,
} from "./moviesho-source-lib.mjs";

const SERIES_MARKER = /^series\d*$/i;
const EXTRA_MEDIA_FILE = /\.(?:m3u8|mpd|rar|zip|7z)(?:$|[?#])/i;
const PERSIAN = /[\u0600-\u06ff]/u;

export function parseF2mSeriesPage(html, post) {
  const normalizedHtml = decodeHtmlEntities(String(html ?? "").replace(/\\\//g, "/"));
  const identity = extractF2mSeriesIdentity(post);
  const urls = extractDirectUrls(normalizedHtml);
  const subtitles = urls.filter((url) => isSubtitleFile(url)).map((url) => ({
    label: subtitleLanguage(fileName(url)) === "fa" ? "Persian subtitle" : "Subtitle",
    url,
    language: subtitleLanguage(fileName(url)),
    format: path.extname(new URL(url).pathname).slice(1).toLowerCase() || "srt",
    size: null,
    modified: null,
  }));
  const links = urls
    .filter((url) => isVideoFile(url) || EXTRA_MEDIA_FILE.test(url))
    .map((url) => mapDirectLink(url, post?.link, subtitles))
    .filter(Boolean);
  const imdbCode = extractImdbIds(normalizedHtml)[0] ?? null;
  const year = extractReleaseYear(normalizedHtml);
  const imdbRating = extractRating(normalizedHtml);
  return {
    ...identity,
    imdbCode,
    year,
    imdbRating,
    links: dedupeLinks(links),
    sourceBases: discoverSourceBases(links),
  };
}

export function extractF2mSeriesIdentity(post) {
  const rendered = plainText(post?.title?.rendered ?? "");
  const slugTitle = readableSlug(post?.slug ?? "");
  const cleaned = rendered
    .replace(/^\s*دانلود\s+(?:فصل\s+\d+\s+)?(?:سریال|انیمه)\s+/u, "")
    .replace(/\s+(?:فصل\s+\d+\s+)?بدون\s+سانسور.*$/u, "")
    .trim();
  const latinParts = cleaned
    .split(/[\/|]/)
    .map((part) => part.replace(/^[^A-Za-z0-9]+/, "").trim())
    .filter((part) => /[A-Za-z]/.test(part));
  const title = pickClosestTitle(latinParts, slugTitle) || slugTitle || cleaned;
  const titleIndex = cleaned.toLocaleLowerCase("en-US").indexOf(title.toLocaleLowerCase("en-US"));
  const persianTitle = titleIndex > 0
    ? cleaned.slice(0, titleIndex).replace(/(?:فصل\s+\d+)$/u, "").trim()
    : null;
  return {
    title,
    persianTitle: persianTitle && PERSIAN.test(persianTitle) ? persianTitle : null,
    aliases: unique([slugTitle, ...latinParts]).filter((value) => value && normalizeTitle(value) !== normalizeTitle(title)),
  };
}

export function normalizeF2mDirectUrl(rawUrl) {
  let url;
  try {
    url = new URL(decodeHtmlEntities(String(rawUrl ?? "").trim()));
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;
  const segments = url.pathname.split("/").filter(Boolean);
  const markerIndex = segments.findIndex((segment) => SERIES_MARKER.test(segment));
  if (markerIndex < 0) return null;
  const marker = segments[markerIndex].toLowerCase();
  const basePath = `/${segments.slice(0, markerIndex).join("/")}${markerIndex ? "/" : ""}`;
  const baseUrl = `${url.protocol}//${url.host}${basePath}`;
  const sourceRelativePath = `${segments.slice(markerIndex).join("/")}${url.search}`;
  return {
    sourceBaseId: `f2m-${marker}`,
    sourceBaseUrl: ensureSlash(baseUrl),
    sourceRelativePath,
    sourceOriginalUrl: url.toString(),
  };
}

export function scoreImdbSuggestion(title, year, candidate) {
  if (!candidate || !/^tt\d+$/.test(candidate.id ?? "")) return -Infinity;
  if (!/tvSeries|tvMiniSeries|tvShort|tvSpecial/i.test(candidate.qid ?? "") && !/TV series|TV mini/i.test(candidate.q ?? "")) return -Infinity;
  const wanted = normalizeTitle(title);
  const actual = normalizeTitle(candidate.l);
  if (!wanted || !actual) return -Infinity;
  const exact = wanted === actual ? 100 : 0;
  const contains = wanted.includes(actual) || actual.includes(wanted) ? 24 : 0;
  const overlap = tokenOverlap(wanted, actual) * 50;
  const yearScore = year && candidate.y ? Math.max(-20, 12 - Math.abs(Number(candidate.y) - Number(year)) * 6) : 0;
  const rankScore = candidate.rank ? Math.max(0, 8 - Math.log10(candidate.rank + 1)) : 0;
  return exact + contains + overlap + yearScore + rankScore;
}

export function normalizeTitle(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDirectUrls(html) {
  const values = [];
  for (const match of html.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    const pieces = match[0].split(/\r?\n|&#13;|&#10;/i);
    for (const piece of pieces) {
      const cleaned = piece.replace(/[),;]+$/g, "").trim();
      if (looksLikeSourceFile(cleaned)) values.push(cleaned);
    }
  }
  return unique(values);
}

function looksLikeSourceFile(value) {
  try {
    const url = new URL(value);
    if (/^(?:www\.)?f2my\.top$/i.test(url.hostname) || /intocdn\.top$/i.test(url.hostname)) return false;
    return isVideoFile(url.toString()) || isSubtitleFile(url.toString()) || EXTRA_MEDIA_FILE.test(url.toString());
  } catch {
    return false;
  }
}

function mapDirectLink(url, sourcePageUrl, subtitles) {
  const normalized = normalizeF2mDirectUrl(url);
  if (!normalized) return null;
  const name = fileName(url);
  const { season, episode } = parseSeasonEpisode(name);
  const quality = inferQuality(name);
  const release = inferRelease(name);
  const group = inferF2mGroup(name);
  const matchingSubtitles = subtitles.filter((subtitle) => {
    const coordinates = parseSeasonEpisode(fileName(subtitle.url));
    return coordinates.season === season && coordinates.episode === episode;
  });
  return {
    label: buildSourceLabel({ season, episode, quality, release, group }),
    url,
    size: null,
    group,
    quality,
    release,
    season,
    episode,
    fileName: name,
    sourceUrl: sourcePageUrl ?? null,
    modified: null,
    subtitleUrl: matchingSubtitles[0]?.url ?? null,
    subtitles: matchingSubtitles,
    sourceProvider: "f2m",
    sourceBaseId: normalized.sourceBaseId,
    sourceRelativePath: normalized.sourceRelativePath,
    sourceOriginalUrl: normalized.sourceOriginalUrl,
    sourceBaseUrl: normalized.sourceBaseUrl,
  };
}

function discoverSourceBases(links) {
  const map = new Map();
  for (const link of links) {
    if (!link?.sourceBaseId || !link?.sourceBaseUrl) continue;
    map.set(link.sourceBaseId, {
      id: link.sourceBaseId,
      provider: "f2m",
      label: link.sourceBaseId.replace(/^f2m-/, "F2M ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      baseUrl: link.sourceBaseUrl,
    });
  }
  return [...map.values()];
}

function inferF2mGroup(value) {
  const text = String(value ?? "");
  if (/farsi[.\s_-]*(?:dub|dubbed)|persian[.\s_-]*(?:dub|dubbed)/i.test(text)) return "Dubbed";
  if (/farsi[.\s_-]*(?:sub|subbed)|persian[.\s_-]*(?:sub|subbed)|hard[.\s_-]*sub/i.test(text)) return "HardSub";
  if (/soft[.\s_-]*sub/i.test(text)) return "SoftSub";
  return "Files";
}

function extractReleaseYear(html) {
  const targeted = [
    /(?:سال\s+(?:ساخت|انتشار)|محصول)[\s\S]{0,180}?((?:19|20)\d{2})/iu,
    /icon-calendar[\s\S]{0,260}?((?:19|20)\d{2})/i,
  ];
  for (const pattern of targeted) {
    const match = pattern.exec(html);
    if (match) return Number(match[1]);
  }
  return null;
}

function extractRating(html) {
  const match = /icon-imdb[\s\S]{0,500}?<strong\b[^>]*>(\d(?:\.\d)?)<\/strong>/i.exec(html);
  return match ? Number(match[1]) : null;
}

function pickClosestTitle(values, slugTitle) {
  if (!values.length) return "";
  const target = normalizeTitle(slugTitle);
  return [...values].sort((left, right) => tokenOverlap(normalizeTitle(right), target) - tokenOverlap(normalizeTitle(left), target))[0];
}

function tokenOverlap(left, right) {
  const a = new Set(left.split(" ").filter(Boolean));
  const b = new Set(right.split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / Math.max(a.size, b.size);
}

function readableSlug(value) {
  return String(value ?? "")
    .replace(/-tv$/i, "")
    .replace(/-\d{4}$/i, "")
    .split("-")
    .filter(Boolean)
    .map((word) => /^(?:a|an|and|as|at|by|for|from|in|of|on|or|the|to|with)$/i.test(word)
      ? word.toLowerCase()
      : `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function fileName(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").at(-1) ?? "");
  } catch {
    return "source-file";
  }
}

function dedupeLinks(links) {
  const map = new Map();
  for (const link of links) {
    const key = `${link.sourceBaseId}:${String(link.sourceRelativePath).toLowerCase()}`;
    if (!map.has(key)) map.set(key, link);
  }
  return [...map.values()].sort((left, right) =>
    (left.season ?? 0) - (right.season ?? 0)
      || (left.episode ?? 0) - (right.episode ?? 0)
      || qualityRank(right.quality) - qualityRank(left.quality));
}

function qualityRank(value) {
  return Number(/\d{3,4}/.exec(String(value ?? ""))?.[0] ?? 0);
}

function ensureSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
