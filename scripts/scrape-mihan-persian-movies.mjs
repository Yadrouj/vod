import { writeFile } from "node:fs/promises";

const SOURCE_URL = process.argv[2] || "https://dl.mihandownload.com/Movies/2026/04/28/";
const OUT_FILE = process.argv[3] || "public/data/mihan-persian-movies.json";
const DETAIL_ORIGIN = "https://mihandownload.com";
const DOWNLOAD_ORIGIN = "https://dl.mihandownload.com";
const MAX_ITEMS = Number(process.env.MIHAN_MAX_ITEMS || 0);
const REQUEST_TIMEOUT_MS = Number(process.env.MIHAN_TIMEOUT_MS || 25000);
const VIDEO_EXTENSIONS = /\.(mkv|mp4|m4v|avi|webm|mov|wmv)(?:$|[?#])/i;

async function main() {
  const html = await fetchText(SOURCE_URL);
  const files = parseDirectory(html, SOURCE_URL);
  const groups = groupFiles(files).slice(0, MAX_ITEMS || undefined);
  const items = [];

  for (const group of groups) {
    const detailUrl = await findDetailUrl(group.slug, group.searchTitle);
    const detail = detailUrl ? await scrapeDetailPage(detailUrl) : null;
    const links = mergeLinks(detail?.links ?? [], group.files.map(toDirectLink));
    const title = detail?.title ?? titleFromFile(group.searchTitle);
    const itemId = `mihan-${group.slug}`;

    items.push({
      id: itemId,
      title,
      imdbCode: itemId,
      imdbUrl: null,
      source: "mihandownload",
      sourcePageUrl: detailUrl,
      type: "movie",
      year: detail?.year ?? null,
      persianYear: detail?.persianYear ?? null,
      imdbVotes: null,
      imdbRating: null,
      groups: unique(links.map((link) => link.group)),
      qualities: unique(links.map((link) => link.quality).filter(Boolean)).sort(sortQuality),
      links,
      genres: detail?.genres?.length ? detail.genres : ["فیلم ایرانی"],
      runtimeMinutes: null,
      originalTitle: group.searchTitle,
      endYear: null,
      overview: detail?.overview ?? null,
      tagline: null,
      countries: detail?.countries?.length ? detail.countries : ["ایران"],
      languages: detail?.languages?.length ? detail.languages : ["فارسی"],
      posterUrl: detail?.posterUrl ?? null,
      backdropUrl: detail?.backdropUrl ?? detail?.posterUrl ?? null,
      logoUrl: null,
      releaseDate: detail?.persianYear ? String(detail.persianYear) : null,
      metascore: null,
      certificate: null,
      keywords: unique(["iranian-movie", "persian", "mihandownload", ...(detail?.genres ?? [])]),
      credits: detail?.credits ?? [],
      companies: [],
      apiFetchedAt: new Date().toISOString(),
    });
  }

  const payload = {
    sourceUrl: SOURCE_URL,
    sourceName: "MihanDownload Persian Movies",
    scrapedAt: new Date().toISOString(),
    totalTitles: items.length,
    totalLinks: items.reduce((sum, item) => sum + item.links.length, 0),
    items,
  };

  await writeFile(OUT_FILE, JSON.stringify(payload));
  console.log(
    JSON.stringify(
      {
        outFile: OUT_FILE,
        sourceUrl: SOURCE_URL,
        totalTitles: payload.totalTitles,
        totalLinks: payload.totalLinks,
        titles: items.map((item) => ({ id: item.id, title: item.title, links: item.links.length, sourcePageUrl: item.sourcePageUrl })),
      },
      null,
      2
    )
  );
}

function parseDirectory(html, baseUrl) {
  const rows = Array.from(html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi));
  const files = [];

  for (const [, row] of rows) {
    const href = row.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
    const name = cleanHtml(row.match(/<a\b[^>]*>[\s\S]*?(?:alt=["']File["'][^>]*>)?([\s\S]*?)<\/a>/i)?.[1] ?? href ?? "");
    if (!href || !name || /parent directory/i.test(name) || !VIDEO_EXTENSIONS.test(name)) continue;

    const cells = Array.from(row.matchAll(/<td\b[^>]*data-sort=["']?([^"'>]+)["']?[^>]*>([\s\S]*?)<\/td>/gi));
    const modified = cleanHtml(cells[1]?.[2] ?? "") || null;
    const size = cleanHtml(cells[2]?.[2] ?? "") || null;
    files.push({
      name,
      url: absolutizeUrl(href, baseUrl),
      size,
      modified,
      quality: inferQuality(name),
      release: inferRelease(name),
    });
  }

  return files;
}

function groupFiles(files) {
  const groups = new Map();

  for (const file of files) {
    const searchTitle = cleanFileTitle(file.name);
    const slug = slugFromLatin(searchTitle);
    const existing = groups.get(slug) ?? { slug, searchTitle, files: [] };
    existing.files.push(file);
    groups.set(slug, existing);
  }

  return Array.from(groups.values()).sort((a, b) => a.searchTitle.localeCompare(b.searchTitle));
}

async function findDetailUrl(slug, searchTitle) {
  const candidates = unique([
    slug,
    slug.replace(/(^|-)ye-/g, "$1yek-"),
    slug.replace(/-2$/, "-۲"),
  ]).filter(Boolean);

  for (const candidate of candidates) {
    const url = `${DETAIL_ORIGIN}/${candidate}/`;
    const html = await fetchText(url, { allow404: true });
    if (html && isMovieDetailPage(html)) return url;
  }

  const searchHtml = await fetchText(`${DETAIL_ORIGIN}/?s=${encodeURIComponent(searchTitle)}`, { allow404: true });
  if (!searchHtml) return null;

  const links = Array.from(searchHtml.matchAll(/href=["'](https:\/\/mihandownload\.com\/[^"']+\/)["'][^>]*>([\s\S]{0,240}?)<\/a>/gi))
    .map((match) => ({ url: match[1], text: cleanHtml(match[2]) }))
    .filter((link) => isCandidatePostUrl(link.url));
  const normalizedSearch = normalizeText(searchTitle);
  const best = links.find((link) => normalizeText(link.text).includes(normalizedSearch) || normalizeText(link.url).includes(slug));
  return best?.url ?? null;
}

async function scrapeDetailPage(url) {
  const html = await fetchText(url, { allow404: true });
  if (!html || !isMovieDetailPage(html)) return null;

  const title = cleanTitle(
    cleanHtml(html.match(/<h1\b[^>]*class=["'][^"']*phdng[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "") ||
      cleanHtml(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "") ||
      cleanHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "")
  );
  const factsHtml = html.match(/<div\b[^>]*class=["'][^"']*bplst[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
  const facts = parseFacts(factsHtml);
  const overview = parseSectionText(html, "خلاصه داستان");
  const actorText = parseSectionText(html, "بازیگران");
  const posterUrl = extractMeta(html, "og:image") ?? extractFirstImage(html);
  const downloads = parseDetailDownloads(html);
  const actors = mergePeople(facts.actors, splitPeople(actorText));
  const directors = facts.directors;

  return {
    title,
    genres: facts.genres,
    countries: facts.countries,
    languages: facts.languages,
    year: facts.year,
    persianYear: facts.year,
    qualities: facts.qualities,
    overview,
    posterUrl,
    backdropUrl: posterUrl,
    links: downloads,
    credits: [
      ...actors.map((name) => personCredit("Actor", name, "actor")),
      ...directors.map((name) => personCredit("Director", name, "director")),
    ],
  };
}

function parseFacts(html) {
  const facts = {
    genres: [],
    countries: [],
    languages: [],
    year: null,
    qualities: [],
    actors: [],
    directors: [],
  };
  const rows = Array.from(html.matchAll(/<p\b[^>]*>\s*<span>([\s\S]*?)<\/span>([\s\S]*?)<\/p>/gi));

  for (const [, rawLabel, rawValue] of rows) {
    const label = cleanHtml(rawLabel);
    const values = extractAnchorTexts(rawValue);
    if (label.includes("ژانر")) facts.genres = values;
    if (label.includes("محصول")) facts.countries = values;
    if (label.includes("زبان")) facts.languages = values;
    if (label.includes("سال")) facts.year = Number(toEnglishDigits(values[0] ?? "")) || null;
    if (label.includes("کیفیت")) facts.qualities = values.map((value) => toEnglishDigits(value));
    if (label.includes("بازیگران")) facts.actors = values;
    if (label.includes("کارگردان")) facts.directors = values;
  }

  return facts;
}

function parseDetailDownloads(html) {
  const block = html.match(/<div\b[^>]*class=["'][^"']*psboxdl[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/article>/i)?.[1] ?? "";
  const links = [];

  for (const match of block.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const row = match[1];
    const href = row.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)?.[1];
    if (!href || !VIDEO_EXTENSIONS.test(href)) continue;
    const label = cleanHtml(row.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "");
    const size = cleanHtml(row.match(/حجم\s*:\s*([^<]+)/i)?.[1] ?? "") || null;
    const quality = inferQuality(`${label} ${href}`);
    links.push({
      label: label || fileNameFromUrl(href),
      url: href,
      size,
      group: "MihanDownload",
      quality,
      release: inferRelease(href),
      fileName: fileNameFromUrl(href),
      sourceUrl: href,
      modified: null,
    });
  }

  return links;
}

function parseSectionText(html, heading) {
  const pattern = new RegExp(`<h[1-6][^>]*>\\s*${escapeRegExp(heading)}\\s*:?\\s*<\\/h[1-6]>([\\s\\S]*?)(?=<h[1-6][^>]*>|<div\\b[^>]*class=["'][^"']*psboxdl|<\\/div>\\s*<div)`, "i");
  const body = html.match(pattern)?.[1] ?? "";
  if (!body) return null;
  return cleanHtml(body).replace(/\s+/g, " ").trim() || null;
}

function extractAnchorTexts(html) {
  return Array.from(html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi))
    .map((match) => cleanHtml(match[1]))
    .filter(Boolean);
}

function toDirectLink(file) {
  return {
    label: file.name,
    url: file.url,
    size: file.size,
    group: "MihanDownload",
    quality: file.quality,
    release: file.release,
    fileName: file.name,
    sourceUrl: file.url,
    modified: file.modified,
  };
}

function mergeLinks(primary, fallback) {
  const byUrl = new Map();
  for (const link of [...primary, ...fallback]) {
    if (!link?.url) continue;
    byUrl.set(link.url, { ...link, quality: link.quality ?? inferQuality(`${link.label} ${link.url}`) });
  }
  return Array.from(byUrl.values()).sort((a, b) => sortQuality(a.quality ?? "", b.quality ?? ""));
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 SarvNema Mihan Scraper",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok && !(options.allow404 && response.status === 404)) {
      throw new Error(`${response.status} ${response.statusText} for ${url}`);
    }
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    if (options.allow404) return null;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isMovieDetailPage(html) {
  return /<div\b[^>]*class=["'][^"']*bplst/i.test(html) && /<div\b[^>]*class=["'][^"']*psboxdl/i.test(html);
}

function isCandidatePostUrl(url) {
  if (!url.startsWith(`${DETAIL_ORIGIN}/`)) return false;
  return !/\/(category|genre|actor|director|country|language|release|quality|tag|wp-content|search)\//i.test(url);
}

function cleanFileTitle(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/\[[^\]]*mihandownload[^\]]*\]/gi, "")
    .replace(/(^|[_\s.-])(2160p|1080p|720p|480p|360p|240p)(?=$|[_\s.-])/gi, "$1")
    .replace(/\b(BluRay|WEB[-_.]?DL|WEBRip|HDTV|DVDRip|HDRip|x264|x265)\b/gi, "")
    .replace(/[_\s.-]+$/g, "")
    .replace(/^[_\s.-]+/g, "")
    .replace(/__+/g, "_")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(value) {
  return value
    .replace(/\s*[-|]\s*میهن دانلود.*$/i, "")
    .replace(/^دانلود\s+(?:رایگان\s+)?/i, "")
    .replace(/^فیلم\s+(?:سینمایی\s+|ویدئویی\s+)?(?:ایرانی\s+)?/i, "")
    .replace(/\s+با بالاترین کیفیت$/i, "")
    .replace(/\s+همراه با تماشای آنلاین$/i, "")
    .trim();
}

function titleFromFile(value) {
  return value
    .split(" ")
    .map((part) => (part ? part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(" ");
}

function personCredit(category, name, type) {
  const slug = slugFromAny(name);
  return {
    category,
    name_id: `mihan-${type}-${slug}`,
    name_text: name,
    name_image_url: null,
  };
}

function splitPeople(value) {
  if (!value) return [];
  return value
    .split(/[،,]+/)
    .map((name) => cleanHtml(name).replace(/\s+و…?$/g, "").trim())
    .filter((name) => name.length > 1);
}

function mergePeople(...lists) {
  return unique(lists.flat().map((value) => value.trim()).filter(Boolean));
}

function extractMeta(html, property) {
  const escaped = escapeRegExp(property);
  return (
    html.match(new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"))?.[1] ??
    null
  );
}

function extractFirstImage(html) {
  return html.match(/<img\b[^>]+src=["']([^"']+(?:jpg|jpeg|png|webp))["'][^>]*>/i)?.[1] ?? null;
}

function slugFromLatin(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function slugFromAny(value) {
  const encoded = encodeURIComponent(value.trim().replace(/\s+/g, "-"));
  return encoded.replace(/%/g, "").toLowerCase().slice(0, 80) || "unknown";
}

function inferQuality(value) {
  return value.match(/(^|[^0-9])(\d{3,4})p(?=$|[^a-z0-9])/i)?.[2] ?? null;
}

function inferRelease(value) {
  return value.match(/\b(BluRay|WEB[-_.]?DL|WEBRip|HDTV|DVDRip|HDRip)\b/i)?.[1]?.replace(/[_.]/g, "-") ?? null;
}

function fileNameFromUrl(url) {
  return decodeURIComponent(url.split("/").pop() ?? url);
}

function absolutizeUrl(href, base) {
  return new URL(decodeText(href), base).toString().replace(DOWNLOAD_ORIGIN.replace(/\/$/, ""), DOWNLOAD_ORIGIN);
}

function normalizeText(value) {
  return toEnglishDigits(decodeText(value)).toLowerCase().replace(/[^a-z0-9آ-ی]+/g, " ").replace(/\s+/g, " ").trim();
}

function cleanHtml(value) {
  return decodeText(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function decodeText(value) {
  return value
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;|\u00a0/g, " ");
}

function toEnglishDigits(value) {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  return String(value).replace(/[۰-۹٠-٩]/g, (digit) => {
    const faIndex = fa.indexOf(digit);
    if (faIndex >= 0) return String(faIndex);
    const arIndex = ar.indexOf(digit);
    return arIndex >= 0 ? String(arIndex) : digit;
  });
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sortQuality(a, b) {
  return Number.parseInt(b, 10) - Number.parseInt(a, 10) || a.localeCompare(b);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
