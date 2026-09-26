import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { materializeEpisodeArtwork } from "../lib/episode-metadata.ts";
import { writeJsonAtomic } from "./atomic-json.mjs";

const ROOT = process.cwd();
const REPORT_FILE = path.join(ROOT, "public", "data", "episode-metadata", "index.json");
const OUTPUT_DIR = path.join(ROOT, "public", "data", "episode-metadata");
const timeoutMs = Math.min(30_000, Math.max(5_000, Number(process.env.TMDB_TIMEOUT_MS || 15_000)));
const waitMs = Math.max(0, Number(process.env.TMDB_DELAY_MS || 350));
const concurrency = Math.min(3, Math.max(1, Number(process.env.TMDB_CONCURRENCY || 2)));
const args = new Set(process.argv.slice(2));
const unprocessed = args.has("--unprocessed");
const onlyId = process.argv.find(value => value.startsWith("--id="))?.slice(5) || null;
const offsetArg = Number(process.argv.find(value => value.startsWith("--offset="))?.slice(9));
const offset = Number.isFinite(offsetArg) && offsetArg > 0 ? Math.floor(offsetArg) : 0;
const limitArg = Number(process.argv.find(value => value.startsWith("--limit="))?.slice(8));
const limit = Number.isFinite(limitArg) && limitArg > 0 ? Math.floor(limitArg) : Number.POSITIVE_INFINITY;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function decodeHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&hellip;/g, "…").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—")
    .replace(/\s+/g, " ").trim();
}

