import { createWriteStream } from "node:fs";
import { once } from "node:events";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { f2myLinkIdentity } from "./f2my-series-lib.mjs";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";

const EXISTING_FILE = process.argv[2] || path.join("public", "data", "vod-catalog.json");
const SOURCE_FILE = process.argv[3] || path.join(".media-cache", "vod-sync", "f2my-source.json");
const OUT_FILE = process.argv[4] || EXISTING_FILE;
const REPORT_FILE = process.argv[5] || path.join(".media-cache", "vod-sync", "f2my-merge-report.json");

function isF2myLink(link) {
  return link?.sourceProvider === "f2my";
}

function itemKeys(item) {
  const keys = [];
  if (/^tt\d+$/i.test(item?.imdbCode || "")) keys.push(`imdb:${item.imdbCode.toLowerCase()}`);
  if (item?.f2myPageUrl) keys.push(`page:${normalizePage(item.f2myPageUrl)}`);
  if (item?.sourcePageUrl && item?.source === "f2my") keys.push(`page:${normalizePage(item.sourcePageUrl)}`);
  return keys;
}

function normalizePage(value) {
  try {
    const url = new URL(value);
    return `${url.origin.toLowerCase()}${url.pathname.replace(/\/+$/, "") || "/"}`;
  } catch {
    return String(value || "").toLowerCase();
  }
}

function mergeF2myLinks(existingLinks, incomingLinks) {
  const unrelated = existingLinks.filter((link) => !isF2myLink(link));
  if (!incomingLinks.length) return existingLinks;

  const priorF2my = existingLinks.filter(isF2myLink);
  const previousByIdentity = new Map(priorF2my.map((link) => [f2myLinkIdentity(link), link]));
  const mergedIncoming = incomingLinks.map((link) => {
    const previous = previousByIdentity.get(f2myLinkIdentity(link));
    return previous
      ? {
          ...previous,
          ...link,
          subtitles: link.subtitles?.length ? link.subtitles : previous.subtitles,
          subtitleUrl: link.subtitleUrl ?? previous.subtitleUrl ?? null,
        }
      : link;
  });
  return dedupe([...unrelated, ...mergedIncoming]);
}

function mergeItem(existing, incoming) {
  if (!existing) return normalizeItem(incoming);
  const links = mergeF2myLinks(existing.links ?? [], incoming.links ?? []);
  const f2myExtraLinks = incoming.f2myExtraLinks?.length ? incoming.f2myExtraLinks : existing.f2myExtraLinks ?? [];
  return normalizeItem({
    ...existing,
    imdbCode: /^tt\d+$/i.test(incoming.imdbCode || "") ? incoming.imdbCode : existing.imdbCode,
    imdbUrl: incoming.imdbUrl || existing.imdbUrl || null,
    title: existing.title || incoming.title,
    type: existing.type || incoming.type,
    year: existing.year ?? incoming.year ?? null,
    imdbRating: existing.imdbRating ?? incoming.imdbRating ?? null,
    imdbVotes: existing.imdbVotes ?? incoming.imdbVotes ?? null,
    genres: mergeTextList(existing.genres, incoming.genres),
    countries: mergeTextList(existing.countries, incoming.countries),
    languages: mergeTextList(existing.languages, incoming.languages),
    posterUrl: existing.posterUrl || incoming.posterUrl || null,
    overview: existing.overview || incoming.overview || null,
    source: existing.source || "f2my",
    sourcePageUrl: incoming.sourcePageUrl || existing.sourcePageUrl || null,
    persianTitle: incoming.persianTitle || existing.persianTitle || null,
    persianOverview: incoming.persianOverview || existing.persianOverview || null,
    f2myPageUrl: incoming.f2myPageUrl || existing.f2myPageUrl || null,
    f2myPostId: incoming.f2myPostId ?? existing.f2myPostId ?? null,
    f2myModifiedAt: incoming.f2myModifiedAt || existing.f2myModifiedAt || null,
    f2myExtraLinks,
    links,
  });
}

function normalizeItem(item) {
  const links = dedupe(item.links ?? []);
  return {
    ...item,
    links,
    groups: unique(links.map((link) => link.group).filter(Boolean)),
    qualities: unique(links.map((link) => link.quality).filter(Boolean)).sort(sortQuality),
    sourceLinkFingerprint: sourceFingerprint(links),
  };
}

function mergeTextList(left = [], right = []) {
  return unique([...(left ?? []), ...(right ?? [])]);
}

