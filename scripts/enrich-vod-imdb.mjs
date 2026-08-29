import { createGunzip } from "node:zlib";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { once } from "node:events";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";

const DATASETS = {
  basics: "https://datasets.imdbws.com/title.basics.tsv.gz",
  ratings: "https://datasets.imdbws.com/title.ratings.tsv.gz",
};

const IN_FILE = process.argv[2] || path.join("public", "data", "vod-archive.json");
const OUT_FILE =
  process.argv[3] || path.join("public", "data", "vod-archive-imdb.json");
const CACHE_DIR = path.join(".media-cache", "imdb");
const DATASET_MAX_AGE_MS =
  Math.max(1, Number(process.env.IMDB_DATASET_MAX_AGE_HOURS || 30)) * 60 * 60 * 1000;

function clean(value) {
  return value && value !== "\\N" ? value : null;
}

function splitList(value) {
  const cleaned = clean(value);
  return cleaned ? cleaned.split(",").filter(Boolean) : [];
}

function toNumber(value) {
  const cleaned = clean(value);
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function download(url, dest) {
  await mkdir(path.dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download ${url}: ${res.status}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function ensureDataset(name, url) {
  const dest = path.join(CACHE_DIR, `${name}.tsv.gz`);
  let cached = null;
  try {
    cached = await stat(dest);
    if (cached.size > 0 && Date.now() - cached.mtimeMs <= DATASET_MAX_AGE_MS) return dest;
  } catch {
    /* cache miss */
  }

  const temporary = `${dest}.tmp-${process.pid}`;
  console.log(`Refreshing ${name}...`);
  try {
    await download(url, temporary);
    await rename(temporary, dest);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    if (cached?.size > 0) {
      console.warn(`Could not refresh ${name}; using the previous verified dataset.`);
      return dest;
    }
    throw error;
  }
  return dest;
}

async function readWantedRows(gzFile, wantedIds, parseRow) {
  const rows = new Map();
  const rl = readline.createInterface({
    input: createReadStream(gzFile).pipe(createGunzip()),
    crlfDelay: Infinity,
  });

  let headers = null;
  for await (const line of rl) {
    if (!headers) {
      headers = line.split("\t");
      continue;
    }
    const cols = line.split("\t");
    const id = cols[0];
    if (!wantedIds.has(id)) continue;
    rows.set(id, parseRow(headers, cols));
    if (rows.size === wantedIds.size) {
      rl.close();
      break;
    }
  }
  return rows;
}

function parseBasics(headers, cols) {
  const row = Object.fromEntries(headers.map((key, index) => [key, cols[index] ?? ""]));
  return {
    titleType: clean(row.titleType),
    primaryTitle: clean(row.primaryTitle),
    originalTitle: clean(row.originalTitle),
    isAdult: row.isAdult === "1",
    startYear: toNumber(row.startYear),
    endYear: toNumber(row.endYear),
    runtimeMinutes: toNumber(row.runtimeMinutes),
    genres: splitList(row.genres),
  };
}

function parseRatings(headers, cols) {
  const row = Object.fromEntries(headers.map((key, index) => [key, cols[index] ?? ""]));
  return {
    averageRating: toNumber(row.averageRating),
    numVotes: toNumber(row.numVotes),
  };
}

async function main() {
  const wantedIds = new Set();
  let sourceTitles = 0;
  await streamVodArchiveItems(IN_FILE, async (item) => {
    sourceTitles += 1;
    if (/^tt\d+$/.test(item.imdbCode ?? "")) wantedIds.add(item.imdbCode);
  });

  const basicsFile = await ensureDataset("title.basics", DATASETS.basics);
  const ratingsFile = await ensureDataset("title.ratings", DATASETS.ratings);

  console.log(`Matching ${wantedIds.size.toLocaleString()} IMDb ids...`);
  const [basics, ratings] = await Promise.all([
    readWantedRows(basicsFile, wantedIds, parseBasics),
    readWantedRows(ratingsFile, wantedIds, parseRatings),
  ]);

  await writeEnrichedArchive(basics, ratings);
  console.log(
    JSON.stringify(
      {
        outFile: OUT_FILE,
        sourceTitles,
        imdbMatchedTitles: basics.size,
        imdbMatchedRatings: ratings.size,
      },
      null,
      2
    )
  );
}

function enrichItem(item, basics, ratings) {
  const imdbBasics = basics.get(item.imdbCode) ?? null;
  const imdbRatings = ratings.get(item.imdbCode) ?? null;
  const imdb = imdbBasics || imdbRatings ? { ...imdbBasics, ...imdbRatings } : null;
  return {
    ...item,
    title: imdbBasics?.primaryTitle ?? item.title,
    type: imdbBasics?.titleType ?? item.type,
    year: imdbBasics?.startYear ?? item.year,
    imdbVotes: imdbRatings?.numVotes ?? item.imdbVotes,
    imdbRating: imdbRatings?.averageRating ?? item.imdbRating,
    imdb,
    genres: imdbBasics?.genres ?? item.genres ?? [],
    runtimeMinutes: imdbBasics?.runtimeMinutes ?? item.runtimeMinutes ?? null,
    originalTitle: imdbBasics?.originalTitle ?? item.originalTitle ?? null,
    endYear: imdbBasics?.endYear ?? item.endYear ?? null,
  };
}

async function writeEnrichedArchive(basics, ratings) {
  const temporary = `${OUT_FILE}.tmp-${process.pid}`;
  await mkdir(path.dirname(temporary), { recursive: true });
  const output = createWriteStream(temporary, { encoding: "utf8" });
  let first = true;
  const write = async (value) => {
    if (output.write(value)) return;
    await once(output, "drain");
  };
  try {
    await streamVodArchiveItems(
      IN_FILE,
      async (item) => {
        await write(`${first ? "" : ","}${JSON.stringify(enrichItem(item, basics, ratings))}`);
        first = false;
      },
      {
        onMetadata: async (metadata) => {
          const header = JSON.stringify({
            ...metadata,
            enrichedAt: new Date().toISOString(),
            imdbDatasetSource: "https://developer.imdb.com/non-commercial-datasets/",
            imdbMatchedTitles: basics.size,
            imdbMatchedRatings: ratings.size,
          });
          await write(`${header.slice(0, -1)},"items":[`);
        },
      },
    );
    await write("]}");
    await new Promise((resolve, reject) => {
      output.once("error", reject);
      output.end(resolve);
    });
    await rename(temporary, OUT_FILE);
  } catch (error) {
    output.destroy();
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
