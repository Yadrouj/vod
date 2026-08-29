import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import process from "node:process";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";

const ROOT = process.cwd();
const CATALOG = path.resolve(ROOT, process.argv[2] || "public/data/vod-catalog.json");
const SOURCE = path.resolve(ROOT, process.argv[3] || ".media-cache/vod-sync/curated-vod-source.json");
const OUTPUT = path.resolve(ROOT, process.argv[4] || "public/data/vod-catalog.json");
const REPORT = path.resolve(ROOT, process.argv[5] || ".media-cache/vod-sync/curated-vod-merge-report.json");
const now = new Date().toISOString();

const source = JSON.parse(await readFile(SOURCE, "utf8"));
const sourceItems = Array.isArray(source.items) ? source.items : [];
const sourceByKey = new Map(sourceItems.map((item) => [keyOf(item), item]).filter(([key]) => key));
const sourceByTitle = groupByTitle(sourceItems);
const stats = {
  existingTitlesEnriched: 0,
  newTitlesAdded: 0,
  downloadLinksAdded: 0,
  downloadLinksRefreshed: 0,
  sourcePagesAdded: 0,
};
const addedIds = [];
const updatedIds = [];
const consumed = new Set();
const appended = new Set();
const appendedSourceKeys = new Set();
let totalTitles = 0;
let totalLinks = 0;

// Pass one determines exact totals and the merge report without materialising the 500+ MB archive.
const metadata = await streamVodArchiveItems(CATALOG, async (existing) => {
  const incoming = incomingFor(existing);
  if (!incoming) {
    totalTitles += 1;
    totalLinks += existing.links?.length ?? 0;
    return;
  }
  for (const key of incoming.__sourceKeys ?? [keyOf(incoming)]) consumed.add(key);
  const changed = sourceChanged(existing, incoming);
  const merged = mergeExisting(existing, incoming, changed);
  totalTitles += 1;
  totalLinks += merged.links.length;
  stats.existingTitlesEnriched += 1;
  stats.downloadLinksAdded += Math.max(0, merged.links.length - (existing.links?.length ?? 0));
  stats.downloadLinksRefreshed += countRefreshed(existing.links ?? [], incoming.links ?? []);
  stats.sourcePagesAdded += Math.max(0, (merged.curatedSourcePages?.length ?? 0) - (existing.curatedSourcePages?.length ?? 0));
  if (changed) updatedIds.push(keyOf(existing));
});

for (const sourceItem of sourceItems) {
  const incoming = incomingGroupFor(sourceItem);
  if (!incoming || (incoming.__sourceKeys ?? []).every((key) => consumed.has(key) || appended.has(key))) continue;
  for (const key of incoming.__sourceKeys ?? [keyOf(incoming)]) {
    appended.add(key);
    appendedSourceKeys.add(key);
  }
  const item = normalizeNew(incoming);
  totalTitles += 1;
  totalLinks += item.links.length;
  addedIds.push(keyOf(item));
  stats.newTitlesAdded += 1;
  stats.downloadLinksAdded += item.links.length;
  stats.sourcePagesAdded += item.curatedSourcePages?.length ?? 0;
}

const nextMetadata = {
  ...metadata,
  sourceUrls: unique([...(metadata.sourceUrls ?? []), ...(source.sourceUrls ?? [])]),
  totalTitles,
  totalLinks,
  scrapedAt: now,
  updatedAt: now,
  curatedSourcesUpdatedAt: now,
  curatedSources: source.sourceUrls ?? [],
};

const temporary = `${OUTPUT}.tmp-${process.pid}`;
await mkdir(path.dirname(temporary), { recursive: true });
const output = createWriteStream(temporary, { encoding: "utf8" });
let first = true;
const write = async (value) => {
  if (output.write(value)) return;
  await once(output, "drain");
};
// Write the root object without its final brace, then open the streamed items array.
// Keeping this separate avoids materialising the (500+ MB) catalog in memory.
const metadataJson = JSON.stringify(nextMetadata);
await write(`${metadataJson.slice(0, -1)},\"items\":[`);

await streamVodArchiveItems(CATALOG, async (existing) => {
  const incoming = incomingFor(existing);
  const next = incoming ? mergeExisting(existing, incoming, sourceChanged(existing, incoming)) : existing;
  await write(`${first ? "" : ","}${JSON.stringify(next)}`);
  first = false;
});
for (const sourceItem of sourceItems) {
  const incoming = incomingGroupFor(sourceItem);
  if (!incoming || !(incoming.__sourceKeys ?? []).some((key) => appended.has(key))) continue;
  for (const key of incoming.__sourceKeys ?? []) appended.delete(key);
  await write(`${first ? "" : ","}${JSON.stringify(normalizeNew(incoming))}`);
  first = false;
}
await write("]}");
await new Promise((resolve, reject) => {
  output.once("error", reject);
  output.end(resolve);
});
await replaceFile(temporary, OUTPUT);

