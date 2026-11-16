import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";
import { scanVodIdentities } from './audit-vod-identities.mjs';
import { createVodIdentityRegistry, mergeVodDuplicateItems, vodIdentityId } from '../lib/vod-identity.mjs';

const IN_FILE = process.argv[2] || path.join("public", "data", "vod-catalog.json");
const OUT_DIR = process.argv[3] || path.join("public", "data", "titles");
const MAP_FILE = process.argv[4] || path.join("public", "data", "title-map.json");
const IDENTITIES_FILE = process.argv[5] || path.join(path.dirname(MAP_FILE), 'vod-identities.json');

async function main() {
  // Never empty the live title directory: requests can arrive during a daily
  // refresh. Unchanged files retain their timestamps and each change is atomic.
  await mkdir(OUT_DIR, { recursive: true });

  const map = {};
  let written = 0;
  let unchanged = 0;
  const previous = JSON.parse(await readFile(IDENTITIES_FILE, 'utf8').catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return readFile(new URL('../lib/data/vod-duplicate-groups.json', import.meta.url), 'utf8');
  }));
  const manifest = await scanVodIdentities(IN_FILE, previous);
  const registry = createVodIdentityRegistry(manifest);
  const pending = new Map();
  const publish = async (key, item) => {
    const file = path.join(OUT_DIR, `${key}.json`);
    const content = JSON.stringify(item);
    const previous = await readFile(file, "utf8").catch((error) => { if (error.code !== "ENOENT") throw error; return null; });
    if (previous === content) unchanged += 1;
    else { await writeAtomic(file, content); written += 1; }
  };
  await streamVodArchiveItems(IN_FILE, async (item) => {
    const identity = vodIdentityId(item);
    const key = registry.canonicalId(identity);
    if (!key) return;
    if (/[\\/:\x00-\x1f]/.test(key) || key === "." || key === "..") throw new Error(`Invalid title file key: ${key}`);
    if (item.id) map[item.id.toLowerCase()] = key;
    map[identity] = key;
    map[key.toLowerCase()] = key;
    const group = registry.group(identity);
    if (group) {
      const existing = pending.get(key);
      const merged = !existing ? item : identity === key ? mergeVodDuplicateItems(item, existing) : mergeVodDuplicateItems(existing, item);
      pending.set(key, merged);
    } else await publish(key, item);
  });
  for (const [key, item] of pending) await publish(key, { ...item, id: key, imdbCode: key });

  await writeAtomic(IDENTITIES_FILE, JSON.stringify(manifest));
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
