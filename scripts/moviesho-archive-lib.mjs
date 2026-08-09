import path from "node:path";
import {
  buildSourceLabel,
  decodeHtmlEntities,
  extractImdbIds,
  inferGroup,
  inferQuality,
  inferRelease,
  isSubtitleFile,
  isVideoFile,
  plainText,
  subtitleLanguage,
} from "./moviesho-source-lib.mjs";

const DETAIL_EXCLUSIONS = /\/(?:category|tag|genre|country|language|release|author|page|wp-json|feed)(?:\/|$)/i;
const SOURCE_HOST = /^sr\d*\.moviesho\.com$/i;

export function parseArchiveDetailUrls(html, pageUrl = "https://www.moviesho.com/category/movies/") {
  const urls = new Set();
  for (const article of String(html ?? "").matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/gi)) {
    for (const anchor of article[0].matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
      const url = safeUrl(decodeHtmlEntities(anchor[1]), pageUrl);
      if (!url || url.hostname !== "www.moviesho.com" || DETAIL_EXCLUSIONS.test(url.pathname)) continue;
      if (url.pathname === "/" || !/^\/[a-z0-9][^/]*\/$/i.test(url.pathname)) continue;
      url.hash = "";
      url.search = "";
      urls.add(url.toString());
    }
  }
  return [...urls];
}

