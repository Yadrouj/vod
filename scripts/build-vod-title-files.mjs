import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const IN_FILE = process.argv[2] || path.join("public", "data", "vod-catalog.json");
const OUT_DIR = process.argv[3] || path.join("public", "data", "titles");
const MAP_FILE = process.argv[4] || path.join("public", "data", "title-map.json");

async function main() {
  const archive = JSON.parse(await readFile(IN_FILE, "utf8"));
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const map = {};
  let written = 0;
  for (const item of archive.items) {
    const key = item.imdbCode || item.id;
    if (!key) continue;
    map[item.id.toLowerCase()] = key;
    map[key.toLowerCase()] = key;
    await writeFile(path.join(OUT_DIR, `${key}.json`), JSON.stringify(item));
    written += 1;
  }

  await writeFile(MAP_FILE, JSON.stringify(map));
  console.log(JSON.stringify({ outDir: OUT_DIR, mapFile: MAP_FILE, written }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
