import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { splitF2myBase } from "./f2my-series-lib.mjs";

const execFileAsync = promisify(execFile);
const SOURCE_FILE = path.join(".media-cache", "vod-sync", "f2my-source.json");
const CACHE_FILE = path.join(".media-cache", "f2my-catalog", "details.json");
const REGISTRY_FILE = path.join("data", "source-link-registry.json");
const CATALOG_FILE = path.join("public", "data", "vod-catalog.json");
const REPORT_FILE = path.join(".media-cache", "vod-sync", "f2my-merge-report.json");
const noBuild = process.argv.includes("--no-build");

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await rename(temporary, file);
      return;
    } catch (error) {
      if (attempt === 20) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 35));
    }
  }
}

function repairLink(link) {
  if (link?.sourceProvider !== "f2my") return link;
  const originalUrl = link.sourceOriginalUrl || link.url;
  const decoded = decodeURIComponentSafe(String(originalUrl || ""));
  if ((decoded.match(/(?:https?|ftp):\/\//gi) || []).length !== 1) return null;
  const source = splitF2myBase(originalUrl);
  if (!source) return null;
  return {
    ...link,
    url: originalUrl,
    sourceBaseId: source.id,
    sourceRelativePath: source.relativePath,
    sourceOriginalUrl: originalUrl,
  };
}

function repairItem(item, bases, counters) {
  const repairCollection = (links = []) => links.flatMap((link) => {
    const repaired = repairLink(link);
    if (link?.sourceProvider === "f2my" && !repaired) {
      counters.invalidLinksRemoved += 1;
      return [];
    }
    if (repaired?.sourceProvider === "f2my") {
      const base = splitF2myBase(repaired.sourceOriginalUrl || repaired.url);
      if (base) bases.set(base.id, base);
      if (repaired.sourceBaseId !== link.sourceBaseId || repaired.sourceRelativePath !== link.sourceRelativePath) counters.rebasedLinks += 1;
    }
    return repaired ? [repaired] : [];
  });

  return {
    ...item,
    links: repairCollection(item.links),
    f2myExtraLinks: repairCollection(item.f2myExtraLinks),
  };
}

async function updateRegistry(bases) {
  const current = await readJson(REGISTRY_FILE, { version: 1, updatedAt: null, bases: {} });
  const now = new Date().toISOString();
  const nextBases = {};
  for (const base of bases.values()) {
    const existing = current.bases?.[base.id];
    nextBases[base.id] = {
      id: base.id,
      provider: "f2my",
      label: `F2MY ${base.host}`,
      baseUrl: existing?.manual ? existing.baseUrl : base.baseUrl,
      aliases: unique([...(existing?.aliases ?? []), existing?.baseUrl, base.baseUrl]),
      manual: Boolean(existing?.manual),
      discoveredAt: existing?.discoveredAt ?? now,
      lastSeenAt: now,
      updatedAt: existing?.manual ? existing.updatedAt ?? now : now,
    };
  }
  for (const base of Object.values(current.bases ?? {})) {
    if (base.provider === "f2my" && base.manual && !nextBases[base.id]) nextBases[base.id] = base;
    if (base.provider !== "f2my") nextBases[base.id] = base;
  }
  await writeAtomic(REGISTRY_FILE, { version: 1, updatedAt: now, bases: nextBases });
  return Object.keys(nextBases).filter((id) => nextBases[id].provider === "f2my").length;
}

async function run(commandArgs) {
  await execFileAsync(process.execPath, commandArgs, { windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
}

async function main() {
  const counters = { rebasedLinks: 0, invalidLinksRemoved: 0 };
  const bases = new Map();
  const source = await readJson(SOURCE_FILE, null);
  if (!source?.items?.length) throw new Error(`No F2MY source file found at ${SOURCE_FILE}. Run scrape-f2my first.`);
  source.items = source.items.map((item) => repairItem(item, bases, counters));
  source.rebasedAt = new Date().toISOString();
  await writeAtomic(SOURCE_FILE, source);

  const cache = await readJson(CACHE_FILE, null);
  if (cache?.entries) {
    for (const record of Object.values(cache.entries)) {
      if (record?.item) record.item = repairItem(record.item, bases, counters);
    }
    cache.rebasedAt = new Date().toISOString();
    await writeAtomic(CACHE_FILE, cache);
  }

  const baseMappings = await updateRegistry(bases);
  await run(["scripts/merge-f2my-source.mjs", CATALOG_FILE, SOURCE_FILE, CATALOG_FILE, REPORT_FILE]);
  if (!noBuild) {
    await run(["scripts/build-vod-title-files.mjs", CATALOG_FILE]);
    await run(["scripts/build-vod-index.mjs", CATALOG_FILE]);
  }

  console.log(JSON.stringify({
    sourceItems: source.items.length,
    baseMappings,
    ...counters,
    rebuilt: !noBuild,
  }, null, 2));
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
