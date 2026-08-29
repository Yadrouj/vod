import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import { once } from "node:events";
import { createHash } from "node:crypto";
import path from "node:path";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";

const EXISTING_FILE = process.argv[2] || "public/data/vod-catalog.json";
const SOURCE_FILE = process.argv[3] || ".media-cache/vod-sync/vod-source.json";
const OUT_FILE = process.argv[4] || EXISTING_FILE;
const REPORT_FILE = process.argv[5] || "";

async function main() {
  const source = JSON.parse(await readFile(SOURCE_FILE, "utf8"));
  const incoming = new Map(source.items.map((item) => [keyOf(item), item]).filter(([key]) => key));
  // The archive is intentionally too large to materialise. Do one cheap streaming
  // pass first so the JSON header we write contains the *actual* post-merge counts.
  // This avoids a stale summary while keeping the process memory-bounded.
  const preflight = await scanMergedCatalog(EXISTING_FILE, incoming);
  const temporary = `${OUT_FILE}.tmp-${process.pid}`;
  await mkdir(path.dirname(temporary), { recursive: true });
  const output = createWriteStream(temporary, { encoding: "utf8" });

  let first = true;
  let totalTitles = 0;
  let totalLinks = 0;
  let added = 0;
  let updated = 0;
  const consumed = new Set();
  const addedIds = [];
  const updatedIds = [];

  const write = async (value) => {
    if (output.write(value)) return;
    await once(output, "drain");
  };

  await streamVodArchiveItems(
    EXISTING_FILE,
    async (existingItem) => {
      const key = keyOf(existingItem);
      const sourceItem = incoming.get(key);
      const next = sourceItem ? mergeItem(existingItem, sourceItem) : existingItem;
      if (sourceItem) {
        consumed.add(key);
        if (sourceChanged(existingItem, sourceItem)) {
          updated += 1;
          updatedIds.push(key);
        }
      }
      await write(`${first ? "" : ","}${JSON.stringify(next)}`);
      first = false;
      totalTitles += 1;
      totalLinks += next.links?.length ?? 0;
    },
    {
      onMetadata: async (metadata) => {
      const nextMetadata = {
        ...metadata,
        sourceUrl: metadata.sourceUrl ?? source.sourceUrl,
        sourceUrls: Array.from(new Set([
          metadata.sourceUrl,
          ...(metadata.sourceUrls ?? []),
          source.sourceUrl,
          ...(source.sourceUrls ?? []),
        ].filter(Boolean))),
        scrapedAt: source.scrapedAt ?? metadata.scrapedAt,
        mergedAt: new Date().toISOString(),
        totalTitles: preflight.totalTitles,
        totalLinks: preflight.totalLinks,
      };
      const json = JSON.stringify(nextMetadata);
      await write(`${json.slice(0, -1)},"items":[`);
      },
    },
  );

  for (const [key, item] of incoming) {
    if (consumed.has(key)) continue;
    const next = mergeItem(null, item);
    await write(`${first ? "" : ","}${JSON.stringify(next)}`);
    first = false;
    totalTitles += 1;
    totalLinks += next.links?.length ?? 0;
    added += 1;
    addedIds.push(key);
  }

  await write("]}");
  await new Promise((resolve, reject) => {
    output.once("error", reject);
    output.end(resolve);
  });
  await rm(OUT_FILE, { force: true });
  await rename(temporary, OUT_FILE);

  const report = {
    outFile: OUT_FILE,
    added,
    updated,
    unchanged: Math.max(0, source.items.length - added - updated),
    preserved: Math.max(0, totalTitles - source.items.length),
    addedIds,
    updatedIds,
    totalTitles,
    totalLinks,
  };
  if (REPORT_FILE) {
    await mkdir(path.dirname(REPORT_FILE), { recursive: true });
    await import("node:fs/promises").then(({ writeFile }) => writeFile(REPORT_FILE, JSON.stringify(report, null, 2)));
  }
  // Keep the complete id lists in the report file for the next pipeline step,
  // but do not flood container logs with tens of thousands of ids.
  console.log(JSON.stringify({
    ...report,
    addedIds: undefined,
    updatedIds: undefined,
    addedIdCount: addedIds.length,
    updatedIdCount: updatedIds.length,
  }, null, 2));
}

async function scanMergedCatalog(existingFile, incoming) {
  const consumed = new Set();
  let totalTitles = 0;
  let totalLinks = 0;
  await streamVodArchiveItems(existingFile, async (existingItem) => {
    const key = keyOf(existingItem);
    const sourceItem = incoming.get(key);
    const next = sourceItem ? mergeItem(existingItem, sourceItem) : existingItem;
    if (sourceItem) consumed.add(key);
    totalTitles += 1;
    totalLinks += next.links?.length ?? 0;
  });
  for (const [key, sourceItem] of incoming) {
    if (consumed.has(key)) continue;
    const next = mergeItem(null, sourceItem);
    totalTitles += 1;
    totalLinks += next.links?.length ?? 0;
  }
  return { totalTitles, totalLinks };
}

function keyOf(item) {
  return String(item?.imdbCode || item?.id || "").trim();
}

