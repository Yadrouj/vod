// Mirrors every trusted TVMaze/TMDB episode still into the local image store,
// so /api/episode-image serves them without visitors reaching an upstream CDN.
// Resumable: stills already in the store are skipped.
//
//   node scripts/cache-episode-images.mjs [--only=tt0903747] [--limit=50] [--concurrency=4] [--delay-ms=150]
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import {
  episodeImageDir,
  episodeImageFile,
  isStorableEpisodeImage,
  readSavedEpisodeSnapshot,
  storeEpisodeImage,
} from "../lib/episode-metadata.ts";

const ROOT = process.cwd();
const SNAPSHOT_DIRS = [path.join(ROOT, "public", "data", "episode-metadata"), path.join(ROOT, ".media-cache", "episode-metadata")];
const only = process.argv.find((value) => value.startsWith("--only="))?.slice("--only=".length);
const limit = Math.max(0, numberArg("--limit", 0));
const concurrency = Math.min(8, Math.max(1, numberArg("--concurrency", 4)));
const delayMs = Math.max(0, numberArg("--delay-ms", 150));
const deadline = Number(process.env.MAINTENANCE_DEADLINE || Number.POSITIVE_INFINITY);
const storeDir = episodeImageDir(ROOT);
const statTimeoutMs = 2_000;

function numberArg(name, fallback) {
  const raw = process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
  const value = Number(raw);
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function exists(file) {
  let watchdog;
  try {
    return await Promise.race([
      stat(file).then((info) => info.size > 0, () => false),
      new Promise((resolve) => {
        watchdog = setTimeout(() => resolve(false), statTimeoutMs);
      }),
    ]);
  } finally {
    if (watchdog) clearTimeout(watchdog);
  }
}

async function seriesIds() {
  if (only) return /^tt\d+$/.test(only) ? [only] : [];
  const ids = new Set();
  for (const dir of SNAPSHOT_DIRS) {
    const names = await readdir(dir).catch(() => []);
    for (const name of names) {
      const match = /^(tt\d+)\.json$/.exec(name);
      if (match) ids.add(match[1]);
    }
  }
  const sorted = [...ids].sort();
  return limit ? sorted.slice(0, limit) : sorted;
}

async function collectJobs(ids) {
  const jobs = [];
  for (const id of ids) {
    const snapshot = await readSavedEpisodeSnapshot(id, ROOT);
    const seen = new Set();
    for (const row of snapshot?.episodes ?? []) {
      const key = `${row.season}:${row.episode}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (row.imageSource === "fallback" || !isStorableEpisodeImage(row.imageUrl)) continue;
      const file = episodeImageFile(storeDir, id, row.season, row.episode);
      if (file) jobs.push({ id, season: row.season, episode: row.episode, url: row.imageUrl, file });
    }
  }
  return jobs;
}

async function main() {
  const ids = await seriesIds();
  const jobs = await collectJobs(ids);
  const totals = { series: ids.length, images: jobs.length, stored: 0, skipped: 0, failed: 0, stoppedAtDeadline: false };
  console.log(JSON.stringify({ event: "start", storeDir, concurrency, delayMs, ...totals }));
  let next = 0;
  let processed = 0;
  const failures = [];

  async function worker() {
    while (next < jobs.length) {
      if (Date.now() > deadline) {
        totals.stoppedAtDeadline = true;
        return;
      }
      const job = jobs[next++];
      if (await exists(job.file)) {
        totals.skipped++;
      } else {
        const bytes = await storeEpisodeImage(job.url, job.file);
        if (bytes) totals.stored++;
        else {
          totals.failed++;
          if (failures.length < 20) failures.push(`${job.id} S${job.season}E${job.episode}`);
        }
        if (delayMs) await sleep(delayMs);
      }
      processed++;
      if (processed % 1000 === 0) console.log(JSON.stringify({ progress: `${processed}/${jobs.length}`, ...totals }));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(JSON.stringify({ event: "done", processed, ...totals, sampleFailures: failures }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