const report = {
  generatedAt: now,
  sourceTitles: sourceItems.length,
  resultTitles: totalTitles,
  resultLinks: totalLinks,
  added: addedIds.length,
  updated: updatedIds.length,
  unchanged: Math.max(0, sourceItems.length - consumed.size - appendedSourceKeys.size),
  addedIds,
  updatedIds,
  ...stats,
};
await writeJsonAtomic(REPORT, report);
console.log(JSON.stringify({ ...report, addedIds: undefined, updatedIds: undefined }, null, 2));

function incomingFor(item) {
  const keyed = sourceByKey.get(keyOf(item));
  const titled = sourceByTitle.get(titleKey(item)) ?? [];
  return mergeIncomingItems(uniqueItems([keyed, ...titled]));
}

function incomingGroupFor(item) {
  return mergeIncomingItems(sourceByTitle.get(titleKey(item)) ?? [item]);
}

function groupByTitle(items) {
  const groups = new Map();
  for (const item of items) {
    const key = titleKey(item);
    if (!key) continue;
    const values = groups.get(key) ?? [];
    values.push(item);
    groups.set(key, values);
  }
  return groups;
}

function uniqueItems(items) {
  const values = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (item && key) values.set(key, item);
  }
  return [...values.values()];
}

function mergeIncomingItems(items) {
  if (!items.length) return null;
  const primary = items.find((item) => /^tt\d+$/i.test(String(item.imdbCode ?? item.id ?? ""))) ?? items[0];
  const sourceUpdatedAt = items.reduce((latest, item) => newestDate(latest, item.sourceUpdatedAt), null);
  return {
    ...primary,
    links: mergeLinks([], items.flatMap((item) => item.links ?? [])),
    groups: unique(items.flatMap((item) => item.groups ?? [])),
    qualities: unique(items.flatMap((item) => item.qualities ?? [])),
    genres: unique(items.flatMap((item) => item.genres ?? [])),
    countries: unique(items.flatMap((item) => item.countries ?? [])),
    languages: unique(items.flatMap((item) => item.languages ?? [])),
    persianGenres: unique(items.flatMap((item) => item.persianGenres ?? [])),
    persianCountries: unique(items.flatMap((item) => item.persianCountries ?? [])),
    persianLanguages: unique(items.flatMap((item) => item.persianLanguages ?? [])),
    movieshoImages: mergeImages([], items.flatMap((item) => item.movieshoImages ?? [])),
    curatedSourcePages: unique(items.flatMap((item) => [...(item.curatedSourcePages ?? []), item.sourcePageUrl].filter(Boolean))),
    sourceUpdatedAt,
    __sourceKeys: unique(items.map(keyOf)),
  };
}

function mergeExisting(existing, incoming, changed) {
  const links = mergeLinks(existing.links ?? [], incoming.links ?? []);
  return {
    ...existing,
    // Preserve every existing provider and append/refresh the curated source
    // links. Previously this was calculated above but accidentally omitted
    // from the emitted title, leaving only source metadata updated.
    links,
    type: existing.type || incoming.type,
    year: existing.year ?? incoming.year ?? null,
    imdbUrl: existing.imdbUrl ?? incoming.imdbUrl ?? null,
    groups: unique([...(existing.groups ?? []), ...links.map((link) => link.group).filter(Boolean)]),
    qualities: unique([...(existing.qualities ?? []), ...links.map((link) => link.quality).filter(Boolean)]),
    genres: unique([...(existing.genres ?? []), ...(incoming.genres ?? [])]),
    countries: unique([...(existing.countries ?? []), ...(incoming.countries ?? [])]),
    languages: unique([...(existing.languages ?? []), ...(incoming.languages ?? [])]),
    posterUrl: existing.posterUrl ?? incoming.posterUrl ?? null,
    backdropUrl: existing.backdropUrl ?? incoming.backdropUrl ?? incoming.posterUrl ?? null,
    overview: existing.overview ?? incoming.overview ?? null,
    persianTitle: existing.persianTitle ?? incoming.persianTitle ?? null,
    persianOverview: existing.persianOverview ?? incoming.persianOverview ?? null,
    persianDescription: existing.persianDescription ?? incoming.persianDescription ?? null,
    persianGenres: unique([...(existing.persianGenres ?? []), ...(incoming.persianGenres ?? [])]),
    persianCountries: unique([...(existing.persianCountries ?? []), ...(incoming.persianCountries ?? [])]),
    persianLanguages: unique([...(existing.persianLanguages ?? []), ...(incoming.persianLanguages ?? [])]),
    movieshoImages: mergeImages(existing.movieshoImages ?? [], incoming.movieshoImages ?? []),
    curatedSourcePages: unique([...(existing.curatedSourcePages ?? []), ...(incoming.curatedSourcePages ?? []), incoming.sourcePageUrl].filter(Boolean)),
    sourceUpdatedAt: newestDate(existing.sourceUpdatedAt ?? existing.movieshoModifiedAt, incoming.sourceUpdatedAt),
    catalogUpdatedAt: changed ? now : existing.catalogUpdatedAt ?? null,
  };
}

