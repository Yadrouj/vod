import { normalizeSearchQuery, TtlLruCache } from "./runtime-cache";

export function subzoneSearchUrl(title: string, year?: number | null) {
  const query = [title, year].filter(Boolean).join(" ");
  return `http://subzone.ir/subtitles/searchbytitle?query=${encodeURIComponent(query).replace(/%20/g, "+")}&l=`;
}

export type SubzoneSubtitle = {
  title: string;
  language: string;
  detailUrl: string;
  downloadUrl: string;
  releases: string[];
  author: string | null;
  comment: string | null;
  rating: "good" | "not rated" | null;
  sourceTitleUrl: string;
};

const SUBZONE_ORIGIN = "http://subzone.ir";
const subtitleCache = new TtlLruCache<string, SubzoneSubtitle[]>(300, 60 * 60_000);
const subtitleInflight = new Map<string, Promise<SubzoneSubtitle[]>>();
const DEFAULT_SUBTITLE_LANGUAGES = ["Farsi/Persian", "English"];

export function subtitleTrackUrl(downloadUrl: string) {
  return `/api/subtitles/track?url=${encodeURIComponent(downloadUrl)}`;
}

export async function findSubzoneEnglishSubtitles(query: string, limit = 40): Promise<SubzoneSubtitle[]> {
  return findSubzoneSubtitles(query, limit, ["English"]);
}

export async function findSubzoneSubtitles(query: string, limit = 40, languages = DEFAULT_SUBTITLE_LANGUAGES): Promise<SubzoneSubtitle[]> {
  const normalizedLanguages = languages.map((language) => language.trim()).filter(Boolean);
  const cacheKey = `${normalizeSearchQuery(query)}:${limit}:${normalizedLanguages.join("|").toLowerCase()}`;
  const cached = subtitleCache.get(cacheKey);
  if (cached) return cached;

  const running = subtitleInflight.get(cacheKey);
  if (running) return running;

  const request = findSubzoneSubtitlesUncached(query, limit, normalizedLanguages);
  subtitleInflight.set(cacheKey, request);
  try {
    const items = await request;
    subtitleCache.set(cacheKey, items);
    return items;
  } finally {
    subtitleInflight.delete(cacheKey);
  }
}

async function findSubzoneSubtitlesUncached(query: string, limit: number, languages: string[]): Promise<SubzoneSubtitle[]> {
  const searchHtml = await fetchSubzone(searchByTitleUrl(query));
  const titlePages = parseSearchResults(searchHtml).slice(0, 8);
  const subtitles: SubzoneSubtitle[] = [];

  for (const titlePage of titlePages) {
    const titleHtml = await fetchSubzone(titlePage.url);
    const listings = await Promise.allSettled(languages.map(async (language) => {
      const fallbackSlug = language.toLowerCase().replace(/\//g, "_").replace(/[^a-z_]+/g, "_");
      const languageUrl = parseLanguageUrl(titleHtml, language) ?? `${titlePage.url}/${fallbackSlug}`;
      const listingHtml = languageUrl === titlePage.url ? titleHtml : await fetchSubzone(languageUrl);
      return parseSubtitleRows(listingHtml, titlePage.url, language);
    }));
    for (const listing of listings) if (listing.status === "fulfilled") subtitles.push(...listing.value);
    if (subtitles.length >= limit) break;
  }

  return uniqueBy(subtitles, (subtitle) => subtitle.detailUrl)
    .sort((left, right) => languageRank(left.language, languages) - languageRank(right.language, languages) || Number(right.rating === "good") - Number(left.rating === "good"))
    .slice(0, limit);
}

function searchByTitleUrl(query: string) {
  return `${SUBZONE_ORIGIN}/subtitles/searchbytitle?query=${encodeURIComponent(query).replace(/%20/g, "+")}&l=`;
}

async function fetchSubzone(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 SarvNema Subzone Browser",
      accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Subzone request failed: ${response.status} ${url}`);
  return response.text();
}

function parseSearchResults(html: string) {
  return Array.from(html.matchAll(/<div class="title">\s*<a href="([^"]+)">([\s\S]*?)<\/a>\s*<\/div>[\s\S]*?<div class="subtle count">\s*([^<]+)/gi))
    .map((match) => ({
      url: absoluteSubzoneUrl(match[1]),
      title: cleanHtml(match[2]),
      count: Number(cleanHtml(match[3]).match(/\d+/)?.[0] ?? 0),
    }))
    .filter((item) => item.count > 0);
}

function parseLanguageUrl(html: string, language: string) {
  const pattern = new RegExp(`<a href=['"]([^'"]+)['"][^>]*>\\s*${escapeRegExp(language)}\\s*<span`, "i");
  const href = html.match(pattern)?.[1];
  return href ? absoluteSubzoneUrl(href) : null;
}

function parseSubtitleRows(html: string, sourceTitleUrl: string, requestedLanguage: string): SubzoneSubtitle[] {
  const rows = Array.from(html.matchAll(/<li class='item[^']*'>([\s\S]*?)<\/li>/gi));
  const title = cleanHtml(html.match(/<h1>\s*<span[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const subtitles: SubzoneSubtitle[] = [];

  for (const [, row] of rows) {
    const language = cleanHtml(row.match(/<span class='language[^']*'>([\s\S]*?)<\/span>/i)?.[1] ?? "");
    if (normalizeLanguage(language) !== normalizeLanguage(requestedLanguage)) continue;
    const href = row.match(/<a class='download icon-download' href='([^']+)'/i)?.[1];
    if (!href) continue;
    const detailUrl = absoluteSubzoneUrl(href);
    const releases = Array.from(row.matchAll(/<ul class='scrolllist'>[\s\S]*?<li>([\s\S]*?)<\/li>/gi)).map((match) => cleanHtml(match[1]));
    const author = cleanHtml(row.match(/<b>By\s*<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "") || null;
    const comment = cleanHtml(row.match(/<div class='vertical-middle'>[\s\S]*?<p>([\s\S]*?)<\/p>/i)?.[1] ?? "") || null;
    const rating = /rate good/i.test(row) ? "good" : /not rated/i.test(row) ? "not rated" : null;

    subtitles.push({
      title,
      language,
      detailUrl,
      downloadUrl: `${detailUrl}/download`,
      releases,
      author,
      comment,
      rating,
      sourceTitleUrl,
    });
  }

  return subtitles;
}

function languageRank(language: string, preferred: string[]) {
  const index = preferred.findIndex((item) => normalizeLanguage(item) === normalizeLanguage(language));
  return index < 0 ? preferred.length : index;
}

function normalizeLanguage(value: string) {
  return value.toLowerCase().replace(/[^a-z]+/g, "");
}

function absoluteSubzoneUrl(href: string) {
  return href.startsWith("http") ? href : `${SUBZONE_ORIGIN}${href.startsWith("/") ? "" : "/"}${href}`;
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function cleanHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;|\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