function mergeItem(existing, source) {
  if (!existing) {
    return {
      ...source,
      sourceLinkFingerprint: sourceFingerprint(source),
      sourceDirectoryLinks: isSeries(source)
        ? (source.links ?? []).filter((link) => !isDirectEpisodeLink(link))
        : undefined,
    };
  }

  const sourceHasLinks = (source.links?.length ?? 0) > 0;
  const links = sourceHasLinks
    ? isSeries(source) || isSeries(existing)
      ? mergeSeriesLinks(existing.links ?? [], source.links)
      : mergeDownloadLinks(existing.links ?? [], source.links)
    : existing.links;
  return {
    ...source,
    ...existing,
    type: existing.type || source.type,
    year: existing.year ?? source.year ?? null,
    imdbVotes: existing.imdbVotes ?? source.imdbVotes ?? null,
    imdbRating: existing.imdbRating ?? source.imdbRating ?? null,
    links,
    groups: sourceHasLinks ? unique(links.map((link) => link.group).filter(Boolean)).sort() : existing.groups,
    qualities: sourceHasLinks ? unique(links.map((link) => link.quality).filter(Boolean)).sort(sortQuality) : existing.qualities,
    sourceLinkFingerprint: sourceHasLinks ? sourceFingerprint(source) : existing.sourceLinkFingerprint ?? null,
    sourceDirectoryLinks:
      sourceHasLinks && (isSeries(source) || isSeries(existing))
        ? source.links.filter((link) => !isDirectEpisodeLink(link))
        : existing.sourceDirectoryLinks,
  };
}

function isSeries(item) {
  return /series|tv|episode/i.test(item?.type ?? "");
}

function isDirectEpisodeLink(link) {
  const value = `${link?.url ?? ""} ${link?.label ?? ""} ${link?.fileName ?? ""}`;
  return (
    (link?.episode != null && Number.isFinite(Number(link.episode))) ||
    /\.(mkv|mp4|m4v|avi|webm|mov|wmv|ts)(?:$|[?#])/i.test(value) ||
    /S(?:eason)?[.\s_-]?\d{1,2}[.\s_-]*E(?:pisode)?[.\s_-]?\d{1,3}/i.test(value)
  );
}

function mergeSeriesLinks(existingLinks, sourceLinks) {
  const expanded = existingLinks.some(isDirectEpisodeLink);
  if (!expanded) return mergeDownloadLinks(existingLinks, sourceLinks);
  const byPath = new Map(existingLinks.map((link) => [linkIdentity(link), link]));
  for (const sourceLink of sourceLinks) {
    if (!isDirectEpisodeLink(sourceLink)) continue;
    const key = linkIdentity(sourceLink);
    const previous = byPath.get(key);
    byPath.set(key, previous ? {
      ...previous,
      ...sourceLink,
      season: sourceLink.season ?? previous.season ?? null,
      episode: sourceLink.episode ?? previous.episode ?? null,
      fileName: sourceLink.fileName ?? previous.fileName ?? null,
      sourceUrl: sourceLink.sourceUrl ?? previous.sourceUrl ?? null,
      modified: sourceLink.modified ?? previous.modified ?? null,
    } : sourceLink);
  }
  return Array.from(byPath.values());
}

function mergeDownloadLinks(existingLinks, sourceLinks) {
  // A title can be available from several providers. Keep every verified
  // provider and replace only the equivalent link from the incoming provider.
  const byIdentity = new Map(existingLinks.map((link) => [linkIdentity(link), link]));
  for (const sourceLink of sourceLinks) {
    const key = linkIdentity(sourceLink);
    const previous = byIdentity.get(key);
    byIdentity.set(key, previous ? {
      ...previous,
      ...sourceLink,
      season: previous.season ?? sourceLink.season ?? null,
      episode: previous.episode ?? sourceLink.episode ?? null,
      fileName: previous.fileName ?? sourceLink.fileName ?? null,
      sourceUrl: previous.sourceUrl ?? sourceLink.sourceUrl ?? null,
      modified: previous.modified ?? sourceLink.modified ?? null,
    } : sourceLink);
  }
  return Array.from(byIdentity.values());
}

function unique(values) {
  return Array.from(new Set(values));
}

function sortQuality(a, b) {
  return Number.parseInt(b, 10) - Number.parseInt(a, 10) || String(a).localeCompare(String(b));
}

function linkIdentity(link) {
  const rawUrl = String(link?.url ?? "");
  try {
    const parsed = new URL(rawUrl);
    const marker = parsed.pathname.toLowerCase().indexOf("/donyayeserial/");
    // DonyayeSerial changes the delivery host occasionally. Its stable archive
    // path is the identity, so a fresh host replaces the old dead link.
    if (marker >= 0) return `donyayeserial:${parsed.pathname.slice(marker).toLowerCase()}`;
    return `url:${parsed.origin.toLowerCase()}${parsed.pathname}${parsed.search}`;
  } catch {
    return rawUrl;
  }
}

function sourceFingerprint(item) {
  const links = (item.links ?? [])
    .map((link) => [link.url, link.label ?? null, link.size ?? null, link.group ?? null, link.quality ?? null, link.release ?? null])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return createHash("sha256").update(JSON.stringify(links)).digest("hex");
}

function sourceChanged(existing, source) {
  const nextFingerprint = sourceFingerprint(source);
  if (existing.sourceLinkFingerprint) return existing.sourceLinkFingerprint !== nextFingerprint;
  const incomingIds = new Set((source.links ?? []).map(linkIdentity));
  const existingSourceLinks = (existing.links ?? []).filter((link) => incomingIds.has(linkIdentity(link)));
  if (!isSeries(existing) && !isSeries(source)) {
    return linkSignature({ links: source.links ?? [] }) !== linkSignature({ links: existingSourceLinks });
  }
  if (!existing.links?.some(isDirectEpisodeLink)) {
    return linkSignature({ links: source.links ?? [] }) !== linkSignature({ links: existingSourceLinks });
  }
  const existingPaths = new Set((existing.links ?? []).map(linkIdentity));
  return (source.links ?? []).some((link) => isDirectEpisodeLink(link) && !existingPaths.has(linkIdentity(link)));
}

function linkSignature(item) {
  return JSON.stringify((item.links ?? []).map((link) => [link.url, link.label ?? null, link.size ?? null, link.group ?? null, link.quality ?? null, link.release ?? null]));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
