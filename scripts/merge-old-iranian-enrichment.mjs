import { createWriteStream } from "node:fs";
import { once } from "node:events";
import { mkdir, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";

const IN_FILE = process.argv[2] || path.join("public", "data", "vod-catalog.json");
const ENRICHMENT_FILE = process.argv[3] || path.join(".media-cache", "vod-sync", "old-iranian-wikidata.json");
const OUT_FILE = process.argv[4] || path.join(".media-cache", "vod-sync", "vod-catalog-old-iranian-enriched.json");

async function main() {
  const enrichment = JSON.parse(await readFile(ENRICHMENT_FILE, "utf8"));
  const byId = new Map((enrichment.items ?? []).filter((item) => item.status === "matched").map((item) => [item.id, item]));
  const output = `${OUT_FILE}.tmp-${process.pid}`;
  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  const stream = createWriteStream(output, { encoding: "utf8" });
  const stats = { scanned: 0, enriched: 0, posters: 0, backdrops: 0, casts: 0, castImages: 0 };
  const write = async (value) => {
    if (!stream.write(value, "utf8")) await once(stream, "drain");
  };
  let first = true;
  let metadata = null;

  try {
    metadata = await streamVodArchiveItems(IN_FILE, async (item) => {
      stats.scanned += 1;
      const extra = byId.get(item.id);
      const merged = extra ? merge(item, extra) : item;
      if (extra) {
        stats.enriched += 1;
        if (merged.posterUrl) stats.posters += 1;
        if (merged.backdropUrl) stats.backdrops += 1;
        if (merged.credits?.length) stats.casts += 1;
        if (merged.credits?.some((credit) => credit.name_image_url)) stats.castImages += 1;
      }
      await write(`${first ? "" : ","}${JSON.stringify(merged)}`);
      first = false;
    }, {
      onMetadata: async (header) => {
        const { items: _items, ...rest } = header;
        await write(`${JSON.stringify({
          ...rest,
          oldIranianMetadataEnrichedAt: new Date().toISOString(),
          oldIranianMetadataProvider: "Wikidata + IMDb metadata service",
        }).slice(0, -1)},"items":[`);
      },
    });
    await write("]}");
    stream.end();
    await once(stream, "finish");
    await rename(output, OUT_FILE);
  } catch (error) {
    stream.destroy();
    await unlink(output).catch(() => undefined);
    throw error;
  }

  console.log(JSON.stringify({ inputFile: IN_FILE, enrichmentFile: ENRICHMENT_FILE, outFile: OUT_FILE, ...stats, totalTitles: metadata?.totalTitles ?? null }, null, 2));
}

function merge(item, extra) {
  const merged = { ...item };
  const scalarFields = [
    "title", "originalTitle", "persianTitle", "year", "releaseDate", "runtimeMinutes", "overview", "persianOverview",
    "imdbRating", "imdbVotes", "metascore", "certificate", "posterUrl", "backdropUrl", "imdbUrl", "apiFetchedAt",
    "wikidataId", "wikidataUrl", "imdbExternalCode", "metadataSources",
  ];
  for (const field of scalarFields) {
    if (extra[field] !== undefined && extra[field] !== null && extra[field] !== "") merged[field] = extra[field];
  }
  const listFields = ["genres", "persianGenres", "countries", "persianCountries", "languages", "persianLanguages", "imdbImages", "imdbVideos", "credits", "companies", "keywords"];
  for (const field of listFields) {
    if (Array.isArray(extra[field]) && extra[field].length) merged[field] = extra[field];
  }
  return merged;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
