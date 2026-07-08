import { createGunzip } from "node:zlib";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const DATASETS = {
  basics: "https://datasets.imdbws.com/title.basics.tsv.gz",
  ratings: "https://datasets.imdbws.com/title.ratings.tsv.gz",
};

const IN_FILE = process.argv[2] || path.join("public", "data", "vod-archive.json");
const OUT_FILE =
  process.argv[3] || path.join("public", "data", "vod-archive-imdb.json");
const CACHE_DIR = path.join(".media-cache", "imdb");

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
  try {
    const { stat } = await import("node:fs/promises");
    const file = await stat(dest);
    if (file.size > 0) return dest;
  } catch {
    /* cache miss */
  }
  console.log(`Downloading ${name}...`);
  await download(url, dest);
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
  const archive = JSON.parse(await readFile(IN_FILE, "utf8"));
  const wantedIds = new Set(
    archive.items.map((item) => item.imdbCode).filter((id) => /^tt\d+$/.test(id))
  );

  const basicsFile = await ensureDataset("title.basics", DATASETS.basics);
  const ratingsFile = await ensureDataset("title.ratings", DATASETS.ratings);

  console.log(`Matching ${wantedIds.size.toLocaleString()} IMDb ids...`);
  const [basics, ratings] = await Promise.all([
    readWantedRows(basicsFile, wantedIds, parseBasics),
    readWantedRows(ratingsFile, wantedIds, parseRatings),
  ]);

  const items = archive.items.map((item) => {
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
      genres: imdbBasics?.genres ?? [],
      runtimeMinutes: imdbBasics?.runtimeMinutes ?? null,
      originalTitle: imdbBasics?.originalTitle ?? null,
      endYear: imdbBasics?.endYear ?? null,
    };
  });

  const payload = {
    ...archive,
    enrichedAt: new Date().toISOString(),
    imdbDatasetSource: "https://developer.imdb.com/non-commercial-datasets/",
    imdbMatchedTitles: basics.size,
    imdbMatchedRatings: ratings.size,
    items,
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(payload));
  console.log(
    JSON.stringify(
      {
        outFile: OUT_FILE,
        sourceTitles: archive.items.length,
        imdbMatchedTitles: basics.size,
        imdbMatchedRatings: ratings.size,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
