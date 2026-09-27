import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { materializeEpisodeArtwork } from "../lib/episode-metadata.ts";
import { writeJsonAtomic } from "./atomic-json.mjs";

const ROOT = process.cwd();
const DIRECTORY = path.join(ROOT, "public", "data", "episode-metadata");
const args = new Set(process.argv.slice(2));
const limitValue = Number(process.argv.find((value) => value.startsWith("--limit="))?.slice(8));
const limit = Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : Number.POSITIVE_INFINITY;

function changed(before, after) {
  return before.length !== after.length || after.some((episode, index) => {
    const previous = before[index];
    return !previous || episode.season !== previous.season || episode.episode !== previous.episode ||
      episode.imageUrl !== previous.imageUrl || episode.imageSource !== previous.imageSource || episode.imageFit !== previous.imageFit;
  });
}

async function readSnapshot(file) {
  try {
    return JSON.parse((await readFile(file, "utf8")).replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

async function main() {
  const files = (await readdir(DIRECTORY)).filter((file) => /^tt\d+\.json$/.test(file)).sort();
  const totals = { scanned: files.length, selected: 0, updated: 0, unchanged: 0, invalid: 0 };

  for (const file of files) {
    if (totals.selected >= limit) break;
    const id = file.slice(0, -5);
    const snapshot = await readSnapshot(path.join(DIRECTORY, file));
    if (!snapshot || !Array.isArray(snapshot.episodes) || !snapshot.episodes.length) {
      totals.invalid += 1;
      continue;
    }
    totals.selected += 1;
    const episodes = materializeEpisodeArtwork(id, snapshot.episodes);
    if (!changed(snapshot.episodes, episodes)) {
      totals.unchanged += 1;
      continue;
    }
    const checkedAt = new Date().toISOString();
    await writeJsonAtomic(path.join(DIRECTORY, file), {
      ...snapshot,
      checkedAt,
      episodeArtworkNormalizedAt: checkedAt,
      episodes,
    });
    totals.updated += 1;
    console.log(JSON.stringify({ id, title: snapshot.seriesTitle || id, state: "normalized" }));
  }

  console.log(JSON.stringify({ ...totals, remaining: Math.max(0, files.length - totals.selected) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
