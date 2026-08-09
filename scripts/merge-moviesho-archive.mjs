import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { derivePersianTitle } from "./moviesho-archive-lib.mjs";

const ROOT = process.cwd();
const CATALOG = resolveArg(2, "public/data/vod-catalog.json");
const SOURCE = resolveArg(3, ".media-cache/vod-sync/moviesho-archive-source.json");
const OUTPUT = resolveArg(4, "public/data/vod-catalog.json");
const REPORT = resolveArg(5, ".media-cache/vod-sync/moviesho-archive-merge-report.json");

const catalog = JSON.parse(await readFile(CATALOG, "utf8"));
const source = JSON.parse(await readFile(SOURCE, "utf8"));
const sourceById = new Map((source.items ?? []).map((item) => [keyOf(item), item]));
const consumed = new Set();
const stats = {
  existingTitlesEnriched: 0,
  newTitlesAdded: 0,
  downloadLinksAdded: 0,
  picturesAdded: 0,
};

const items = (catalog.items ?? []).map((existing) => {
  const incoming = sourceById.get(keyOf(existing));
  if (!incoming) return existing;
  consumed.add(keyOf(existing));
  const merged = mergeExisting(existing, incoming);
  stats.existingTitlesEnriched += 1;
  stats.downloadLinksAdded += Math.max(0, merged.links.length - (existing.links?.length ?? 0));
  stats.picturesAdded += Math.max(0, merged.movieshoImages.length - (existing.movieshoImages?.length ?? 0));
  return merged;
});

for (const incoming of source.items ?? []) {
  if (consumed.has(keyOf(incoming))) continue;
  items.push(normalizeNew(incoming));
  stats.newTitlesAdded += 1;
  stats.downloadLinksAdded += incoming.links?.length ?? 0;
  stats.picturesAdded += incoming.movieshoImages?.length ?? 0;
}

const mergedCatalog = {
  ...catalog,
  scrapedAt: new Date().toISOString(),
  totalTitles: items.length,
  totalLinks: items.reduce((sum, item) => sum + (item.links?.length ?? 0), 0),
  totalImages: items.reduce((sum, item) => sum + (item.imdbImages?.length ?? 0) + (item.movieshoImages?.length ?? 0), 0),
  movieshoArchiveImportedAt: new Date().toISOString(),
  movieshoArchiveSourceUrl: source.sourceUrl,
  items,
};
const report = {
  generatedAt: new Date().toISOString(),
  sourceTitles: source.items?.length ?? 0,
  resultTitles: items.length,
  resultLinks: mergedCatalog.totalLinks,
  ...stats,
};

await writeJsonAtomic(OUTPUT, mergedCatalog);
await writeJsonAtomic(REPORT, report);
console.log(`[moviesho-merge] enriched ${stats.existingTitlesEnriched}; added ${stats.newTitlesAdded}; appended ${stats.downloadLinksAdded} links; added ${stats.picturesAdded} pictures`);

function mergeExisting(existing, incoming) {
  const links = dedupeByUrl([...(existing.links ?? []), ...(incoming.links ?? [])]);
  const movieshoImages = dedupeByUrl([...(existing.movieshoImages ?? []), ...(incoming.movieshoImages ?? [])]);
  return {
    ...existing,
    links,
    groups: unique([...(existing.groups ?? []), ...links.map((link) => link.group)]),
    qualities: unique([...(existing.qualities ?? []), ...links.map((link) => link.quality).filter(Boolean)]),
    runtimeMinutes: existing.runtimeMinutes ?? incoming.runtimeMinutes ?? null,
    posterUrl: existing.posterUrl ?? incoming.posterUrl ?? null,
    backdropUrl: existing.backdropUrl ?? incoming.backdropUrl ?? incoming.posterUrl ?? null,
    sourcePageUrl: existing.sourcePageUrl ?? incoming.sourcePageUrl ?? null,
    movieshoPageUrl: incoming.movieshoPageUrl ?? incoming.sourcePageUrl ?? null,
    movieshoPostId: incoming.movieshoPostId ?? null,
    movieshoPublishedAt: incoming.movieshoPublishedAt ?? null,
    movieshoModifiedAt: incoming.movieshoModifiedAt ?? null,
    persianTitle: normalizedPersianTitle(incoming, existing.persianTitle),
    persianOverview: incoming.persianOverview ?? existing.persianOverview ?? null,
    persianDescription: incoming.persianDescription ?? existing.persianDescription ?? null,
    persianGenres: unique([...(existing.persianGenres ?? []), ...(incoming.persianGenres ?? [])]),
    persianCountries: unique([...(existing.persianCountries ?? []), ...(incoming.persianCountries ?? [])]),
    persianLanguages: unique([...(existing.persianLanguages ?? []), ...(incoming.persianLanguages ?? [])]),
    movieshoImages,
  };
}

function normalizeNew(item) {
  const links = dedupeByUrl(item.links ?? []);
  const title = canonicalImportedTitle(item.title);
  return {
    ...item,
    id: item.imdbCode || item.id,
    title,
    originalTitle: canonicalImportedTitle(item.originalTitle) || title,
    persianTitle: normalizedPersianTitle(item, null),
    groups: unique([...(item.groups ?? []), ...links.map((link) => link.group)]),
    qualities: unique([...(item.qualities ?? []), ...links.map((link) => link.quality).filter(Boolean)]),
    links,
    movieshoImages: dedupeByUrl(item.movieshoImages ?? []),
  };
}

function normalizedPersianTitle(item, fallback) {
  const value = derivePersianTitle(item.persianTitle, canonicalImportedTitle(item.title), item.year);
  const cleanFallback = derivePersianTitle(fallback, canonicalImportedTitle(item.title), item.year);
  return value || cleanFallback || null;
}

function canonicalImportedTitle(value) {
  return String(value ?? "")
    .replace(/^(?:فیلم|انیمیشن|مستند|سریال)\s+/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function keyOf(item) {
  return String(item?.imdbCode || item?.id || "").trim().toLowerCase();
}

function dedupeByUrl(values) {
  const map = new Map();
  for (const value of values) {
    if (!value?.url) continue;
    const key = canonicalUrl(value.url);
    if (!map.has(key)) map.set(key, value);
  }
  return [...map.values()];
}

function canonicalUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().toLowerCase();
  } catch {
    return String(value).toLowerCase();
  }
}

function unique(values) {
  return [...new Set(values.filter((value) => value != null && value !== ""))];
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value), "utf8");
  await rename(temporary, file);
}

function resolveArg(index, fallback) {
  return path.resolve(ROOT, process.argv[index] || fallback);
}
