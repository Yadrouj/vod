import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";

const IN_FILE = process.argv[2] || path.join("public", "data", "vod-catalog.json");
const OUT_DIR = process.argv[3] || path.join("public", "data", "titles");
const MAP_FILE = process.argv[4] || path.join("public", "data", "title-map.json");

async function main() {
  // Never empty the live title directory: requests can arrive during a daily
  // refresh. Unchanged files retain their timestamps and each change is atomic.
  await mkdir(OUT_DIR, { recursive: true });

  const map = {};
  let written = 0;
  let unchanged = 0;
  await streamVodArchiveItems(IN_FILE, async (item) => {
    const key = item.imdbCode || item.id;
    if (!key) return;
    if (/[\\/:\x00-\x1f]/.test(key) || key === "." || key === "..") throw new Error(`Invalid title file key: ${key}`);
    map[item.id.toLowerCase()] = key;
    map[key.toLowerCase()] = key;
    const file = path.join(OUT_DIR, `${key}.json`);
    const content = JSON.stringify(item);
    const previous = await readFile(file, "utf8").catch((error) => { if (error.code !== "ENOENT") throw error; return null; });
    if (previous === content) unchanged += 1;
    else { await writeAtomic(file, content); written += 1; }
  });

  await writeAtomic(MAP_FILE, JSON.stringify(map));
  console.log(JSON.stringify({ outDir: OUT_DIR, mapFile: MAP_FILE, written, unchanged }, null, 2));
}

async function writeAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  await writeFile(temporary, value);
  await rename(temporary, file);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
