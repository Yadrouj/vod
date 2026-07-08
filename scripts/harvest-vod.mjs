import { execFile } from "node:child_process";
import { copyFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const SOURCE_URL =
  process.env.VOD_SOURCE_URL ||
  "https://dls2.aparatchi-dlcenter.top/DonyayeSerial/donyaye_serial_all_archive.html";
const HAS_TMDB_KEY = Boolean(process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY);

async function run(label, args) {
  console.log(`\n== ${label} ==`);
  const { stdout, stderr } = await execFileP(process.execPath, args, {
    maxBuffer: 128 * 1024 * 1024,
    env: process.env,
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
}

async function main() {
  await run("Scrape DonyayeSerial archive", [
    "scripts/scrape-vod-archive.mjs",
    SOURCE_URL,
    "public/data/vod-archive.json",
  ]);

  await run("Match official IMDb datasets", [
    "scripts/enrich-vod-imdb.mjs",
    "public/data/vod-archive.json",
    "public/data/vod-archive-imdb.json",
  ]);

  if (HAS_TMDB_KEY) {
    await run("Attach posters, backdrops and visual metadata", [
      "scripts/enrich-vod-images.mjs",
      "public/data/vod-archive-imdb.json",
      "public/data/vod-catalog.json",
    ]);
  } else {
    await copyFile("public/data/vod-archive-imdb.json", "public/data/vod-catalog.json");
    console.log(
      "\n== Image enrichment skipped ==\nMissing TMDB_API_KEY. Built public/data/vod-catalog.json from IMDb text data only."
    );
  }

  console.log("\nDone. The site reads public/data/vod-catalog.json.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
