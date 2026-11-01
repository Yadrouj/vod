import { readFile, rename, writeFile } from "node:fs/promises";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";

const read = async file => { try { return JSON.parse(await readFile(file, "utf8")); } catch { return null; } };
const runDate = process.env.SOURCE_REFRESH_RUN_DATE || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(runDate)) throw new Error("Invalid report run date");
const publicSources = await read(".media-cache/public-vod/report.json");
const f2my = await read(".media-cache/vod-sync/f2my-merge-report.json");
const categoryReview = await read(".media-cache/vod-sync/category-refresh-report.json");
const categoryMerge = await read(".media-cache/vod-sync/category-refresh-merge-report.json");
const mihanReview = await read(".media-cache/vod-sync/mihan-refreshed-source.json");
const mihanMerge = await read(".media-cache/vod-sync/mihan-refreshed-merge-report.json");
const f2myRecent = await read(".media-cache/vod-sync/f2my-recent-merge-report.json");
const retentionAudit = await read(".media-cache/vod-sync/final-retention-audit.json");
const regionalMediaAudit = await read(".media-cache/vod-sync/regional-media-audit.json");
const regionalUnavailable = await read(".media-cache/vod-sync/regional-unavailable-media-report.json");
const combinedMedia = await read(".media-cache/vod-sync/combined-media-verification.json");
const curated = await read(".media-cache/vod-sync/curated-vod-merge-report.json");
const publicMerge = await read(".media-cache/public-vod/merge-report.json");
const sync = await read("public/data/vod-sync-status.json");
const archiveSnapshot = await read(`.media-cache/vod-sync/verified-source-${runDate}.json`);
const verifiedChanges = await read(`.media-cache/vod-sync/verified-merge-report-${runDate}.json`);
const verifiedExpansion = await read(`.media-cache/vod-sync/verified-expansion-report-${runDate}.json`);
const movieshoReview = await read(".media-cache/vod-sync/moviesho-refreshed-report.json");
const movieshoImdbReview = await read(".media-cache/vod-sync/moviesho-imdb-report.json");
const curatedFullReview = await read(".media-cache/vod-sync/curated-vod-full-report.json");
const curatedFullMerge = await read(".media-cache/vod-sync/curated-vod-full-merge-report.json");
const zardfilmReview = await read(".media-cache/vod-sync/zardfilm-full-report.json");
const zardfilmMerge = await read(".media-cache/vod-sync/zardfilm-full-merge-report.json");
const imdbFreshAudit = await read(".media-cache/vod-sync/imdb-fresh-audit.json");
const externalPagesReport = await read(".media-cache/vod-sync/external-download-pages-report.json");
const unavailableMediaReport = await read(".media-cache/vod-sync/unavailable-media-report.json");
const directZardfilm = await read(".media-cache/vod-sync/zardfilm-direct-source.json");
const mediaVerification = await read(".media-cache/vod-sync/zardfilm-new-upera-verification.json");
const additionalSourceReview = await read(".media-cache/public-vod/additional-review.json");
const chartStatus = await read("data/imdb-trending-status.json");
const musicRefresh = await read("data/daily-music-refresh-status.json");
const f2mySlots = (await Promise.all(["a", "b"].map(slot => read(`data/f2my-scrape-status/slot-${slot}.json`)))).filter(Boolean);
const f2myCollection = f2mySlots.sort((a,b) => (b.statusRevision || 0) - (a.statusRevision || 0))[0];
const verification = await read(".media-cache/public-vod/verification.json");
const music = await read("public/data/music-index.json");
const counts = { titles: 0, titlesWithDownloadLinks: 0, links: 0, externalDownloadPages: 0, unavailableDownloadLinks: 0, movies: 0, series: 0, providerLinks: {}, metadata: null };
await streamVodArchiveItems("public/data/vod-catalog.json", item => {
  counts.titles++;
  counts.links += item.links?.length || 0;
  if (item.links?.length) counts.titlesWithDownloadLinks++;
  counts.externalDownloadPages += item.externalDownloadPages?.length || 0;
  counts.unavailableDownloadLinks += item.unavailableDownloadLinks?.length || 0;
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
  additionalSourceReview,
  followUp: {
    regionalReview: { categories: categoryReview, merge: compactMerge(categoryMerge),
      iranianDirectories: mihanReview && { sourceUrl: mihanReview.sourceUrl, scrapedAt: mihanReview.scrapedAt, titles: mihanReview.totalTitles, links: mihanReview.totalLinks, discovery: mihanReview.discovery },
      iranianMerge: compactMerge(mihanMerge), latestForeignEpisodes: compactMerge(f2myRecent) },
    retentionAudit,
    regionalMediaAudit,
    regionalOpaqueMedia: { separation: regionalUnavailable, checks: combinedMedia && { checkedAt: combinedMedia.checkedAt,
      completed: combinedMedia.finished, total: combinedMedia.results.length,
      video: combinedMedia.results.filter(check => check.contentType?.startsWith("video/")).length,
      html: combinedMedia.results.filter(check => check.contentType?.includes("html")).length,
      networkErrors: combinedMedia.results.filter(check => check.error).length } },
    imdbFreshAudit,
    imdbPopularityCharts: chartStatus,
    movieshoExactImdb: movieshoImdbReview && { checkedAt: movieshoImdbReview.checkedAt,
      movieGroups: movieshoImdbReview.movieGroups, seriesFolders: movieshoImdbReview.seriesFolders,
      exactMatches: movieshoImdbReview.exactMatches, unresolvedCount: movieshoImdbReview.unresolvedCount },
    curatedFull: { review: curatedFullReview, merge: compactMerge(curatedFullMerge) },
    zardfilmFull: { review: zardfilmReview, merge: compactMerge(zardfilmMerge) },
    directMediaValidation: { externalPagesReport, unavailableMediaReport,
      zardfilmEligibleTitles: directZardfilm?.totalTitles, zardfilmEligibleLinks: directZardfilm?.totalLinks,
      newUperaChecks: mediaVerification && { finished: mediaVerification.finished, checked: mediaVerification.results.length,
        videoResponses: mediaVerification.results.filter(check => check.contentType?.startsWith("video/")).length,
        htmlResponses: mediaVerification.results.filter(check => check.contentType?.includes("html")).length,
        networkErrors: mediaVerification.results.filter(check => check.error).length } },
    f2myCollection: f2myCollection && { state: f2myCollection.state, startedAt: f2myCollection.startedAt,
      updatedAt: f2myCollection.updatedAt, finishedAt: f2myCollection.finishedAt, totals: f2myCollection.totals },
    musicRefresh: musicRefresh && { state: musicRefresh.state, startedAt: musicRefresh.startedAt,
      finishedAt: musicRefresh.finishedAt, steps: musicRefresh.steps },
  },
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
    "Extraction counts are not all confirmed direct files: HTML download applications and explicitly verified unavailable files are retained separately from playable download links.",
    "The live DonyayeSerial series feed was unavailable; the full archive, selected episode directories and independent providers were used instead.",
    ...(chartStatus && Object.values(chartStatus.outcomes || {}).some(outcome => outcome.state === "retained") ? ["The current official IMDb ratings/basics dataset and the popularity charts are separate: challenged or unavailable charts retain their previous capture, not a fabricated current trend list."] : []),
    ...(process.env.SOURCE_REFRESH_SKIP_API === "1" ? ["Rich IMDb API enrichment was skipped during this local catch-up because that service was unreachable; the official title dataset is still used."] : []),
    ...(counts.metadata?.imdbDatasetCacheOnly && !(imdbFreshAudit?.verified && Date.now() - Date.parse(imdbFreshAudit.checkedAt) < 30 * 60 * 60_000) ? ["IMDb enrichment used the existing verified local dataset, preserving non-null current source ratings and votes; this report does not claim a successful new dataset download."] : []),
  ],
};
const file = "public/data/source-refresh-report.json";
const temp = `${file}.${process.pid}.tmp`;
await writeFile(temp, JSON.stringify(result, null, 2));
await rename(temp, file);
console.log(JSON.stringify({ report: file, titles: counts.titles, links: counts.links, music: result.music }));
