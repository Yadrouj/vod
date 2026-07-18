import { execFile } from "node:child_process";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
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
      "--silent",
      "--show-error",
      "--max-time",
      "120",
      "-A",
      UA,
      "--write-out",
      "\n__SARVNEMA_HTTP_STATUS__:%{http_code}",
      url,
    ],
    { maxBuffer: 64 * 1024 * 1024 }
  );
  const marker = /\n__SARVNEMA_HTTP_STATUS__:(\d{3})\s*$/.exec(stdout);
  const status = Number(marker?.[1] ?? 0);
  const body = marker ? stdout.slice(0, marker.index) : stdout;
  return { status, body };
}

async function main() {
  const attempts = [];
  let html = "";
  let resolvedSourceUrl = SOURCE_URL;
  for (const candidate of sourceCandidates(SOURCE_URL)) {
    try {
      const response = await fetchArchive(candidate);
      attempts.push({ url: candidate, status: response.status, bytes: Buffer.byteLength(response.body) });
      if (response.status >= 200 && response.status < 300 && looksLikeArchive(response.body)) {
        html = response.body;
        resolvedSourceUrl = candidate;
        break;
      }
      if (isIranIpBlock(response.body)) attempts[attempts.length - 1].reason = "iran-ip-required";
    } catch (error) {
      attempts.push({ url: candidate, status: 0, reason: error instanceof Error ? error.message.slice(0, 180) : "request-failed" });
    }
  }
  if (!html) {
    const blocked = attempts.some((attempt) => attempt.reason === "iran-ip-required");
    throw new Error(`${blocked ? "Archive access requires an Iranian server IP. " : "No healthy archive endpoint was found. "}Existing data was preserved. Attempts: ${JSON.stringify(attempts)}`);
  }

  const items = parseArchive(html);
  const linkCount = items.reduce((sum, item) => sum + item.links.length, 0);
  if (items.length < 100 || linkCount < 1_000) {
    throw new Error(`Archive validation failed (${items.length} titles / ${linkCount} links). Existing data was preserved.`);
  }

  const previous = await readPreviousSummary(OUT_FILE);
  const allowShrink = process.env.ALLOW_LARGE_ARCHIVE_SHRINK === "1";
  if (!allowShrink && previous && (items.length < previous.totalTitles * 0.8 || linkCount < previous.totalLinks * 0.8)) {
    throw new Error(`Archive shrank unexpectedly from ${previous.totalTitles}/${previous.totalLinks} to ${items.length}/${linkCount}. Set ALLOW_LARGE_ARCHIVE_SHRINK=1 only after verifying the source.`);
  }

  const payload = {
    sourceUrl: resolvedSourceUrl,
    scrapedAt: new Date().toISOString(),
    totalTitles: items.length,
    totalLinks: linkCount,
    items,
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await safeReplaceJson(OUT_FILE, JSON.stringify(payload));

  console.log(
    JSON.stringify(
      {
        sourceUrl: resolvedSourceUrl,
        outFile: OUT_FILE,
        totalTitles: items.length,
        totalLinks: linkCount,
        attempts,
      },
      null,
      2
    )
  );
}

function sourceCandidates(sourceUrl) {
  if (process.env.ARCHIVE_SOURCE_ONLY === "1") return [sourceUrl];
  const parsed = new URL(sourceUrl);
  const hostMatch = /^(dls\d*)\.(.+)$/i.exec(parsed.hostname);
  if (!hostMatch) return [sourceUrl];
  const hosts = ["dls2", "dls", "dls3", "dls4", "dls5", "dls6", "dls7", "dls8", "dls9"];
  return Array.from(new Set([sourceUrl, ...hosts.map((host) => {
    const candidate = new URL(sourceUrl);
    candidate.hostname = `${host}.${hostMatch[2]}`;
    return candidate.toString();
  })]));
}

function looksLikeArchive(body) {
  return body.length > 50_000 && /IMDb Code:/i.test(body) && /start_year/i.test(body) && /<a\s+href=/i.test(body);
}

function isIranIpBlock(body) {
  return /(iran|iranian|vpn|proxy|داخلی|ایران)/i.test(stripTags(body).slice(0, 4_000));
}

async function readPreviousSummary(file) {
  try {
    const previous = JSON.parse(await readFile(file, "utf8"));
    const totalTitles = Number(previous.totalTitles ?? previous.items?.length ?? 0);
    const totalLinks = Number(previous.totalLinks ?? previous.items?.reduce((sum, item) => sum + (item.links?.length ?? 0), 0) ?? 0);
    return totalTitles > 0 && totalLinks > 0 ? { totalTitles, totalLinks } : null;
  } catch {
    return null;
  }
}

async function safeReplaceJson(file, content) {
  const temporary = `${file}.tmp-${process.pid}`;
  const backup = `${file}.previous-${process.pid}`;
  await writeFile(temporary, content);
  let movedPrevious = false;
  try {
    try {
      await rename(file, backup);
      movedPrevious = true;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await rename(temporary, file);
    if (movedPrevious) await unlink(backup).catch(() => undefined);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    if (movedPrevious) await rename(backup, file).catch(() => undefined);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
