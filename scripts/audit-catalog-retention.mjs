import assert from "node:assert/strict";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";

const [baseline, current = "public/data/vod-catalog.json", output = ".media-cache/vod-sync/final-retention-audit.json"] = process.argv.slice(2);
assert.ok(baseline, "Provide a local baseline archive (for LFS, use the already-downloaded object)");
// Signed URLs can change without losing a media version. Retain identity-bearing queries.
const canonical = value => {
  try {
    const url = new URL(value);
    const query = new URLSearchParams();
    for (const key of ["season", "episode", "quality", "format", "part", "id"]) if (url.searchParams.has(key)) query.set(key, url.searchParams.get(key));
    return `${url.hostname.toLowerCase()}${decodeURIComponent(url.pathname).toLowerCase()}${query.size ? `?${query}` : ""}`;
  } catch { return String(value || "").toLowerCase(); }
};
const identity = item => String(item.id || item.imdbCode);
const previous = new Map();
await streamVodArchiveItems(baseline, item => {
  const old = previous.get(identity(item));
  previous.set(identity(item), { rating: item.imdbRating, votes: item.imdbVotes,
    urls: new Set([...(old?.urls || []), ...(item.links || []).map(link => canonical(link.url))]),
  });
});
let titles = 0, links = 0, preservedReferences = 0;
const missingUrls = [], seen = new Set(), newIds = new Set(), ratingIds = new Set(), voteIds = new Set();
const metadata = await streamVodArchiveItems(current, item => {
  titles++; links += item.links?.length || 0; seen.add(identity(item));
  const old = previous.get(identity(item));
  if (!old) { newIds.add(identity(item)); return; }
  if (old.rating !== item.imdbRating) ratingIds.add(identity(item));
  if (old.votes !== item.imdbVotes) voteIds.add(identity(item));
  const active = new Set((item.links || []).flatMap(link => [link.url, link.sourceOriginalUrl].filter(Boolean)).map(canonical));
  const references = new Set([...(item.externalDownloadPages || []), ...(item.unavailableDownloadLinks || []), ...(item.sourceLinkHistory || [])].map(link => canonical(link.url)));
  for (const url of old.urls) {
    if (active.has(url)) old.urls.delete(url);
    else if (references.has(url)) { preservedReferences++; old.urls.delete(url); }
  }
});
const missingTitles = [...previous.keys()].filter(id => !seen.has(id));
for (const [id, old] of previous) for (const url of old.urls) missingUrls.push({ id, url });
const result = { checkedAt: new Date().toISOString(), baselineTitles: previous.size, titles, uniqueTitles: seen.size, links, newTitles: newIds.size,
  ratingsChanged: ratingIds.size, votesChanged: voteIds.size, preservedReferences, missingTitles, missingUrls: missingUrls.slice(0, 30), missingUrlCount: missingUrls.length,
  metadataCountsMatch: metadata.totalTitles === titles && metadata.totalLinks === links,
  verified: !missingTitles.length && !missingUrls.length && metadata.totalTitles === titles && metadata.totalLinks === links };
await mkdir(path.dirname(output), { recursive: true });
const temporary = `${output}.${process.pid}.tmp`; await writeFile(temporary, JSON.stringify(result, null, 2)); await rename(temporary, output);
console.log(JSON.stringify(result, null, 2));
if (!result.verified) process.exitCode = 1;
