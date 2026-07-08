import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

const SOURCE_URL =
  process.argv[2] ||
  "https://dls2.aparatchi-dlcenter.top/DonyayeSerial/donyaye_serial_all_archive.html";
const OUT_FILE =
  process.argv[3] || path.join("public", "data", "vod-archive.json");

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

function parseSize(raw) {
  const match = /([\d.]+)\s*(GB|MB|KB)/i.exec(raw);
  if (!match) return null;
  return `${match[1]} ${match[2].toUpperCase()}`;
}

function parseYear(block, title) {
  const pathYear = /\/(?:movies|series|animation|anime|documentary)\/(\d{4})\//i.exec(block);
  if (pathYear) return Number(pathYear[1]);

  const titleYear = new RegExp(`${escapeRegExp(title)}[\\.\\s-]+(\\d{4})`, "i").exec(
    block
  );
  if (titleYear) return Number(titleYear[1]);

  const anyYear = /\b(19\d{2}|20\d{2})\b/.exec(block);
  return anyYear ? Number(anyYear[1]) : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inferQuality(label, href) {
  const text = `${label} ${href}`;
  const match = /\b(2160p|1080p|720p|480p|360p|4K)\b/i.exec(text);
  return match ? match[1].replace(/^4k$/i, "4K") : null;
}

function inferRelease(label, href) {
  const text = `${label} ${href}`;
  const match =
    /\b(BluRay|WEBRip|WEB-DL|WEB|HDTV|HDRip|DVDRip|BRRip|CAM|TS|Remux)\b/i.exec(text);
  return match ? match[1] : null;
}

function parseArchive(html) {
  const blocks = html.split(/<hr\s*\/?>/i);
  const items = [];

  for (const block of blocks) {
    const heading = /<h3[^>]*>\s*(?:\d+\.\s*)?(.+?)\s+start_year\s*<\/h3>/is.exec(
      block
    );
    if (!heading) continue;

    const title = stripTags(heading[1]);
    const imdbCode = /<b>\s*IMDb Code:\s*<\/b>\s*([^<\s]+)/i.exec(block)?.[1] ?? "";
    const type = stripTags(
      /<b>\s*Title Type:\s*<\/b>\s*([^<]+)/i.exec(block)?.[1] ?? ""
    );
    const votesRaw = stripTags(
      /<b>\s*IMDb Votes:\s*<\/b>\s*([^<]+)/i.exec(block)?.[1] ?? ""
    );
    const ratingRaw = stripTags(
      /<b>\s*IMDb Rates:\s*<\/b>\s*([^<]+)/i.exec(block)?.[1] ?? ""
    );
    const links = [];
    const linkPattern =
      /<p[^>]*>\s*<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>\s*\/\s*([^<]+)<\/p>/gis;
    let linkMatch;

    while ((linkMatch = linkPattern.exec(block))) {
      const before = block.slice(0, linkMatch.index);
      const groupMatch = /<p[^>]*>\s*<b>(SoftSub|Dubbed|HardSub|Subtitle|نسخه دوبله|زیرنویس چسبیده)<\/b>\s*<\/p>/gi;
      let currentGroup = "Unknown";
      let group;
      while ((group = groupMatch.exec(before))) currentGroup = stripTags(group[1]);

      const href = decodeEntities(linkMatch[1]);
      const label = stripTags(linkMatch[2]);
      const size = parseSize(linkMatch[3]);

      links.push({
        label,
        url: href,
        size,
        group: currentGroup,
        quality: inferQuality(label, href),
        release: inferRelease(label, href),
      });
    }

    const qualities = Array.from(
      new Set(links.map((link) => link.quality).filter(Boolean))
    ).sort((a, b) => Number.parseInt(b) - Number.parseInt(a));
    const groups = Array.from(new Set(links.map((link) => link.group))).sort();

    items.push({
      id: imdbCode || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title,
      imdbCode,
      imdbUrl: imdbCode ? `https://www.imdb.com/title/${imdbCode}/` : null,
      type,
      year: parseYear(block, title),
      imdbVotes: votesRaw ? Number(votesRaw.replace(/[^\d]/g, "")) : null,
      imdbRating: ratingRaw ? Number(ratingRaw) : null,
      groups,
      qualities,
      links,
    });
  }

  return items;
}

async function fetchArchive(url) {
  const { stdout } = await execFileP(
    "curl",
    [
      "-L",
      "--fail",
      "--silent",
      "--show-error",
      "--max-time",
      "120",
      "-A",
      UA,
      url,
    ],
    { maxBuffer: 64 * 1024 * 1024 }
  );
  return stdout;
}

async function main() {
  const html = await fetchArchive(SOURCE_URL);
  const items = parseArchive(html);
  const linkCount = items.reduce((sum, item) => sum + item.links.length, 0);
  const payload = {
    sourceUrl: SOURCE_URL,
    scrapedAt: new Date().toISOString(),
    totalTitles: items.length,
    totalLinks: linkCount,
    items,
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(payload));

  console.log(
    JSON.stringify(
      {
        sourceUrl: SOURCE_URL,
        outFile: OUT_FILE,
        totalTitles: items.length,
        totalLinks: linkCount,
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
