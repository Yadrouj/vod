// Compare a staged scraper merge to the live catalog before publishing it.
// Produces an exact baseline for the release monitor, so an older monitor state
// cannot mislabel unrelated historical imports as this review's discoveries.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";
import { summarizeCatalogItem, buildReleaseMonitorResult } from "./release-monitor-lib.mjs";

const [before, after, output = ".media-cache/vod-sync/review"] = process.argv.slice(2);
if (!before || !after) throw new Error("Usage: node scripts/review-vod-changes.mjs <live-catalog> <staged-catalog> [output-prefix]");
const prior = new Map();
const priorSummaries = [];
const priorCounts = new Map();
let beforeTitles = 0;
let beforeLinks = 0;
const digest = (item) => createHash("sha256").update(JSON.stringify(item)).digest("hex");
await streamVodArchiveItems(before, async (item) => {
  beforeTitles += 1;
  beforeLinks += item.links?.length ?? 0;
  priorCounts.set(item.id, (priorCounts.get(item.id) ?? 0) + 1);
  const summary = summarizeCatalogItem(item);
  priorSummaries.push(summary);
  prior.set(item.id, { summary, digest: digest(item) });
});
const current = [];
const changedIds = [];
const seen = new Set();
const counts = new Map();
await streamVodArchiveItems(after, async (item) => {
  counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
  seen.add(item.id);
  current.push(summarizeCatalogItem(item));
  if (prior.get(item.id)?.digest !== digest(item)) changedIds.push(item.imdbCode || item.id);
});
const removedIds = [...prior.keys()].filter((id) => !seen.has(id));
const newDuplicates = [...counts].filter(([id, count]) => count > Math.max(1, priorCounts.get(id) ?? 0));
if (newDuplicates.length || removedIds.length) throw new Error(`Unsafe merge: ${JSON.stringify(newDuplicates)} new duplicate IDs, ${removedIds.length} removed IDs`);
const previousState = JSON.parse(await readFile("data/release-monitor-state.json", "utf8"));
const baseline = buildReleaseMonitorResult({ catalogItems: priorSummaries, previousState: { version: 0, updates: [] }, imdbCandidates: [] }).state;
baseline.updates = previousState.updates ?? [];
baseline.trackedImdbCodes = previousState.trackedImdbCodes ?? [];
const result = buildReleaseMonitorResult({ catalogItems: current, previousState: baseline, imdbCandidates: [] });
const report = {
  checkedAt: new Date().toISOString(), beforeTitles, afterTitles: current.length,
  existingDuplicateIds: [...priorCounts].filter(([, count]) => count > 1).length,
  addedTitles: current.length - beforeTitles,
  beforeLinks,
  afterLinks: current.reduce((sum, item) => sum + item.linksCount, 0),
  changedIds, changes: result.updates.filter((event) => event.eventAt === result.state.updatedAt),
};
await mkdir(path.dirname(output), { recursive: true });
await writeFile(`${output}-baseline.json`, JSON.stringify(baseline));
await writeFile(`${output}-changes.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, changedIds: changedIds.length, changes: report.changes.map((event) => ({ title: event.baseTitle, kind: event.changeType, episode: event.episode })) }, null, 2));
