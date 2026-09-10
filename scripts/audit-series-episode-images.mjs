import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseEpisodeMetadata } from "../lib/episode-metadata.ts";
import { writeJsonAtomic } from "./atomic-json.mjs";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";

const ROOT = process.cwd();
const CATALOG = process.argv.find((value) => value.endsWith(".json") && !value.includes("episode")) || path.join("public", "data", "vod-catalog.json");
const OUTPUT_DIR = path.join(ROOT, "public", "data", "episode-metadata");
const REPORT_FILE = path.join(OUTPUT_DIR, "index.json");
const args = new Set(process.argv.slice(2));
const all = args.has("--all");
const force = args.has("--force");
const resume = args.has("--resume");
const limit = all ? Number.POSITIVE_INFINITY : Math.max(1, numberArg("--limit", 50));
const concurrency = Math.min(12, Math.max(1, numberArg("--concurrency", 4)));
const timeoutMs = Math.min(30_000, Math.max(3_000, numberArg("--timeout-ms", 12_000)));
const deadline = Number(process.env.MAINTENANCE_DEADLINE || Number.POSITIVE_INFINITY);
const now = () => new Date().toISOString();

function numberArg(name, fallback) {
  const raw = process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
  const value = Number(raw);
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

function normalizeType(value) {
  const type = String(value ?? "").trim().toLowerCase();
  if (!type || /movie|film|short|documentary|video/i.test(type)) return "movie";
  return /series|episode|show|tvmini|tvspecial|tvepisode/i.test(type) ? "series" : "movie";
}

function compareSeries(a, b) {
  return (b.imdbRating ?? 0) - (a.imdbRating ?? 0) ||
    (b.imdbVotes ?? 0) - (a.imdbVotes ?? 0) ||
    String(a.title ?? "").localeCompare(String(b.title ?? "")) ||
    String(a.imdbCode ?? "").localeCompare(String(b.imdbCode ?? ""));
}

function compactSeries(item, rank) {
  return {
    rank,
    imdbCode: typeof item.imdbCode === "string" ? item.imdbCode : "",
    title: typeof item.title === "string" ? item.title : "Untitled series",
    imdbRating: Number.isFinite(Number(item.imdbRating)) ? Number(item.imdbRating) : null,
    imdbVotes: Number.isFinite(Number(item.imdbVotes)) ? Number(item.imdbVotes) : null,
    year: Number.isFinite(Number(item.year)) ? Number(item.year) : null,
    fallbackImage: typeof item.backdropUrl === "string" ? item.backdropUrl : typeof item.posterUrl === "string" ? item.posterUrl : null,
  };
}

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; }
}

function validSnapshot(snapshot) {
  return Boolean(snapshot && Array.isArray(snapshot.episodes) && snapshot.episodes.length);
}

function imageStats(episodes) {
  const images = episodes.filter((episode) => typeof episode.imageUrl === "string" && episode.imageUrl.length > 0);
  return {
    episodes: episodes.length,
    images: images.length,
    missingImages: episodes.length - images.length,
    distinctImages: new Set(images.map((episode) => episode.imageUrl)).size,
  };
}

function resultFromSnapshot(series, snapshot, status = "complete") {
  const stats = imageStats(snapshot.episodes);
  return { ...series, status: stats.missingImages ? "partial" : status, ...stats, checkedAt: snapshot.checkedAt ?? null, sourceUrl: snapshot.sourceUrl ?? "https://api.tvmaze.com" };
}

async function json(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json", "user-agent": "SarvNema episode-artwork-auditor/1.0" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function fetchEpisodes(series) {
  const show = await json(`https://api.tvmaze.com/lookup/shows?imdb=${encodeURIComponent(series.imdbCode)}`);
  if (!Number.isInteger(show?.id)) throw new Error("TVMaze show not found");
  const episodes = parseEpisodeMetadata(await json(`https://api.tvmaze.com/shows/${show.id}/episodes`));
  if (!episodes.length) throw new Error("No episodes returned");
  return { episodes, sourceUrl: `https://www.tvmaze.com/shows/${show.id}` };
}

