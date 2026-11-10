import { normalizeSearchQuery, TtlLruCache } from "./runtime-cache";

export function subzoneSearchUrl(title: string, year?: number | null) {
  const query = [title, year].filter(Boolean).join(" ");
  return `https://subzone.ir/subtitles/searchbytitle?query=${encodeURIComponent(query).replace(/%20/g, "+")}&l=`;
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

const SUBZONE_ORIGIN = "https://subzone.ir";
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
  const titlePages = parseSearchResults(searchHtml).filter(page => {
    const words = normalizeSearchQuery(query).split(/\s+/).filter(Boolean);
    const name = normalizeSearchQuery(page.title);
    const extra = name.replace(normalizeSearchQuery(query), '');
    return words.every(word => name.includes(word)) && !/best moments|minisodes|no half measures|creating the|the movie/i.test(extra);
  }).slice(0, 4);
  const subtitles: SubzoneSubtitle[] = [];

  for (const titlePage of titlePages) {
    const titleHtml = await fetchSubzone(titlePage.url);
    const listings = await Promise.allSettled(languages.map(async (language) => {
      const languageUrl = parseLanguageUrl(titleHtml, language);
      if (!languageUrl) return [];
      const listingHtml = languageUrl === titlePage.url ? titleHtml : await fetchSubzone(languageUrl);
      return parseSubtitleRows(listingHtml, titlePage.url, language);
    }));
    for (const listing of listings) if (listing.status === "fulfilled") subtitles.push(...listing.value);
    if (subtitles.length >= limit) break;
  }

  const unique = uniqueBy(subtitles, subtitle => subtitle.detailUrl)
    .sort((left, right) => Number(right.rating === 'good') - Number(left.rating === 'good'));
  const buckets = languages.map(language => unique.filter(item => normalizeLanguage(item.language) === normalizeLanguage(language)));
  const candidates: SubzoneSubtitle[] = [];
  for (let index = 0; candidates.length < Math.min(limit, 24); index++) {
    const next = buckets.flatMap(bucket => bucket[index] ? [bucket[index]] : []);
    if (!next.length) break;
    candidates.push(...next.slice(0, Math.min(limit, 24) - candidates.length));
  }
  const verified: SubzoneSubtitle[] = [];
  // Bound provider traffic. Resolve the actual published download button instead
  // of inventing a path; keep its stable endpoint, not the expiring CDN token.
  for (let offset = 0; offset < candidates.length; offset += 4) {
    const batch = await Promise.allSettled(candidates.slice(offset, offset + 4).map(async item => {
      const html = await fetchSubzone(item.detailUrl);
      const downloadUrl = parseSubtitleDownloadUrl(html, item.detailUrl);
      return downloadUrl ? { ...item, downloadUrl } : null;
    }));
    for (const result of batch) if (result.status === 'fulfilled' && result.value) verified.push(result.value);
  }
  return verified;
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

export function parseSubtitleRows(html: string, sourceTitleUrl: string, requestedLanguage: string): SubzoneSubtitle[] {
  // A row contains nested release <li>s. Ending at the first </li> loses the
  // download button and silently drops precisely the version-tagged results.
  const rows = html.split(/<li\s+class=["']item\b[^"']*["'][^>]*>/gi).slice(1);
  const title = cleanHtml(html.match(/<h1>\s*<span[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const subtitles: SubzoneSubtitle[] = [];

  for (const row of rows) {
    const language = cleanHtml(row.match(/<span class='language[^']*'>([\s\S]*?)<\/span>/i)?.[1] ?? "");
    if (normalizeLanguage(language) !== normalizeLanguage(requestedLanguage)) continue;
    const href = row.match(/<a class='download icon-download' href='([^']+)'/i)?.[1];
    if (!href) continue;
    const detailUrl = absoluteSubzoneUrl(href);
    const releaseList = row.match(/<ul class=['"]scrolllist['"]>([\s\S]*?)<\/ul>/i)?.[1] || '';
    const releases = Array.from(releaseList.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)).map(match => cleanHtml(match[1]));
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

function normalizeLanguage(value: string) {
  return value.toLowerCase().replace(/[^a-z]+/g, "");
}

function absoluteSubzoneUrl(href: string) {
  const url = new URL(href, SUBZONE_ORIGIN);
  if (!['subzone.ir', 'www.subzone.ir'].includes(url.hostname) || !['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && url.port !== '443')) throw new Error('Untrusted subtitle page URL');
  url.protocol = 'https:';
  return url.href;
}

export function parseSubtitleDownloadUrl(html: string, detailUrl: string): string | null {
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    if (!/\bid=["']downloadButton["']/i.test(match[0])) continue;
    const href = match[0].match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      const url = absoluteSubzoneUrl(cleanHtml(href));
      const detail = new URL(detailUrl);
      if (new URL(url).pathname === `${detail.pathname.replace(/\/$/, '')}/download`) return url;
    } catch { /* Ignore malformed or off-provider buttons. */ }
  }
  return null;
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