function dedupe(links) {
  const seen = new Set();
  return links.filter((link) => {
    const key = isF2myLink(link) ? `f2my:${f2myLinkIdentity(link)}` : `url:${link.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sourceFingerprint(links) {
  return createHash("sha256").update(JSON.stringify(
    links.map((link) => [
      link.sourceProvider || "", link.sourceBaseId || "", link.sourceRelativePath || link.url,
      link.quality || "", link.group || "", link.season ?? null, link.episode ?? null,
    ]).sort((a, b) => a.join("|").localeCompare(b.join("|"))),
  )).digest("hex");
}

function sortQuality(left, right) {
  const rank = (value) => Number(/(\d{3,4})p/i.exec(String(value || ""))?.[1] || (/4k/i.test(String(value || "")) ? 2160 : 0));
  return rank(right) - rank(left) || String(left).localeCompare(String(right));
}

function unique(values) {
  return Array.from(new Set(values));
}

function itemChanged(previous, next) {
  return previous.sourceLinkFingerprint !== next.sourceLinkFingerprint
    || previous.f2myModifiedAt !== next.f2myModifiedAt
    || previous.f2myPageUrl !== next.f2myPageUrl;
}

async function writeAtomic(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  await writeFile(temporary, content, "utf8");
  try {
    await rename(temporary, file);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

function findIncoming(item, incomingByKey) {
  return itemKeys(item).map((key) => incomingByKey.get(key)).find(Boolean) || null;
}

function countIncomingChange(existingItem, incoming, report) {
  const next = mergeItem(existingItem, incoming);
  const previousF2myLinkCount = (existingItem?.links ?? []).filter(isF2myLink).length;
  const nextF2myLinkCount = (next.links ?? []).filter(isF2myLink).length;
  report.newLinks += Math.max(0, nextF2myLinkCount - previousF2myLinkCount);
  if (!existingItem) {
    report.added += 1;
    report.addedIds.push(next.imdbCode || next.id);
  } else if (itemChanged(existingItem, next)) {
    report.updated += 1;
    report.updatedIds.push(next.imdbCode || next.id);
  } else {
    report.unchanged += 1;
  }
  return next;
}

async function writeChunk(stream, chunk) {
  if (!stream.write(chunk)) await once(stream, "drain");
}

async function closeStream(stream) {
  await new Promise((resolve, reject) => {
    stream.once("error", reject);
    stream.end(resolve);
  });
}

async function main() {
  const source = JSON.parse(await readFile(SOURCE_FILE, "utf8"));
  const incomingItems = (source.items ?? []).filter((item) => item?.links?.length);
  const incomingByKey = new Map();
  for (const item of incomingItems) {
    for (const key of itemKeys(item)) incomingByKey.set(key, item);
  }
  const report = { added: 0, updated: 0, unchanged: 0, newLinks: 0, sourceItems: 0, addedIds: [], updatedIds: [] };
  const matchedIncoming = new Set();
  let metadata = null;
  let totalTitles = 0;
  let totalLinks = 0;

  await streamVodArchiveItems(EXISTING_FILE, async (existingItem) => {
    totalTitles += 1;
    const incoming = findIncoming(existingItem, incomingByKey);
    const next = incoming ? mergeItem(existingItem, incoming) : existingItem;
    totalLinks += next.links?.length ?? 0;
    if (incoming && !matchedIncoming.has(incoming)) {
      matchedIncoming.add(incoming);
      report.sourceItems += 1;
      countIncomingChange(existingItem, incoming, report);
    }
  }, { onMetadata: (value) => { metadata = value; } });

  const additions = incomingItems.filter((item) => !matchedIncoming.has(item));
  for (const incoming of additions) {
    report.sourceItems += 1;
    const next = countIncomingChange(null, incoming, report);
    totalTitles += 1;
    totalLinks += next.links?.length ?? 0;
  }

  const tempFile = `${OUT_FILE}.tmp-${process.pid}`;
  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  const output = createWriteStream(tempFile, { encoding: "utf8" });
  const header = {
    ...(metadata ?? {}),
    sourceUrls: unique([...(metadata?.sourceUrls ?? []), source.sourceUrl, ...(source.sourceUrls ?? [])].filter(Boolean)),
    f2myMergedAt: new Date().toISOString(),
    totalTitles,
    totalLinks,
  };
  delete header.items;
  await writeChunk(output, `${JSON.stringify(header).slice(0, -1)},"items":[`);
  let first = true;
  await streamVodArchiveItems(EXISTING_FILE, async (existingItem) => {
    const incoming = findIncoming(existingItem, incomingByKey);
    const next = incoming ? mergeItem(existingItem, incoming) : existingItem;
    await writeChunk(output, `${first ? "" : ","}${JSON.stringify(next)}`);
    first = false;
  });
  for (const incoming of additions) {
    await writeChunk(output, `${first ? "" : ","}${JSON.stringify(normalizeItem(incoming))}`);
    first = false;
  }
  await writeChunk(output, "]}");
  await closeStream(output);
  await rename(tempFile, OUT_FILE);

  const result = {
    ...report,
    totalTitles,
    totalLinks,
    outFile: OUT_FILE,
    sourceFile: SOURCE_FILE,
  };
  await writeAtomic(REPORT_FILE, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, addedIds: undefined, updatedIds: undefined }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
