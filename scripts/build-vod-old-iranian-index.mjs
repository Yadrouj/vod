import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const INPUT_FILE = path.join(DATA_DIR, "vod-index.json");
const OUTPUT_FILE = path.join(DATA_DIR, "vod-old-iranian.json");

/** Build the small browse payload used by the Old Iranian Films collection. */
export function buildOldIranianVodIndex(index) {
  const items = (index.items ?? [])
    .filter((item) => item.source === "old-iranian-archive")
    .sort(yearSort);
  return {
    sourceUrl: index.sourceUrl,
    totalTitles: items.length,
    totalLinks: items.reduce((total, item) => total + (item.linksCount ?? 0), 0),
    generatedAt: index.generatedAt,
    filters: makeFilters(items),
    sections: [{
      id: "old-iranian-films",
      title: "Old Iranian Films",
      subtitle: "Classic Iranian cinema collected from the old-film archive",
      total: items.length,
      items: items.slice(0, 15),
    }],
    items,
  };
}

function makeFilters(items) {
  return {
    genres: uniqueSorted(items.flatMap((item) => item.genres ?? [])),
    countries: uniqueSorted(items.flatMap((item) => item.countries ?? [])),
    languages: uniqueSorted(items.flatMap((item) => item.languages ?? [])),
    years: uniqueSorted(items.map((item) => String(item.year ?? "")).filter(Boolean)).sort((left, right) => Number(right) - Number(left)),
    qualities: uniqueSorted(items.flatMap((item) => item.qualities ?? [])).sort((left, right) => Number.parseInt(right, 10) - Number.parseInt(left, 10) || left.localeCompare(right)),
    groups: [],
  };
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => String(left).localeCompare(String(right), "fa"));
}

function yearSort(left, right) {
  return (right.year ?? 0) - (left.year ?? 0) || (right.imdbRating ?? 0) - (left.imdbRating ?? 0) || String(left.id).localeCompare(String(right.id));
}

async function main() {
  const index = JSON.parse(await readFile(INPUT_FILE, "utf8"));
  const oldIranian = buildOldIranianVodIndex(index);
  await writeFile(OUTPUT_FILE, JSON.stringify(oldIranian));
  console.log(JSON.stringify({ titles: oldIranian.totalTitles, bytes: Buffer.byteLength(JSON.stringify(oldIranian)), output: OUTPUT_FILE }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