function normalizeTitle(value) {
  return decodeHtml(value).toLocaleLowerCase("en-US")
    .replace(/[’']/g, "").replace(/[^\p{L}\p{N}]+/gu, "");
}

function imageStats(episodes) {
  const images = episodes.filter(row => typeof row.imageUrl === "string" && row.imageUrl &&
    row.imageSource !== "fallback" && !row.imageUrl.startsWith("/api/episode-art/"));
  const unique = new Set(images.map(row => row.imageUrl));
  return {
    episodes: episodes.length,
    images: images.length,
    missingImages: episodes.length - images.length,
    distinctImages: unique.size,
    duplicateImages: Math.max(0, images.length - unique.size),
    fallbackImages: episodes.filter(row => row.imageSource === "fallback").length,
  };
}

function tvCandidates(html) {
  const output = [];
  const pattern = /<a\b[^>]*data-media-type="tv"[^>]*href="(\/tv\/[^"]+)"[^>]*>[\s\S]*?<img\b[^>]*\balt="([^"]*)"/gi;
  for (const match of html.matchAll(pattern)) {
    const href = match[1];
    const id = href.match(/^\/tv\/(\d+)(?:-|$)/)?.[1];
    if (!id || output.some(item => item.id === id)) continue;
    output.push({ id, href, label: decodeHtml(match[2]) });
  }
  return output;
}

function pageTitle(html) {
  const value = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  const title = decodeHtml(value);
  const year = Number(title.match(/\((?:TV Series|TV Mini Series|TV Special)\s+(\d{4})\)/i)?.[1] || 0);
  return { title: title.replace(/\s+—\s+The Movie Database.*$/i, "").replace(/\s+\((?:TV Series|TV Mini Series|TV Special)\s+\d{4}\)$/i, "").trim(), year };
}

function seasonNumbers(html) {
  return [...new Set([...html.matchAll(/\/season\/(\d+)(?:["?#]|$)/g)].map(match => Number(match[1])).filter(Number.isInteger))]
    .filter(number => number > 0).sort((a, b) => a - b);
}

function episodeImages(html, season) {
  const output = new Map();
  const pattern = /data-episode-number="(\d+)"[\s\S]{0,2200}?<img\b[^>]*class="[^"]*\bbackdrop\b[^"]*"[^>]*>/gi;
  for (const match of html.matchAll(pattern)) {
    const episode = Number(match[1]);
    const imageTag = match[0].slice(match[0].lastIndexOf("<img"));
    const srcset = imageTag.match(/srcset="([^"]+)"/i)?.[1] || "";
    const candidates = [...srcset.matchAll(/(https:\/\/[^\s,"]+)\s+(\d+)x/g)];
    const imageUrl = candidates.at(-1)?.[1] || imageTag.match(/\bsrc="(https:\/\/[^"]+)"/i)?.[1] || null;
    const imageAlt = decodeHtml(imageTag.match(/\balt="([^"]*)"/i)?.[1] || "");
    if (Number.isInteger(episode) && episode > 0 && imageUrl && !output.has(episode)) {
      output.set(episode, { season, episode, imageUrl, imageAlt });
    }
  }
  return output;
}

async function fetchText(url) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      headers: { accept: "text/html", "accept-language": "en-US,en;q=0.8", "user-agent": "Mozilla/5.0 SarvNema artwork refresh" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after") || 0);
      await sleep(Math.max(10_000, Math.min(120_000, retryAfter * 1_000 || 15_000 * (attempt + 1))));
      continue;
    }
    if (!response.ok) {
      const error = new Error("HTTP " + response.status);
      error.status = response.status;
      throw error;
    }
    return response.text();
  }
  throw new Error("HTTP 429");
}

async function resolveShow(title, year, originalTitle) {
  const terms = [...new Set([title, originalTitle].filter(Boolean))];
  const candidates = [];
  for (const term of terms) {
    const html = await fetchText("https://www.themoviedb.org/search/tv?query=" + encodeURIComponent(term));
    for (const candidate of tvCandidates(html)) if (!candidates.some(item => item.id === candidate.id)) candidates.push(candidate);
    if (candidates.length > 12) break;
    await sleep(waitMs);
  }
  let best = null;
  for (const candidate of candidates.slice(0, 12)) {
    try {
      const html = await fetchText("https://www.themoviedb.org/tv/" + candidate.id);
      const detail = pageTitle(html);
      const exact = [title, originalTitle].some(value => normalizeTitle(value) && normalizeTitle(value) === normalizeTitle(detail.title));
      if (!exact) continue;
      const score = (detail.year === Number(year) ? 100 : 0) + (candidate.label && normalizeTitle(candidate.label) === normalizeTitle(detail.title) ? 10 : 0);
      if (!best || score > best.score) best = { ...candidate, ...detail, score, html };
      await sleep(waitMs);
    } catch { /* A single candidate can be blocked without invalidating the search. */ }
  }
  return best;
}

async function refreshItem(item) {
  const file = path.join(OUTPUT_DIR, item.imdbCode + ".json");
  let saved = null;
  try { saved = JSON.parse(await readFile(file, "utf8")); } catch { /* first provider pass */ }
  const titleFile = path.join(ROOT, "public", "data", "titles", item.imdbCode + ".json");
  let titleData = {};
  try { titleData = JSON.parse(await readFile(titleFile, "utf8")); } catch { /* report data is enough */ }
  const show = await resolveShow(item.title, item.year, titleData.originalTitle);
  if (!show) throw new Error("TMDB exact title/year match not found");
  const wantedSeasons = [...new Set((saved?.episodes || []).map(row => Number(row.season)).filter(number => number > 0))];
  const discoveredSeasons = wantedSeasons.length ? wantedSeasons : seasonNumbers(show.html);
  const artwork = new Map();
  for (const season of discoveredSeasons) {
    const html = await fetchText("https://www.themoviedb.org/tv/" + show.id + "/season/" + season);
    for (const [episode, row] of episodeImages(html, season)) artwork.set(season + ":" + episode, row);
    await sleep(waitMs);
  }
  if (!artwork.size) throw new Error("No TMDB episode stills found");
  const rows = saved?.episodes?.length ? saved.episodes.map(row => ({ ...row })) : [...artwork.values()].map(row => ({
    season: row.season, episode: row.episode, title: row.imageAlt || "Episode " + row.episode, summary: null,
    imageUrl: null, imageSource: null,
  }));
  const used = new Set();
  const merged = rows.map(row => {
    const candidate = artwork.get(row.season + ":" + row.episode);
    const existing = row.imageUrl && row.imageSource !== "fallback" && !row.imageUrl.startsWith("/api/episode-art/") ? row.imageUrl : null;
    const imageUrl = candidate && (!existing || used.has(existing)) ? candidate.imageUrl : existing;
    if (imageUrl) used.add(imageUrl);
    return {
      ...row,
      imageUrl,
      imageSource: imageUrl === candidate?.imageUrl ? "tmdb" : row.imageSource,
      imageAlt: imageUrl === candidate?.imageUrl ? candidate.imageAlt || row.imageAlt : row.imageAlt,
    };
  });
  const episodes = materializeEpisodeArtwork(item.imdbCode, merged);
  const stats = imageStats(episodes);
  const snapshot = {
    ...(saved || {}),
    checkedAt: new Date().toISOString(),
    sourceUrl: "https://www.themoviedb.org/tv/" + show.id,
    tmdbId: Number(show.id),
    imdbCode: item.imdbCode,
    seriesTitle: item.title,
    episodes,
  };
  await writeJsonAtomic(file, snapshot);
  return { ...item, status: stats.missingImages || stats.duplicateImages ? "partial" : "complete", ...stats, tmdbId: Number(show.id), tmdbCheckedAt: snapshot.checkedAt, checkedAt: snapshot.checkedAt, sourceUrl: snapshot.sourceUrl };
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const report = JSON.parse(await readFile(REPORT_FILE, "utf8"));
  const candidates = (report.items || []).filter(item => /^tt\d+$/.test(item.imdbCode))
    .filter(item => !onlyId || item.imdbCode === onlyId)
    .filter(item => !unprocessed || (!item.tmdbId && !item.tmdbCheckedAt && item.status !== "complete"))
    .filter(item => args.has("--all") || item.status !== "complete");
  const items = candidates.slice(offset, offset + limit);
  let cursor = 0;
  let completed = 0;
  const results = new Map();
  const worker = async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      try {
        const result = await refreshItem(item);
        results.set(item.imdbCode, result);
        console.log(JSON.stringify({ progress: (++completed) + "/" + items.length, id: item.imdbCode, title: item.title, state: result.status, tmdbId: result.tmdbId, images: result.images, missingImages: result.missingImages }));
      } catch (error) {
        const retryable = error?.status === 429 || /HTTP 429/.test(error instanceof Error ? error.message : String(error));
        const result = {
          ...item,
          ...(retryable ? {} : { tmdbCheckedAt: new Date().toISOString() }),
          refreshFailedAt: new Date().toISOString(),
          ...(retryable ? { tmdbRetryable: true } : {}),
          error: error instanceof Error ? error.message : String(error),
        };
        results.set(item.imdbCode, result);
        console.error(JSON.stringify({ progress: (++completed) + "/" + items.length, id: item.imdbCode, title: item.title, state: retryable ? "retryable" : "unavailable", error: result.error }));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  report.checkedAt = new Date().toISOString();
  report.source = "TVMaze + TMDB public episode stills keyed by IMDb ID";
  report.items = report.items.map(item => results.get(item.imdbCode) || item);
  report.totals = {
    ...report.totals,
    checked: report.items.filter(item => ["complete", "partial", "unavailable"].includes(item.status)).length,
    complete: report.items.filter(item => item.status === "complete").length,
    partial: report.items.filter(item => item.status === "partial").length,
    unavailable: report.items.filter(item => item.status === "unavailable").length,
    pending: report.items.filter(item => item.status === "pending").length,
    missingImages: report.items.reduce((sum, item) => sum + (item.missingImages || 0), 0),
    duplicateImages: report.items.reduce((sum, item) => sum + (item.duplicateImages || 0), 0),
  };
  await writeJsonAtomic(REPORT_FILE, report);
  console.log(JSON.stringify({ processed: items.length, totals: report.totals }, null, 2));
}

export { episodeImages, pageTitle, seasonNumbers, tvCandidates };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
