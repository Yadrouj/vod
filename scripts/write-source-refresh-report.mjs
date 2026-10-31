import { readFile, rename, writeFile } from "node:fs/promises";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";

const read = async file => { try { return JSON.parse(await readFile(file, "utf8")); } catch { return null; } };
const runDate = process.env.SOURCE_REFRESH_RUN_DATE || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(runDate)) throw new Error("Invalid report run date");
const publicSources = await read(".media-cache/public-vod/report.json");
const f2my = await read(".media-cache/vod-sync/f2my-merge-report.json");
const curated = await read(".media-cache/vod-sync/curated-vod-merge-report.json");
const publicMerge = await read(".media-cache/public-vod/merge-report.json");
const sync = await read("public/data/vod-sync-status.json");
const archiveSnapshot = await read(`.media-cache/vod-sync/verified-source-${runDate}.json`);
const verifiedChanges = await read(`.media-cache/vod-sync/verified-merge-report-${runDate}.json`);
const verifiedExpansion = await read(`.media-cache/vod-sync/verified-expansion-report-${runDate}.json`);
const movieshoReview = await read(".media-cache/vod-sync/moviesho-refreshed-report.json");
const verification = await read(".media-cache/public-vod/verification.json");
const music = await read("public/data/music-index.json");
const counts = { titles: 0, links: 0, movies: 0, series: 0, providerLinks: {}, metadata: null };
await streamVodArchiveItems("public/data/vod-catalog.json", item => {
  counts.titles++;
  counts.links += item.links?.length || 0;
  counts[/series|episode|show/i.test(item.type || "") ? "series" : "movies"]++;
  for (const link of item.links || []) {
    const provider = link.sourceProvider || "legacy-or-unspecified";
    counts.providerLinks[provider] = (counts.providerLinks[provider] || 0) + 1;
  }
}, { onMetadata: metadata => { counts.metadata = { updatedAt: metadata.updatedAt, totalTitles: metadata.totalTitles, totalLinks: metadata.totalLinks,
  imdbDatasetCacheOnly: metadata.imdbDatasetCacheOnly, imdbPreservedExistingValues: metadata.imdbPreservedExistingValues }; } });
const compactMerge = report => report && Object.fromEntries(Object.entries(report).filter(([key]) => !/Ids$/.test(key)));
const result = {
  generatedAt: new Date().toISOString(), deploymentPerformed: false,
  catalog: counts,
  sourceReview: publicSources,
  publicSourceMerge: compactMerge(publicMerge),
  f2myMerge: compactMerge(f2my),
  curatedMerge: compactMerge(curated),
  legacyArchive: { sourceTitles: archiveSnapshot?.totalTitles ?? sync?.sourceTitles, sourceLinks: archiveSnapshot?.totalLinks ?? sync?.sourceLinks,
    recoveredFromVerifiedStaging: Boolean(verifiedChanges), changes: compactMerge(verifiedChanges || sync?.changes),
    expansion: verifiedExpansion || sync?.expansion, moviesho: movieshoReview && {
      movieGroups: movieshoReview.movieGroups, seriesFolders: movieshoReview.seriesFolders,
      exactMatches: movieshoReview.exactMatches, existingRefreshed: movieshoReview.existingRefreshed, unresolvedCount: movieshoReview.unresolvedCount,
    } },
  music: music && { tracks: music.tracks.length, artists: music.artists.length,
    retainedLegacyAliases: music.tracks.reduce((sum, track) => sum + (track.idAliases?.length || 0), 0),
    updatedAt: music.updatedAt },
  verification,
  limitations: [
    "No production deployment was performed; this report describes local archive updates.",
    "Unavailable, app-only and sampled-without-public-download sources are explicitly identified, not claimed as fully imported.",
    "FamilyMovie signed media links expire; refresh them again before deploying an older checkout.",
    "The live DonyayeSerial series feed was unavailable; the full archive, selected episode directories and independent providers were used instead.",
    ...(process.env.SOURCE_REFRESH_SKIP_API === "1" ? ["Rich IMDb API enrichment was skipped during this local catch-up because that service was unreachable; the official title dataset is still used."] : []),
    ...(counts.metadata?.imdbDatasetCacheOnly ? ["The bulk IMDb dataset download stalled; a previously verified local dataset was used, preserving non-null current source ratings and votes."] : []),
  ],
};
const file = "public/data/source-refresh-report.json";
const temp = `${file}.${process.pid}.tmp`;
await writeFile(temp, JSON.stringify(result, null, 2));
await rename(temp, file);
console.log(JSON.stringify({ report: file, titles: counts.titles, links: counts.links, music: result.music }));
