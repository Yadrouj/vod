import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

const SOURCE_URL =
  process.env.VOD_SOURCE_URL ||
  process.argv[2] ||
  "https://dls2.aparatchi-dlcenter.top/DonyayeSerial/donyaye_serial_all_archive.html";
const OUT_FILE = process.argv[3] || path.join("public", "data", "vod-catalog.json");
const RAW_HTML_FILE = process.env.VOD_RAW_HTML_FILE || "";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function absolutize(raw, baseUrl) {
  try {
    return new URL(decodeEntities(raw), baseUrl).toString();
  } catch {
    return decodeEntities(raw);
  }
}

function parseSize(raw) {
  const match = /([\d.]+)\s*(GB|MB|KB)/i.exec(raw);
  return match ? `${match[1]} ${match[2].toUpperCase()}` : null;
}

function inferQuality(label, href) {
  const match = /\b(2160p|1080p|720p|480p|360p|4K)\b/i.exec(`${label} ${href}`);
  return match ? match[1].replace(/^4k$/i, "4K") : null;
}

function inferRelease(label, href) {
  const match = /\b(BluRay|WEBRip|WEB-DL|WEB|HDTV|HDRip|DVDRip|BRRip|CAM|TS|Remux)\b/i.exec(
    `${label} ${href}`
  );
  return match ? match[1] : null;
}

function inferYear(block) {
  const pathYear = /\/(?:movies?|series|animation|anime|documentary|movie\d*)\/(\d{4})\//i.exec(block);
  if (pathYear) return Number(pathYear[1]);
  const anyYear = /\b(19\d{2}|20\d{2})\b/.exec(block);
  return anyYear ? Number(anyYear[1]) : null;
}

function extractImages(html, baseUrl) {
  const found = new Set();
  const add = (value) => {
    if (!value) return;
    for (const part of value.split(",")) {
      const raw = part.trim().split(/\s+/)[0];
      if (/\.(jpe?g|png|webp|avif)(?:$|\?)/i.test(raw)) {
        found.add(absolutize(raw, baseUrl));
      }
    }
  };

  for (const match of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) add(match[1]);
  for (const match of html.matchAll(/<source\b[^>]*\bsrcset=["']([^"']+)["'][^>]*>/gi)) add(match[1]);
  for (const match of html.matchAll(/<meta\b[^>]*\b(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/gi)) add(match[1]);
  for (const match of html.matchAll(/url\(["']?([^"')]+)["']?\)/gi)) add(match[1]);

  return Array.from(found);
}

function parseBlock(block, baseUrl) {
  const heading = /<h3[^>]*>\s*(?:\d+\.\s*)?(.+?)(?:\s+start_year)?\s*<\/h3>/is.exec(block);
  if (!heading) return null;

  const title = stripTags(heading[1]);
  const imdbCode = /<b>\s*IMDb Code:\s*<\/b>\s*([^<\s]+)/i.exec(block)?.[1] ?? "";
  const type = stripTags(/<b>\s*Title Type:\s*<\/b>\s*([^<]+)/i.exec(block)?.[1] ?? "");
  const votesRaw = stripTags(/<b>\s*IMDb Votes:\s*<\/b>\s*([^<]+)/i.exec(block)?.[1] ?? "");
  const ratingRaw = stripTags(/<b>\s*IMDb Rates:\s*<\/b>\s*([^<]+)/i.exec(block)?.[1] ?? "");
  const imageUrls = extractImages(block, baseUrl);
  const links = [];
  const linkPattern = /<a\s+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
  let match;

  while ((match = linkPattern.exec(block))) {
    const before = block.slice(0, match.index);
    const after = block.slice(match.index + match[0].length, match.index + match[0].length + 160);
    const groupMatches = Array.from(before.matchAll(/<p[^>]*>\s*<b>([^<]+)<\/b>\s*<\/p>/gi));
    const seasonMatches = Array.from(before.matchAll(/<p[^>]*>\s*season\s+(\d+)\s*<\/p>/gis));
    const group = stripTags(groupMatches.at(-1)?.[1] ?? "Files");
    const season = seasonMatches.at(-1)?.[1] ?? null;
    const url = absolutize(match[1], baseUrl);
    const label = stripTags(match[2]);

    links.push({
      label: season ? `Season ${Number(season)} / ${label}` : label,
      url,
      size: parseSize(after),
      group,
      quality: inferQuality(label, url),
      release: inferRelease(label, url),
    });
  }

  const qualities = Array.from(new Set(links.map((link) => link.quality).filter(Boolean))).sort(
    (a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10)
  );
  const groups = Array.from(new Set(links.map((link) => link.group))).sort();

  return {
    id: imdbCode || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title,
    imdbCode,
    imdbUrl: imdbCode ? `https://www.imdb.com/title/${imdbCode}/` : null,
    type,
    year: inferYear(block),
    imdbVotes: votesRaw ? Number(votesRaw.replace(/[^\d]/g, "")) : null,
    imdbRating: ratingRaw ? Number(ratingRaw) : null,
    groups,
    qualities,
    links,
    imageUrls,
    posterUrl: imageUrls[0] ?? null,
    backdropUrl: imageUrls[1] ?? imageUrls[0] ?? null,
    genres: [],
    runtimeMinutes: null,
    originalTitle: null,
    endYear: null,
    overview: null,
    tagline: null,
    countries: [],
    languages: [],
  };
}

async function fetchHtml(url) {
  const { stdout } = await execFileP(
    "curl",
    ["-L", "--fail", "--silent", "--show-error", "--max-time", "120", "-A", UA, url],
    { maxBuffer: 128 * 1024 * 1024 }
  );
  return stdout;
}

async function main() {
  const html = await fetchHtml(SOURCE_URL);
  if (RAW_HTML_FILE) {
    await mkdir(path.dirname(RAW_HTML_FILE), { recursive: true });
    await writeFile(RAW_HTML_FILE, html);
  }

  const items = html
    .split(/<hr\s*\/?>/i)
    .map((block) => parseBlock(block, SOURCE_URL))
    .filter(Boolean);
  const totalLinks = items.reduce((sum, item) => sum + item.links.length, 0);
  const totalImages = items.reduce((sum, item) => sum + item.imageUrls.length, 0);
  const payload = {
    sourceUrl: SOURCE_URL,
    scrapedAt: new Date().toISOString(),
    sourceMode: "html-only",
    totalTitles: items.length,
    totalLinks,
    totalImages,
    items,
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(payload));
  console.log(
    JSON.stringify(
      {
        outFile: OUT_FILE,
        totalTitles: items.length,
        totalLinks,
        totalImages,
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
