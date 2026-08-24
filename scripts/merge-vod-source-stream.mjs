import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";

const EXISTING_FILE = process.argv[2] || "public/data/vod-catalog.json";
const SOURCE_FILE = process.argv[3] || ".media-cache/vod-sync/vod-source.json";
const OUT_FILE = process.argv[4] || EXISTING_FILE;
const REPORT_FILE = process.argv[5] || "";

async function main() {
  const source = JSON.parse(await readFile(SOURCE_FILE, "utf8"));
  const existingIndex = await readJson("public/data/vod-index.json", null);
  const existingCards = new Map((existingIndex?.items ?? []).map((item) => [keyOf(item), item]));
  const incoming = new Map(source.items.map((item) => [keyOf(item), item]).filter(([key]) => key));
  const temporary = `${OUT_FILE}.tmp-${process.pid}`;
  await mkdir(path.dirname(temporary), { recursive: true });
  const output = createWriteStream(temporary, { encoding: "utf8" });

  let first = true;
  let totalTitles = 0;
  let totalLinks = 0;
  let added = 0;
  let updated = 0;
  const consumed = new Set();

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
        if (sourceItem.links?.length) updated += 1;
      }
      await write(`${first ? "" : ","}${JSON.stringify(next)}`);
      first = false;
      totalTitles += 1;
      totalLinks += next.links?.length ?? 0;
    },
    {
      onMetadata: async (metadata) => {
      const addedKeys = Array.from(incoming.keys()).filter((key) => !existingCards.has(key));
      const knownLinkCount = Array.from(existingCards.values()).reduce((sum, card) => sum + (card.linksCount ?? 0), 0);
      const incomingLinkCount = Array.from(incoming.entries()).reduce((sum, [key, item]) => {
        if (!item.links?.length) return sum + (existingCards.get(key)?.linksCount ?? 0);
        return sum + item.links.length;
      }, 0);
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
        totalTitles: existingCards.size ? existingCards.size + addedKeys.length : (metadata.totalTitles ?? 0) + addedKeys.length,
        totalLinks: existingCards.size ? knownLinkCount + incomingLinkCount - Array.from(incoming.keys()).filter((key) => existingCards.has(key)).reduce((sum, key) => sum + (existingCards.get(key)?.linksCount ?? 0), 0) : (metadata.totalLinks ?? 0) + (source.totalLinks ?? 0),
      };
      const json = JSON.stringify(nextMetadata);
      await write(`${json.slice(0, -1)},"items":[`);
      },
    },
  );

  for (const [key, item] of incoming) {
    if (consumed.has(key)) continue;
    await write(`${first ? "" : ","}${JSON.stringify(item)}`);
    first = false;
    totalTitles += 1;
    totalLinks += item.links?.length ?? 0;
    added += 1;
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
    totalTitles,
    totalLinks,
  };
  if (REPORT_FILE) {
    await mkdir(path.dirname(REPORT_FILE), { recursive: true });
    await import("node:fs/promises").then(({ writeFile }) => writeFile(REPORT_FILE, JSON.stringify(report, null, 2)));
  }
  console.log(JSON.stringify(report, null, 2));
}

function keyOf(item) {
  return String(item?.imdbCode || item?.id || "").trim();
}

function mergeItem(existing, incoming) {
  const hasNewLinks = (incoming.links?.length ?? 0) > 0;
  const links = hasNewLinks ? mergeLinks(existing.links ?? [], incoming.links) : existing.links ?? [];
  return {
    ...existing,
    ...incoming,
    links,
    groups: hasNewLinks ? unique(links.map((link) => link.group).filter(Boolean)) : existing.groups,
    qualities: hasNewLinks ? unique(links.map((link) => link.quality).filter(Boolean)).sort(sortQuality) : existing.qualities,
    sourceLinkFingerprint: hasNewLinks ? fingerprint(links) : existing.sourceLinkFingerprint ?? null,
  };
}

function mergeLinks(existing, incoming) {
  const byUrl = new Map(existing.map((link) => [link.url, link]));
  for (const link of incoming) byUrl.set(link.url, { ...byUrl.get(link.url), ...link });
  return Array.from(byUrl.values());
}

function unique(values) {
  return Array.from(new Set(values));
}

function sortQuality(a, b) {
  return Number.parseInt(b, 10) - Number.parseInt(a, 10) || String(a).localeCompare(String(b));
}

function fingerprint(links) {
  return JSON.stringify(links.map((link) => [link.url, link.quality, link.group]));
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