export function parseMovieshoDetail(html, pageUrl) {
  const normalized = String(html ?? "").replace(/\\\//g, "/");
  const imdbCode = extractImdbIds(normalized)[0] ?? null;
  const restUrl = extractAttribute(
    normalized,
    /<link\b(?=[^>]*rel=["']alternate["'])(?=[^>]*type=["']application\/json["'])[^>]*>/i,
    "href",
  );
  const titleFa = plainText(/<div\b[^>]*class=["'][^"']*single-title[^"']*["'][^>]*>[\s\S]*?<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(normalized)?.[1]
    ?? /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(normalized)?.[1]
    ?? metaContent(normalized, "og:title"));
  const runtimeText = plainText(/<div\b[^>]*class=["'][^"']*runtime[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(normalized)?.[1] ?? "");
  const runtimeMinutes = numberFrom(runtimeText);
  const posterUrl = normalizeImageUrl(metaContent(normalized, "og:image"), pageUrl);
  const descriptionFa = plainText(metaContent(normalized, "og:description"));
  const directSubtitles = [];
  const videoUrls = [];

  for (const match of normalized.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const url = safeUrl(decodeHtmlEntities(match[1]), pageUrl);
    if (!url) continue;
    if (isVideoFile(url.toString()) && SOURCE_HOST.test(url.hostname)) videoUrls.push(url.toString());
    if (isSubtitleFile(url.toString()) && SOURCE_HOST.test(url.hostname)) directSubtitles.push(url.toString());
    for (const key of ["player", "subtitle"]) {
      const decoded = decodePlayerPayload(url.searchParams.get(key));
      if (!decoded) continue;
      if (isVideoFile(decoded)) videoUrls.push(decoded);
      if (isSubtitleFile(decoded)) directSubtitles.push(decoded);
    }
  }

  const subtitles = unique(directSubtitles).map((url) => ({
    label: subtitleLabel(url),
    url,
    language: subtitleLanguage(fileName(url)),
    format: path.extname(new URL(url).pathname).slice(1).toLowerCase() || "srt",
    size: null,
    modified: null,
  }));
  const links = unique(videoUrls).map((url) => {
    const name = fileName(url);
    const quality = inferQuality(name);
    const release = inferRelease(name);
    const group = inferGroup(name);
    return {
      label: buildSourceLabel({ quality, release, group, season: null, episode: null }),
      url,
      size: null,
      group,
      quality,
      release,
      season: null,
      episode: null,
      fileName: name,
      sourceUrl: pageUrl,
      modified: null,
      subtitleUrl: subtitles[0]?.url ?? null,
      subtitles,
    };
  });

  return {
    pageUrl,
    imdbCode,
    restUrl: restUrl ? new URL(restUrl, pageUrl).toString() : null,
    titleFa,
    runtimeMinutes,
    posterUrl,
    descriptionFa,
    links,
    subtitles,
  };
}

export function mapMovieshoRestPost(post, detail) {
  const contentHtml = String(post?.content?.rendered ?? "");
  const heading = plainText(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/i.exec(contentHtml)?.[1] ?? "");
  const terms = taxonomyTerms(post?._embedded?.["wp:term"] ?? []);
  const year = numberFrom(terms.release?.[0]) ?? numberFrom(heading) ?? numberFrom(detail.titleFa);
  const title = canonicalTitle(heading, post?.slug, year);
  const fullTitleFa = plainText(post?.title?.rendered ?? detail.titleFa);
  const persianTitle = derivePersianTitle(fullTitleFa, title, year);
  const contentText = plainText(contentHtml);
  const persianOverview = stripLeading(contentText, heading);
  const yoast = post?.yoast_head_json ?? {};
  const featured = post?._embedded?.["wp:featuredmedia"]?.[0];
  const images = collectImages({ contentHtml, yoast, featured, detail });

  return {
    id: detail.imdbCode ?? `moviesho-${post?.id}`,
    title: title || fullTitleFa || `Moviesho ${post?.id}`,
    imdbCode: detail.imdbCode ?? `moviesho-${post?.id}`,
    imdbUrl: detail.imdbCode ? `https://www.imdb.com/title/${detail.imdbCode}/` : null,
    type: "Movie",
    year,
    imdbVotes: null,
    imdbRating: null,
    groups: unique(detail.links.map((link) => link.group)),
    qualities: unique(detail.links.map((link) => link.quality).filter(Boolean)),
    links: detail.links,
    genres: terms["genre-movies"] ?? [],
    runtimeMinutes: detail.runtimeMinutes,
    originalTitle: title || null,
    overview: plainText(post?.excerpt?.rendered ?? yoast.og_description ?? detail.descriptionFa) || persianOverview || null,
    countries: terms.country ?? [],
    languages: terms.language ?? [],
    posterUrl: images[0]?.url ?? detail.posterUrl ?? null,
    backdropUrl: images.find((image) => (image.width ?? 0) > (image.height ?? Infinity))?.url ?? null,
    source: "moviesho",
    sourcePageUrl: detail.pageUrl,
    movieshoPageUrl: detail.pageUrl,
    movieshoPostId: post?.id ?? null,
    movieshoPublishedAt: post?.date_gmt ?? post?.date ?? null,
    movieshoModifiedAt: post?.modified_gmt ?? post?.modified ?? null,
    persianTitle: persianTitle || null,
    persianOverview: persianOverview || detail.descriptionFa || null,
    persianDescription: plainText(yoast.og_description ?? post?.excerpt?.rendered ?? detail.descriptionFa) || null,
    persianGenres: terms["genre-movies"] ?? [],
    persianCountries: terms.country ?? [],
    persianLanguages: terms.language ?? [],
    movieshoImages: images,
  };
}

export function decodePlayerPayload(value) {
  if (!value) return null;
  const candidates = [value, decodeURIComponentSafe(value)];
  for (const candidate of candidates) {
    try {
      const normalized = candidate.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = Buffer.from(normalized, "base64").toString("utf8").trim();
      const url = safeUrl(decoded);
      if (url && /^https?:$/.test(url.protocol)) return url.toString();
    } catch {
      // Try the next representation.
    }
  }
  return null;
}

export function derivePersianTitle(value, englishTitle, year) {
  const fullTitle = plainText(value);
  const parenthetical = [...fullTitle.matchAll(/[([]([^\])]+)[\])]/g)]
    .map((match) => match[1].trim())
    .find((part) => /[\u0600-\u06ff]/u.test(part));
  if (parenthetical) return cleanPersianTitle(parenthetical, year);

  let title = fullTitle;
  if (englishTitle) {
    const index = title.toLocaleLowerCase("en-US").indexOf(englishTitle.toLocaleLowerCase("en-US"));
    if (index > 0) {
      const prefix = cleanPersianTitle(title.slice(0, index), year);
      if (/[\u0600-\u06ff]/u.test(prefix)) return prefix;
      title = `${title.slice(0, index)} ${title.slice(index + englishTitle.length)}`;
    }
  }
  title = cleanPersianTitle(title, year);
  return /[\u0600-\u06ff]/u.test(title) ? title : "";
}

function cleanPersianTitle(value, year) {
  return plainText(value)
    .replace(/^(?:دانلود|تماشای آنلاین)\s+(?:رایگان\s+)?(?:فیلم\s+)?/u, "")
    .replace(new RegExp(`(?:${year ?? "(?!)"})`, "g"), "")
    .replace(/(?:با\s+)?(?:زیرنویس\s+فارسی|دوبله\s+فارسی|نسخه\s+کامل).*$/u, "")
    .replace(/[|\-–—:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function collectImages({ contentHtml, yoast, featured, detail }) {
  const values = [];
  const add = (url, width = null, height = null, caption = null) => {
    const normalized = normalizeImageUrl(url, detail.pageUrl);
    if (normalized) values.push({ url: normalized, width: numberOrNull(width), height: numberOrNull(height), caption: plainText(caption) || null });
  };
  add(featured?.source_url, featured?.media_details?.width, featured?.media_details?.height, featured?.caption?.rendered);
  for (const image of yoast?.og_image ?? []) add(image?.url, image?.width, image?.height, null);
  add(detail.posterUrl);
  for (const match of contentHtml.matchAll(/<img\b[^>]*>/gi)) {
    const src = extractAttribute(match[0], /<img\b[^>]*>/i, "data-src") || extractAttribute(match[0], /<img\b[^>]*>/i, "src");
    add(src, attribute(match[0], "width"), attribute(match[0], "height"), attribute(match[0], "alt"));
  }
  const seen = new Set();
  return values.filter((image) => {
    const key = image.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function taxonomyTerms(groups) {
  const result = {};
  for (const group of groups) {
    for (const term of group ?? []) {
      const taxonomy = String(term?.taxonomy ?? "category");
      const name = plainText(term?.name);
      if (!name) continue;
      (result[taxonomy] ??= []).push(name);
    }
  }
  return result;
}

function canonicalTitle(heading, slug, year) {
  const source = heading || String(slug ?? "").replace(/-film$/i, "").replace(/-/g, " ");
  const withoutYear = year ? source.replace(new RegExp(`\\s*[\\[(]?${year}[\\])]?(?=\\s|$)`, "g"), " ") : source;
  return withoutYear
    .replace(/^(?:فیلم|انیمیشن|مستند|سریال)\s+/u, "")
    .replace(/^download\s+(?:movie|film)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeImageUrl(value, baseUrl) {
  const url = safeUrl(value, baseUrl);
  if (!url || !/^https?:$/.test(url.protocol)) return null;
  url.pathname = url.pathname.replace(/-\d{2,4}x\d{2,4}(?=\.(?:jpe?g|png|webp|avif)$)/i, "");
  url.hash = "";
  return url.toString();
}

function metaContent(html, property) {
  for (const match of String(html ?? "").matchAll(/<meta\b[^>]*>/gi)) {
    const name = attribute(match[0], "property") || attribute(match[0], "name");
    if (name?.toLowerCase() === property.toLowerCase()) return attribute(match[0], "content") ?? "";
  }
  return "";
}

function extractAttribute(html, elementPattern, name) {
  const element = elementPattern.exec(String(html ?? ""))?.[0];
  return element ? attribute(element, name) : null;
}

function attribute(element, name) {
  return decodeHtmlEntities(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(element)?.[1] ?? "") || null;
}

function subtitleLabel(url) {
  const language = subtitleLanguage(fileName(url));
  return language === "fa" ? "Persian subtitle" : language === "en" ? "English subtitle" : "Subtitle";
}

function fileName(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").at(-1) ?? "");
  } catch {
    return "source-file";
  }
}

function stripLeading(value, heading) {
  const text = plainText(value);
  return heading && text.startsWith(heading) ? text.slice(heading.length).trim() : text;
}

function numberFrom(value) {
  const match = /(?:^|\D)((?:19|20)\d{2}|\d{1,3})(?:\D|$)/.exec(String(value ?? ""));
  return match ? Number(match[1]) : null;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function unique(values) {
  return [...new Set(values.filter((value) => value != null && value !== ""))];
}

function safeUrl(value, baseUrl = "https://www.moviesho.com/") {
  if (!value) return null;
  try {
    return new URL(String(value).trim(), baseUrl);
  } catch {
    return null;
  }
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
