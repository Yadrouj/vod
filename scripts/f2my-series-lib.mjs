import { createHash } from "node:crypto";
import {
  buildSourceLabel,
  decodeHtmlEntities,
  extractImdbIds,
  inferQuality,
  inferRelease,
  parseSeasonEpisode,
  plainText,
  subtitleLanguage,
} from "./moviesho-source-lib.mjs";

const MEDIA_EXTENSION = /\.(mkv|mp4|m4v|avi|webm|mov|wmv|flv|ts|m2ts|m3u8|mpd)(?:$|[?#])/i;
const SUBTITLE_EXTENSION = /\.(srt|vtt|ass|ssa|sub)(?:$|[?#])/i;
const ARCHIVE_EXTENSION = /\.(zip|rar|7z|torrent)(?:$|[?#])/i;
const IMAGE_EXTENSION = /\.(?:jpe?g|png|gif|webp|avif|svg|ico)(?:$|[?#])/i;
const MEDIA_ANCHOR = /^(?:series|serial|film|film24|movie)(?:_\d+)?$/i;
const ROTATING_BASE_SEGMENT = /^[a-z0-9]{2,16}$/i;

export function parseF2mySeriesPage(html, post = {}) {
  return parseF2myDetailPage(html, { ...post, type: "series" });
}

export function parseF2myDetailPage(html, post = {}) {
  const pageUrl = absoluteUrl(post.link || extractCanonical(html) || "https://www.f2my.top/");
  const type = post.type || (/\/series\//i.test(new URL(pageUrl).pathname) ? "series" : "movie");
  const imdbCode = extractImdbIds(html)[0] || extractImdbFromText(html) || null;
  const directUrls = extractF2myDownloadUrls(html, pageUrl);
  const links = [];
  const extraLinks = [];
  const subtitles = [];
  const baseEntries = new Map();

  for (const url of directUrls) {
    const mediaKind = classifyLink(url);
    if (!mediaKind) continue;
    const fileName = fileNameFromUrl(url);
    const { season, episode } = parseSeasonEpisode(decodeURIComponentSafe(url));
    const quality = inferQuality(url);
    const release = inferRelease(url);
    const group = inferF2myGroup(url);
    const source = splitF2myBase(url);

    if (source) {
      const existing = baseEntries.get(source.id);
      baseEntries.set(source.id, {
        ...source,
        sampleRelativePath: existing?.sampleRelativePath || source.relativePath,
        linkCount: (existing?.linkCount || 0) + 1,
      });
    }

    const common = {
      label: buildSourceLabel({ season, episode, quality, release, group }),
      url,
      size: null,
      group,
      quality,
      release,
      season,
      episode,
      fileName,
      sourceUrl: pageUrl,
      modified: post.modified_gmt || post.modified || null,
      sourceProvider: "f2my",
      sourceBaseId: source?.id || null,
      sourceRelativePath: source?.relativePath || null,
      sourceOriginalUrl: url,
      mediaKind,
    };

    if (mediaKind === "subtitle") {
      subtitles.push({
        ...common,
        language: subtitleLanguage(fileName),
        format: extensionFromUrl(url) || "srt",
      });
    } else if (mediaKind === "trailer") {
      extraLinks.push(common);
    } else {
      links.push(common);
    }
  }

  for (const link of links) {
    const matches = subtitles.filter((subtitle) =>
      (subtitle.season == null || link.season == null || subtitle.season === link.season) &&
      (subtitle.episode == null || link.episode == null || subtitle.episode === link.episode),
    );
    if (matches.length) {
      link.subtitles = matches.map((subtitle) => ({
        label: subtitle.fileName || subtitle.label,
        url: subtitle.url,
        language: subtitle.language,
        format: subtitle.format,
        size: null,
        modified: subtitle.modified,
        sourceProvider: subtitle.sourceProvider,
        sourceBaseId: subtitle.sourceBaseId,
        sourceRelativePath: subtitle.sourceRelativePath,
        sourceOriginalUrl: subtitle.sourceOriginalUrl,
      }));
      link.subtitleUrl = matches[0].url;
    }
  }

  extraLinks.push(...subtitles);
  const title = englishTitle(post, html);
  const persianTitle = extractPersianTitle(post?.title?.rendered || extractDocumentTitle(html));
  const posterUrl = extractPoster(html, post);
  const classList = Array.isArray(post.class_list) ? post.class_list : [];
  const genres = unique([...taxonomyValues(classList, "genres-"), ...extractTaxonomyLinks(html, "genres")]);
  const languages = unique([...taxonomyValues(classList, "language-"), ...extractTaxonomyLinks(html, "language")]);
  const countries = extractTaxonomyLinks(html, "madeby");
  const id = imdbCode || `f2my-${post.id || slugify(post.slug || title || hashValue(pageUrl).slice(0, 12))}`;

  return {
    item: {
      id,
      title: title || persianTitle || `F2MY series ${post.id || ""}`.trim(),
      imdbCode: imdbCode || id,
      imdbUrl: imdbCode ? `https://www.imdb.com/title/${imdbCode}/` : null,
      type,
      year: post.year || extractYear(html),
      imdbVotes: null,
      imdbRating: extractRating(html),
      groups: unique(links.map((link) => link.group).filter(Boolean)),
      qualities: unique(links.map((link) => link.quality).filter(Boolean)).sort(sortQuality),
      links: dedupeLinks(links),
      genres,
      languages,
      countries,
      posterUrl,
      source: "f2my",
      sourcePageUrl: pageUrl,
      overview: plainText(post?.excerpt?.rendered || extractOverview(html)) || null,
      persianTitle: persianTitle || null,
      persianOverview: plainText(post?.excerpt?.rendered || extractOverview(html)) || null,
      f2myPageUrl: pageUrl,
      f2myPostId: Number(post.id) || null,
      f2myModifiedAt: post.modified_gmt || post.modified || null,
      f2myExtraLinks: dedupeLinks(extraLinks),
    },
    bases: Array.from(baseEntries.values()),
  };
}

export function parseF2myArchivePage(html, type, pageUrl = `https://www.f2my.top/${type === "series" ? "series" : "movies"}/`) {
  const entries = [];
  const seen = new Set();
  for (const articleMatch of String(html || "").matchAll(/<article\b[^>]*class=["'][^"']*\bentry\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi)) {
    const article = articleMatch[1];
    const anchor = /<a\b[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*stretched-link[^"']*["'][^>]*[\s\S]*?<h2\b[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i.exec(article)
      || /<a\b[^>]*href=["']([^"']+)["'][^>]*title=["']([^"']+)["'][^>]*rel=["']bookmark["']/i.exec(article);
    if (!anchor) continue;
    let link;
    try {
      link = new URL(decodeHtmlEntities(anchor[1]), pageUrl).toString();
    } catch {
      continue;
    }
    if (seen.has(link)) continue;
    seen.add(link);
    const poster = /<img\b[^>]*(?:src|data-src)=["']([^"']+)/i.exec(article)?.[1] || null;
    const cardTitle = plainText(anchor[2]);
    const postId = type === "movie" ? Number(new URL(link).pathname.split("/").filter(Boolean)[0]) || null : null;
    entries.push({
      id: postId,
      type,
      link,
      slug: new URL(link).pathname.split("/").filter(Boolean).at(-1) || "",
      cardTitle,
      title: { rendered: /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i.exec(article)?.[1] || cardTitle },
      posterUrl: poster ? absoluteUrl(poster) : null,
      year: extractCardYear(article, cardTitle),
      imdbRating: extractRating(article),
      archivePage: pageUrl,
    });
  }
  return entries;
}

export function extractF2myArchivePageCount(html, type) {
  const base = type === "series" ? "series" : "movies";
  const pages = Array.from(String(html || "").matchAll(new RegExp(`/${base}/page/(\\d+)/`, "gi")), (match) => Number(match[1]));
  return Math.max(1, ...pages.filter(Number.isFinite));
}

export function extractF2myDownloadUrls(html, pageUrl = "https://www.f2my.top/") {
  const source = decodeHtmlEntities(String(html ?? "")).replace(/\\\//g, "/");
  const candidates = new Set();
  const patterns = [
    /(?:href|src|data-url|data-link)\s*=\s*["']([^"']+)["']/gi,
    /handleDownloadClick\(\s*["']([^"']+)["']/gi,
    /https?:\/\/[^\s"'<>\\]+/gi,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const raw = decodeHtmlEntities(match[1] || match[0]).replace(/[),;]+$/, "").trim();
      const decoded = decodeURIComponentSafe(raw);
      if ((decoded.match(/(?:https?|ftp):\/\//gi) || []).length > 1) continue;
      let url;
      try {
        url = new URL(raw, pageUrl);
      } catch {
        continue;
      }
      url.hash = "";
      if (!/^https?:$/.test(url.protocol)) continue;
      if (!isUsableF2myUrl(url)) continue;
      if (url.hostname === "www.f2my.top" && /[?&]playit=/.test(url.search)) continue;
      if (classifyLink(url.toString())) candidates.add(url.toString());
    }
  }

  return Array.from(candidates);
}

export function splitF2myBase(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (!isUsableF2myUrl(url)) return null;
    const segments = url.pathname.split("/").filter(Boolean);
    const firstMediaAnchor = segments.findIndex((segment) => MEDIA_ANCHOR.test(segment));
    const baseSegments = firstMediaAnchor > 0 && ROTATING_BASE_SEGMENT.test(segments[0])
      ? [segments[0]]
      : [];
    const relativeSegments = segments.slice(baseSegments.length);
    const baseUrl = `${url.origin}/${baseSegments.length ? `${baseSegments.join("/")}/` : ""}`;
    const relativePath = `${relativeSegments.join("/")}${url.search}`;
    if (!relativePath) return null;
    return {
      id: f2myBaseId(baseUrl),
      baseUrl,
      relativePath,
      host: url.host,
    };
  } catch {
    return null;
  }
}

function isUsableF2myUrl(url) {
  const hostname = String(url.hostname || "").toLowerCase();
  if (!hostname || hostname.startsWith(".") || hostname.endsWith(".") || hostname.includes("..")) return false;
  return true;
}

export function f2myBaseId(baseUrl) {
  return `f2my-${hashValue(normalizeBaseUrl(baseUrl)).slice(0, 12)}`;
}

export function normalizeBaseUrl(value) {
  const url = new URL(String(value || "").trim());
  if (!/^https?:$/.test(url.protocol)) throw new Error("F2MY base URL must use HTTP or HTTPS.");
  url.pathname = url.pathname.replace(/\/+$/, "") + "/";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function f2myLinkIdentity(link) {
  return [
    link.mediaKind || "video",
    link.season ?? "-",
    link.episode ?? "-",
    String(link.quality || "").toLowerCase(),
    String(link.group || "").toLowerCase(),
    String(link.fileName || "").toLowerCase(),
  ].join("|");
}

function classifyLink(value) {
  if (IMAGE_EXTENSION.test(value)) return null;
  if (SUBTITLE_EXTENSION.test(value)) return "subtitle";
  if (ARCHIVE_EXTENSION.test(value)) return "archive";
  if (!MEDIA_EXTENSION.test(value)) return null;
  const decoded = decodeURIComponentSafe(value);
  return /(?:^|[._/\s-])trailer(?:[._/\s-]|$)|[._-]t\.(?:mp4|m4v|webm|mov)(?:$|[?#])/i.test(decoded) ? "trailer" : "video";
}

function inferF2myGroup(value) {
  const text = decodeURIComponentSafe(value);
  if (/farsi[._\s-]*dubbed|persian[._\s-]*dubbed|dubbed/i.test(text)) return "Dubbed";
  if (/farsi[._\s-]*sub|persian[._\s-]*sub|hard[._\s-]*sub|hardsub/i.test(text)) return "HardSub";
  if (/soft[._\s-]*sub|softsub/i.test(text)) return "SoftSub";
  if (/x265|10[._\s-]*bit|hevc/i.test(text)) return "Encoded";
  return "Files";
}

function extractPoster(html, post) {
  const embedded = post?._embedded?.["wp:featuredmedia"]?.[0];
  const candidates = [
    embedded?.source_url,
    embedded?.media_details?.sizes?.large?.source_url,
    post.posterUrl,
    /"thumbnailUrl"\s*:\s*"([^"]+)"/i.exec(html)?.[1],
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)/i.exec(html)?.[1],
  ];
  return candidates.map((value) => value && decodeHtmlEntities(value).replace(/\\\//g, "/")).find(Boolean) || null;
}

function englishTitle(post, html) {
  if (post.cardTitle) {
    return plainText(post.cardTitle).replace(/\s+((?:19|20)\d{2})$/, "").trim();
  }
  const slug = post.slug || new URL(absoluteUrl(post.link || extractCanonical(html))).pathname.split("/").filter(Boolean).at(-1) || "";
  return decodeURIComponentSafe(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\s+((?:19|20)\d{2})$/, "")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function extractPersianTitle(value) {
  const title = plainText(value)
    .replace(/دانلود\s+(?:فصل\s+\d+\s+)?سریال\s*/g, "")
    .replace(/(?:بدون سانسور|با زیرنویس|زیرنویس فارسی|دوبله فارسی).*$/g, "")
    .trim();
  const persian = title.match(/[\u0600-\u06ff][\u0600-\u06ff\s‌ٔ]+/u)?.[0]?.trim();
  return persian || null;
}

function extractCanonical(html) {
  return /<link\s+rel=["']canonical["']\s+href=["']([^"']+)/i.exec(html)?.[1] || "";
}

function extractDocumentTitle(html) {
  return /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || "";
}

function extractImdbFromText(html) {
  return /\b(tt\d{5,12})\b/i.exec(String(html || ""))?.[1]?.toLowerCase() || null;
}

function extractYear(html) {
  const values = Array.from(String(html || "").matchAll(/(?:سال\s*(?:ساخت|انتشار)?\s*[:：]?\s*|release(?:d)?\s*[:：]?\s*)\b((?:19|20)\d{2})\b/gi));
  return values.length ? Number(values[0][1]) : null;
}

function extractCardYear(article, title) {
  const explicit = /icon-calendar[\s\S]{0,180}?\b((?:19|20)\d{2})\b/i.exec(article)?.[1];
  const fromTitle = /\b((?:19|20)\d{2})\b/.exec(title)?.[1];
  return Number(explicit || fromTitle) || null;
}

function extractRating(html) {
  const match = /(?:IMDb|امتیاز)[^0-9]{0,80}([0-9](?:\.[0-9])?)(?:\s*\/\s*10)?/i.exec(plainText(html));
  return match ? Number(match[1]) : null;
}

function extractOverview(html) {
  const candidates = [
    /<div\b[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(html)?.[1],
    /<meta\s+name=["']description["']\s+content=["']([^"']+)/i.exec(html)?.[1],
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)/i.exec(html)?.[1],
  ];
  return candidates.find((value) => plainText(value || "").length > 20) || "";
}

function extractTaxonomyLinks(html, taxonomy) {
  const values = [];
  const className = taxonomy === "genres" ? "entry-genres" : `entry-${taxonomy}`;
  const section = new RegExp(`<(?:div|section)\\b[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]{0,12000}?)<\\/(?:div|section)>`, "i").exec(String(html || ""))?.[1] || "";
  if (!section) return values;
  const expression = new RegExp(`<a\\b[^>]*href=["'][^"']*/${taxonomy}/[^"']+["'][^>]*>([\\s\\S]*?)<\\/a>`, "gi");
  for (const match of section.matchAll(expression)) {
    const value = plainText(match[1]);
    if (value && value.length < 80) values.push(value);
  }
  return unique(values);
}

function taxonomyValues(classList, prefix) {
  return unique(classList
    .filter((value) => String(value).startsWith(prefix))
    .map((value) => String(value).slice(prefix.length).replace(/-/g, " "))
    .filter(Boolean));
}

function fileNameFromUrl(value) {
  try {
    return decodeURIComponentSafe(new URL(value).pathname.split("/").at(-1) || "") || null;
  } catch {
    return null;
  }
}

function extensionFromUrl(value) {
  return /\.([a-z0-9]{2,5})(?:$|[?#])/i.exec(value)?.[1]?.toLowerCase() || null;
}

function dedupeLinks(links) {
  const seen = new Set();
  return links.filter((link) => {
    const key = `${link.url}|${link.mediaKind || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function unique(values) {
  return Array.from(new Set(values));
}

function sortQuality(left, right) {
  const rank = (value) => Number(/(\d{3,4})p/i.exec(String(value || ""))?.[1] || (/4k/i.test(String(value || "")) ? 2160 : 0));
  return rank(right) - rank(left) || String(left).localeCompare(String(right));
}

function absoluteUrl(value) {
  try {
    return new URL(value, "https://www.f2my.top/").toString();
  } catch {
    return "https://www.f2my.top/";
  }
}

function slugify(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function hashValue(value) {
  return createHash("sha1").update(String(value)).digest("hex");
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
