import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const EXISTING_FILE = process.argv[2] || "public/data/vod-catalog.json";
const SOURCE_FILE = process.argv[3] || "public/data/vod-source-current.json";
const OUT_FILE = process.argv[4] || EXISTING_FILE;
const REPORT_FILE = process.argv[5] || "";

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
    groups: sourceHasLinks
      ? Array.from(new Set(links.map((link) => link.group).filter(Boolean))).sort()
      : existing.groups,
    qualities: sourceHasLinks
      ? Array.from(new Set(links.map((link) => link.quality).filter(Boolean))).sort(sortQuality)
      : existing.qualities,
    sourceLinkFingerprint: sourceHasLinks
      ? sourceFingerprint(source)
      : existing.sourceLinkFingerprint ?? null,
    sourceDirectoryLinks:
      sourceHasLinks && (isSeries(source) || isSeries(existing))
        ? source.links.filter((link) => !isDirectEpisodeLink(link))
        : existing.sourceDirectoryLinks,
  };
}

function isSeries(item) {
  const value = String(item?.type ?? "").trim().toLowerCase();
  return !/movie|film|short|documentary|video/i.test(value)
    && /series|episode|show|tvmini|tvspecial|tvepisode/i.test(value);
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

  const byPath = new Map();
  for (const link of existingLinks) {
    byPath.set(downloadPath(link.url), link);
  }

  for (const sourceLink of sourceLinks) {
    if (!isDirectEpisodeLink(sourceLink)) continue;
    const key = downloadPath(sourceLink.url);
    const previous = byPath.get(key);
    byPath.set(
      key,
      previous
        ? {
            ...previous,
            ...sourceLink,
            season: sourceLink.season ?? previous.season ?? null,
            episode: sourceLink.episode ?? previous.episode ?? null,
            fileName: sourceLink.fileName ?? previous.fileName ?? null,
            sourceUrl: sourceLink.sourceUrl ?? previous.sourceUrl ?? null,
            modified: sourceLink.modified ?? previous.modified ?? null,
          }
        : sourceLink,
    );
  }

  return Array.from(byPath.values());
}

function mergeDownloadLinks(existingLinks, sourceLinks) {
  const byUrl = new Map(existingLinks.map((link) => [link.url, link]));
  const byPath = new Map(
    existingLinks.map((link) => [downloadPath(link.url), link]).filter(([key]) => key),
  );
  return sourceLinks.map((sourceLink) => {
    const previous = byUrl.get(sourceLink.url) ?? byPath.get(downloadPath(sourceLink.url));
    return previous
      ? {
          ...sourceLink,
          season: previous.season ?? sourceLink.season ?? null,
          episode: previous.episode ?? sourceLink.episode ?? null,
          fileName: previous.fileName ?? sourceLink.fileName ?? null,
          sourceUrl: previous.sourceUrl ?? sourceLink.sourceUrl ?? null,
          modified: previous.modified ?? sourceLink.modified ?? null,
        }
      : sourceLink;
  });
}

function sortQuality(a, b) {
  return Number.parseInt(b, 10) - Number.parseInt(a, 10) || String(a).localeCompare(String(b));
}

function downloadPath(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const marker = parsed.pathname.toLowerCase().indexOf("/donyayeserial/");
    return marker >= 0 ? parsed.pathname.slice(marker).toLowerCase() : parsed.pathname.toLowerCase();
  } catch {
    return rawUrl;
  }
}

function sourceFingerprint(item) {
  const links = (item.links ?? [])
    .map((link) => [
      link.url,
      link.label ?? null,
      link.size ?? null,
      link.group ?? null,
      link.quality ?? null,
      link.release ?? null,
    ])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return createHash("sha256").update(JSON.stringify(links)).digest("hex");
}

function sourceChanged(existing, source) {
  const nextFingerprint = sourceFingerprint(source);
  if (existing.sourceLinkFingerprint) {
    return existing.sourceLinkFingerprint !== nextFingerprint;
  }

  if (!isSeries(existing) && !isSeries(source)) {
    return linkSignature(source) !== linkSignature(existing);
  }

  if (!existing.links?.some(isDirectEpisodeLink)) {
    return linkSignature(source) !== linkSignature(existing);
  }

  const existingPaths = new Set((existing.links ?? []).map((link) => downloadPath(link.url)));
  return (source.links ?? []).some(
    (link) => isDirectEpisodeLink(link) && !existingPaths.has(downloadPath(link.url)),
  );
}

function linkSignature(item) {
  return JSON.stringify(
    (item.links ?? []).map((link) => [
      link.url,
      link.label ?? null,
      link.size ?? null,
      link.group ?? null,
      link.quality ?? null,
      link.release ?? null,
    ]),
  );
}

async function writeAtomic(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  await writeFile(temporary, content);
  try {
    await rename(temporary, file);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

async function main() {
  const existing = JSON.parse(await readFile(EXISTING_FILE, "utf8"));
  const source = JSON.parse(await readFile(SOURCE_FILE, "utf8"));
  const byCode = new Map(existing.items.map((item) => [item.imdbCode || item.id, item]));
  let added = 0;
  let updated = 0;
  const addedIds = [];
  const updatedIds = [];

  for (const item of source.items) {
    const key = item.imdbCode || item.id;
    if (!key) continue;
    const old = byCode.get(key);
    if (old) {
      const merged = mergeItem(old, item);
      if (sourceChanged(old, item)) {
        updated += 1;
        updatedIds.push(key);
      }
      byCode.set(key, merged);
    } else {
      byCode.set(key, mergeItem(null, item));
      added += 1;
      addedIds.push(key);
    }
  }

  const items = Array.from(byCode.values()).sort(
    (a, b) => (b.imdbVotes ?? 0) - (a.imdbVotes ?? 0) || a.title.localeCompare(b.title)
  );
  const payload = {
    ...existing,
    sourceUrl: source.preservePrimarySource
      ? existing.sourceUrl
      : source.sourceUrl ?? existing.sourceUrl,
    sourceUrls: Array.from(
      new Set([
        existing.sourceUrl,
        ...(existing.sourceUrls ?? []),
        source.sourceUrl,
        ...(source.sourceUrls ?? []),
      ].filter(Boolean)),
    ),
    scrapedAt: source.scrapedAt ?? existing.scrapedAt,
    mergedAt: new Date().toISOString(),
    totalTitles: items.length,
    totalLinks: items.reduce((sum, item) => sum + (item.links?.length ?? 0), 0),
    items,
  };

  await writeAtomic(OUT_FILE, JSON.stringify(payload));
  const report = {
    outFile: OUT_FILE,
    added,
    updated,
    unchanged: Math.max(0, source.items.length - added - updated),
    preserved: Math.max(0, existing.items.length - source.items.length),
    addedIds,
    updatedIds,
    totalTitles: payload.totalTitles,
    totalLinks: payload.totalLinks,
  };
  if (REPORT_FILE) await writeAtomic(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, addedIds: undefined, updatedIds: undefined }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
