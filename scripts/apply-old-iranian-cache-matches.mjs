import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const valueOf = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const INPUT_FILE = valueOf("--input", path.join(".media-cache", "vod-sync", "old-iranian-metadata-final.json"));
const CACHE_FILE = valueOf("--cache", path.join(".media-cache", "vod-sync", "old-iranian-wikidata-cache.json"));
const OUT_FILE = valueOf("--out", path.join(".media-cache", "vod-sync", "old-iranian-metadata-final-merged.json"));
const IDS = new Set(valueOf("--ids", "").split(",").map((value) => value.trim()).filter(Boolean));

async function main() {
  const [baseline, cache] = await Promise.all([readJson(INPUT_FILE), readJson(CACHE_FILE)]);
  const replacements = new Map(
    Object.values(cache.entries ?? {})
      .filter((entry) => entry?.status === "matched")
      .filter((entry) => !IDS.size || IDS.has(entry.id))
      .map((entry) => [entry.id, entry]),
  );

  const applied = [];
  const items = (baseline.items ?? []).map((item) => {
    const replacement = replacements.get(item.id);
    if (!replacement || item.status === "matched") return item;
    applied.push(item.id);
    return replacement;
  });
  const matched = items.filter((item) => item.status === "matched");
  const payload = {
    ...baseline,
    generatedAt: new Date().toISOString(),
    cacheMatchesApplied: applied.length,
    cacheMatchIds: applied,
    matchedTitles: matched.length,
    unmatchedTitles: items.filter((item) => item.status === "unmatched").length,
    failedTitles: items.filter((item) => item.status === "error").length,
    titlesWithPoster: matched.filter((item) => item.posterUrl).length,
    titlesWithBackdrop: matched.filter((item) => item.backdropUrl).length,
    titlesWithCast: matched.filter((item) => item.credits?.length).length,
    titlesWithCastImages: matched.filter((item) => item.credits?.some((credit) => credit.name_image_url)).length,
    titlesWithImdb: matched.filter((item) => item.imdbUrl).length,
    items,
  };
  await save(OUT_FILE, payload);
  console.log(JSON.stringify({ outFile: OUT_FILE, applied, matchedTitles: payload.matchedTitles, unmatchedTitles: payload.unmatchedTitles }, null, 2));
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function save(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

await main();