async function main() {
  const series = [];
  await streamVodArchiveItems(path.resolve(ROOT, CATALOG), (item) => {
    if (normalizeType(item.type) === "series" && typeof item.imdbCode === "string") series.push(item);
  });
  series.sort(compareSeries);

  const report = await readJson(REPORT_FILE, { version: 1, items: [] });
  const previous = new Map((report.items ?? []).map((item) => [item.imdbCode, item]));
  const results = series.map((item, index) => {
    const base = compactSeries(item, index + 1);
    const prior = previous.get(base.imdbCode);
    return prior ? { ...prior, ...base } : { ...base, status: "pending", episodes: 0, images: 0, missingImages: 0, distinctImages: 0, checkedAt: null, sourceUrl: null };
  });
  const selected = results.slice(0, limit);
  const reportState = () => ({
    version: 1,
    checkedAt: now(),
    source: "TVMaze episode stills keyed by IMDb ID",
    sort: "IMDb rating descending, votes descending",
    catalog: path.relative(ROOT, path.resolve(ROOT, CATALOG)),
    totals: {
      series: results.length,
      selected: selected.length,
      checked: results.filter((item) => item.status === "complete" || item.status === "partial" || item.status === "unavailable").length,
      complete: results.filter((item) => item.status === "complete").length,
      partial: results.filter((item) => item.status === "partial").length,
      unavailable: results.filter((item) => item.status === "unavailable").length,
      unsupported: results.filter((item) => item.status === "unsupported").length,
      pending: results.filter((item) => item.status === "pending").length,
      missingImages: results.reduce((total, item) => total + (item.missingImages ?? 0), 0),
    },
    items: results,
  });
  await writeJsonAtomic(REPORT_FILE, reportState());

  let cursor = 0;
  let completed = 0;
  let lastReportWrite = 0;
  let reportWrite = Promise.resolve();
  const scheduleReportWrite = (immediate = false) => {
    if (!immediate && Date.now() - lastReportWrite < 2_000) return;
    lastReportWrite = Date.now();
    reportWrite = reportWrite.then(() => writeJsonAtomic(REPORT_FILE, reportState()));
  };
  const worker = async () => {
    while (cursor < selected.length && Date.now() < deadline) {
      const index = cursor++;
      const item = selected[index];
      if (!/^tt\d+$/.test(item.imdbCode)) {
        results[index] = { ...item, status: "unsupported", episodes: 0, images: 0, missingImages: 0, distinctImages: 0, checkedAt: now(), sourceUrl: null, error: "No IMDb ID; TVMaze lookup requires an IMDb ID" };
        completed += 1;
        console.log(JSON.stringify({ progress: `${completed}/${selected.length}`, rank: item.rank, id: item.imdbCode, title: item.title, state: "unsupported" }));
        scheduleReportWrite();
        continue;
      }
      const file = path.join(OUTPUT_DIR, `${item.imdbCode}.json`);
      const saved = await readJson(file, null);
      const age = saved?.checkedAt ? Date.now() - Date.parse(saved.checkedAt) : Number.POSITIVE_INFINITY;
      if (!force && validSnapshot(saved) && (resume || age < 7 * 86400_000)) {
        results[index] = resultFromSnapshot(item, saved);
        completed += 1;
        console.log(JSON.stringify({ progress: `${completed}/${selected.length}`, rank: item.rank, id: item.imdbCode, title: item.title, state: "cached", ...imageStats(saved.episodes) }));
        scheduleReportWrite();
        continue;
      }
      try {
        const fetched = await fetchEpisodes(item);
        const snapshot = { checkedAt: now(), sourceUrl: fetched.sourceUrl, imdbCode: item.imdbCode, seriesTitle: item.title, imdbRating: item.imdbRating, imdbVotes: item.imdbVotes, episodes: fetched.episodes };
        await writeJsonAtomic(file, snapshot);
        results[index] = resultFromSnapshot(item, snapshot);
        console.log(JSON.stringify({ progress: `${completed + 1}/${selected.length}`, rank: item.rank, id: item.imdbCode, title: item.title, state: results[index].status, ...imageStats(fetched.episodes) }));
      } catch (error) {
        results[index] = { ...item, status: "unavailable", episodes: 0, images: 0, missingImages: 0, distinctImages: 0, checkedAt: now(), sourceUrl: null, error: error instanceof Error ? error.message : String(error) };
        console.error(JSON.stringify({ progress: `${completed + 1}/${selected.length}`, rank: item.rank, id: item.imdbCode, title: item.title, state: "unavailable", error: results[index].error }));
      }
      completed += 1;
      scheduleReportWrite();
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, selected.length) }, worker));
  await reportWrite;
  await writeJsonAtomic(REPORT_FILE, reportState());
  const summary = reportState();
  console.log(JSON.stringify({ ...summary.totals, report: path.relative(ROOT, REPORT_FILE) }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
