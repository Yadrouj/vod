import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fetchTheTvdbEpisodeArtwork, materializeEpisodeArtwork, mergeTheTvdbEpisodeArtwork } from "../lib/episode-metadata.ts";
import { writeJsonAtomic } from "./atomic-json.mjs";

const ROOT = process.cwd();
const DIRECTORY = path.join(ROOT, "public", "data", "episode-metadata");
const NO_MATCH_FILE = path.join(ROOT, ".media-cache", "episode-artwork-no-match.json");
const args = new Set(process.argv.slice(2));
const concurrency = Math.min(12, Math.max(1, numberArg("--concurrency", 6)));
const limit = Math.max(1, numberArg("--limit", Number.POSITIVE_INFINITY));
const requested = new Set(process.argv.filter(value => value.startsWith("--id=")).map(value => value.slice(5)).filter(value => /^tt\d+$/.test(value)));
const deadline = Number(process.env.MAINTENANCE_DEADLINE || Number.POSITIVE_INFINITY);

function numberArg(name, fallback) {
  const raw = process.argv.find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
  const value = Number(raw);
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

async function readSnapshot(file) {
  try { return JSON.parse(await readFile(file, "utf8")); } catch { return null; }
}

async function readNoMatches() {
  try {
    const value = JSON.parse(await readFile(NO_MATCH_FILE, "utf8"));
    return new Set(Array.isArray(value) ? value.filter(id => /^tt\d+$/.test(id)) : []);
  } catch { return new Set(); }
}

function missingRows(snapshot) {
  return (snapshot?.episodes || []).filter(row => row.imageSource === "fallback" || !row.imageUrl).length;
}

async function main() {
  const files = (await readdir(DIRECTORY)).filter(file => /^tt\d+\.json$/.test(file));
  const targets = [];
  const noMatches = await readNoMatches();
  const retryNoMatches = args.has("--retry-no-match") || requested.size > 0;
  let skippedWithoutTitle = 0;
  let skippedNoMatch = 0;
  for (const file of files) {
    const id = file.slice(0, -5);
    if (requested.size && !requested.has(id)) continue;
    if (!retryNoMatches && noMatches.has(id)) { skippedNoMatch += 1; continue; }
    const snapshot = await readSnapshot(path.join(DIRECTORY, file));
    const missing = missingRows(snapshot);
    if (!missing) continue;
    if (typeof snapshot?.seriesTitle !== "string" || !snapshot.seriesTitle.trim()) {
      skippedWithoutTitle += 1;
      continue;
    }
    let titleData = {};
    try { titleData = JSON.parse(await readFile(path.join(ROOT, "public", "data", "titles", `${id}.json`), "utf8")); } catch { /* Snapshot title is enough. */ }
    targets.push({file, id, snapshot, missing, originalName: titleData.originalTitle || titleData.originalName || null});
  }
  targets.sort((left, right) => right.missing - left.missing || left.file.localeCompare(right.file));
  const selected = targets.slice(0, limit);
  const totals = { candidates: targets.length, selected: selected.length, processed: 0, updated: 0, replaced: 0, unchanged: 0, failed: 0, skippedWithoutTitle, skippedNoMatch };
  let cursor = 0;
  const worker = async () => {
    while (cursor < selected.length && Date.now() < deadline) {
      const target = selected[cursor++];
      try {
        const artwork = await fetchTheTvdbEpisodeArtwork({url: target.snapshot.sourceUrl, name: target.snapshot.seriesTitle, originalName: target.originalName});
        const repaired = materializeEpisodeArtwork(target.id, mergeTheTvdbEpisodeArtwork(target.snapshot.episodes, artwork));
        const replaced = repaired.filter((row, index) => row.imageUrl !== target.snapshot.episodes[index]?.imageUrl || row.imageSource !== target.snapshot.episodes[index]?.imageSource).length;
        if (replaced) {
          noMatches.delete(target.id);
          const checkedAt = new Date().toISOString();
          await writeJsonAtomic(path.join(DIRECTORY, target.file), {
            ...target.snapshot,
            checkedAt,
            episodeArtworkCheckedAt: checkedAt,
            episodeArtworkProvider: "thetvdb-public-screenshots",
            episodes: repaired,
          });
          totals.updated += 1;
          totals.replaced += replaced;
          console.log(JSON.stringify({id: target.id, title: target.snapshot.seriesTitle, state: "updated", replaced}));
        } else {
          noMatches.add(target.id);
          totals.unchanged += 1;
          console.log(JSON.stringify({id: target.id, title: target.snapshot.seriesTitle, state: "no-match", missing: target.missing}));
        }
      } catch (error) {
        totals.failed += 1;
        console.error(JSON.stringify({id: target.id, title: target.snapshot.seriesTitle, state: "failed", error: error instanceof Error ? error.message : String(error)}));
      } finally {
        totals.processed += 1;
        if (totals.processed % 10 === 0 || totals.processed === selected.length) {
          console.error(JSON.stringify({progress: `${totals.processed}/${selected.length}`, ...totals}));
        }
      }
    }
  };
  await Promise.all(Array.from({length: Math.min(concurrency, selected.length)}, worker));
  await writeJsonAtomic(NO_MATCH_FILE, [...noMatches].sort());
  console.log(JSON.stringify({...totals, remainingCandidates: Math.max(0, targets.length - totals.updated)}));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