function normalizeNew(item) {
  const value = { ...item };
  delete value.__sourceKeys;
  const links = mergeLinks([], value.links ?? []);
  return {
    ...value,
    links,
    groups: unique([...(value.groups ?? []), ...links.map((link) => link.group).filter(Boolean)]),
    qualities: unique([...(value.qualities ?? []), ...links.map((link) => link.quality).filter(Boolean)]),
    curatedSourcePages: unique([...(value.curatedSourcePages ?? []), value.sourcePageUrl].filter(Boolean)),
    catalogUpdatedAt: now,
  };
}

function sourceChanged(existing, incoming) {
  const previousByKey = new Map((existing.links ?? []).map((link) => [linkKey(link), link]));
  if ((incoming.links ?? []).some((link) => {
    const previous = previousByKey.get(linkKey(link));
    return !previous || previous.url !== link.url || subtitleSignature(previous.subtitles) !== subtitleSignature(link.subtitles);
  })) return true;
  if ((incoming.curatedSourcePages ?? []).some((page) => !(existing.curatedSourcePages ?? []).includes(page))) return true;
  const existingUpdated = existing.sourceUpdatedAt ?? existing.movieshoModifiedAt ?? null;
  return Boolean(incoming.sourceUpdatedAt && incoming.sourceUpdatedAt !== existingUpdated);
}

function mergeLinks(existing, incoming) {
  const values = new Map();
  for (const link of existing) values.set(linkKey(link), link);
  for (const link of incoming) {
    const key = linkKey(link);
    const previous = values.get(key);
    values.set(key, previous ? { ...previous, ...link, subtitles: mergeSubtitles(previous.subtitles ?? [], link.subtitles ?? []) } : link);
  }
  return [...values.values()].sort(sortLinks);
}

function mergeSubtitles(existing, incoming) {
  const map = new Map();
  for (const item of [...existing, ...incoming]) if (item?.url) map.set(canonicalUrl(item.url), item);
  return [...map.values()];
}

function mergeImages(existing, incoming) {
  const map = new Map();
  for (const item of [...existing, ...incoming]) if (item?.url) map.set(canonicalUrl(item.url), item);
  return [...map.values()];
}

function subtitleSignature(values) { return (values ?? []).map((value) => canonicalUrl(value.url)).sort().join("|"); }
function countRefreshed(existing, incoming) { const previous = new Map(existing.map((link) => [linkKey(link), link.url])); return incoming.filter((link) => previous.has(linkKey(link)) && previous.get(linkKey(link)) !== link.url).length; }
function linkKey(link) { return `${String(link.sourceProvider ?? "").toLowerCase()}:${canonicalUrl(link.url)}`; }
function canonicalUrl(value) {
  try {
    const url = new URL(value);
    const identityParams = ["season", "episode", "quality", "format", "part", "id"]
      .flatMap((name) => url.searchParams.has(name) ? [[name, url.searchParams.get(name)]] : [])
      .map(([name, item]) => `${name}=${item}`)
      .join("&");
    return `${url.hostname.toLowerCase()}${decodeURIComponent(url.pathname).toLowerCase()}${identityParams ? `?${identityParams}` : ""}`;
  } catch { return String(value ?? "").toLowerCase(); }
}
function keyOf(item) { return String(item?.imdbCode || item?.id || "").trim().toLowerCase(); }
function titleKey(item) {
  const title = String(item?.originalTitle || item?.title || "").normalize("NFKD").toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
  return title ? `${title}:${item?.year ?? ""}` : "";
}
function unique(values) { return [...new Set(values.filter((value) => value != null && value !== ""))]; }
function newestDate(a, b) { return Date.parse(a ?? "") >= Date.parse(b ?? "") ? a ?? b ?? null : b ?? a ?? null; }
function sortLinks(a, b) { return (a.season ?? 0) - (b.season ?? 0) || (a.episode ?? 0) - (b.episode ?? 0) || Number.parseInt(b.quality ?? "0", 10) - Number.parseInt(a.quality ?? "0", 10) || a.url.localeCompare(b.url); }
async function writeJsonAtomic(file, value) { await mkdir(path.dirname(file), { recursive: true }); const temp = `${file}.${process.pid}.tmp`; await writeFile(temp, JSON.stringify(value)); await rename(temp, file); }
async function replaceFile(source, target) {
  const backup = `${target}.backup-${process.pid}`;
  let hasBackup = false;
  try {
    try { await rename(target, backup); hasBackup = true; } catch (error) { if (error?.code !== "ENOENT") throw error; }
    await rename(source, target);
    if (hasBackup) await unlink(backup).catch(() => undefined);
  } catch (error) {
    if (hasBackup) await rename(backup, target).catch(() => undefined);
    throw error;
  }
}
