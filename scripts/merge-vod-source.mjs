import { readFile, writeFile } from "node:fs/promises";

const EXISTING_FILE = process.argv[2] || "public/data/vod-catalog.json";
const SOURCE_FILE = process.argv[3] || "public/data/vod-source-current.json";
const OUT_FILE = process.argv[4] || EXISTING_FILE;

function mergeItem(existing, source) {
  if (!existing) return source;

  const sourceHasMoreLinks = (source.links?.length ?? 0) > (existing.links?.length ?? 0);
  return {
    ...source,
    ...existing,
    type: existing.type || source.type,
    year: existing.year ?? source.year ?? null,
    imdbVotes: existing.imdbVotes ?? source.imdbVotes ?? null,
    imdbRating: existing.imdbRating ?? source.imdbRating ?? null,
    links: sourceHasMoreLinks ? source.links : existing.links,
    groups: sourceHasMoreLinks ? source.groups : existing.groups,
    qualities: sourceHasMoreLinks ? source.qualities : existing.qualities,
  };
}

async function main() {
  const existing = JSON.parse(await readFile(EXISTING_FILE, "utf8"));
  const source = JSON.parse(await readFile(SOURCE_FILE, "utf8"));
  const byCode = new Map(existing.items.map((item) => [item.imdbCode || item.id, item]));
  let added = 0;
  let updated = 0;

  for (const item of source.items) {
    const key = item.imdbCode || item.id;
    if (!key) continue;
    const old = byCode.get(key);
    if (old) {
      const merged = mergeItem(old, item);
      if ((merged.links?.length ?? 0) !== (old.links?.length ?? 0)) updated += 1;
      byCode.set(key, merged);
    } else {
      byCode.set(key, item);
      added += 1;
    }
  }

  const items = Array.from(byCode.values()).sort(
    (a, b) => (b.imdbVotes ?? 0) - (a.imdbVotes ?? 0) || a.title.localeCompare(b.title)
  );
  const payload = {
    ...existing,
    sourceUrl: existing.sourceUrl ?? source.sourceUrl,
    sourceUrls: Array.from(new Set([existing.sourceUrl, ...(existing.sourceUrls ?? []), source.sourceUrl].filter(Boolean))),
    mergedAt: new Date().toISOString(),
    totalTitles: items.length,
    totalLinks: items.reduce((sum, item) => sum + (item.links?.length ?? 0), 0),
    items,
  };

  await writeFile(OUT_FILE, JSON.stringify(payload));
  console.log(JSON.stringify({ outFile: OUT_FILE, added, updated, totalTitles: payload.totalTitles, totalLinks: payload.totalLinks }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
