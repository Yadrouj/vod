import { spawn } from "node:child_process";
import {
  copyFile,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const SOURCE_URL =
  process.env.VOD_SOURCE_URL ||
  "https://dls2.aparatchi-dlcenter.top/DonyayeSerial/donyaye_serial_all_archive.html";
const DATA_DIR = path.resolve(process.env.VOD_DATA_DIR || path.join("public", "data"));
const WORK_DIR = path.resolve(process.env.VOD_SYNC_WORK_DIR || path.join(".media-cache", "vod-sync"));
const CATALOG_FILE = path.join(DATA_DIR, "vod-catalog.json");
const STATUS_FILE = path.join(DATA_DIR, "vod-sync-status.json");
const LOCK_FILE = path.join(WORK_DIR, "catalog-sync.lock");
const METADATA_INTERVAL_MS = Math.max(
  60 * 60 * 1000,
  Number(process.env.VOD_SYNC_METADATA_INTERVAL_MS || 24 * 60 * 60 * 1000),
);
const MIN_SOURCE_COVERAGE = Math.max(
  0.3,
  Math.min(1, Number(process.env.VOD_SYNC_MIN_SOURCE_COVERAGE || 0.65)),
);
const FORCE = process.env.VOD_SYNC_FORCE === "1";
const DRY_RUN = process.env.VOD_SYNC_DRY_RUN === "1";

async function main() {
  await mkdir(WORK_DIR, { recursive: true });
  const lock = await acquireLock();
  if (!lock) {
    console.log("A catalog sync is already running; this cycle was skipped.");
    return;
  }

  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`;
  const runDir = path.join(WORK_DIR, runId);
  await mkdir(runDir, { recursive: true });

  try {
    const current = await readCatalogHeader(CATALOG_FILE);
    const previousStatus = await readJson(STATUS_FILE);
    const sourceFile = path.join(runDir, "source.json");
    const mergeReportFile = path.join(runDir, "merge-report.json");
    const seriesSourceFile = path.join(runDir, "series-source.json");
    const seriesMergeReportFile = path.join(runDir, "series-merge-report.json");
    const movieshoSourceFile = path.join(runDir, "moviesho-source.json");
    const movieshoReportFile = path.join(runDir, "moviesho-report.json");
    const movieshoMergeReportFile = path.join(runDir, "moviesho-merge-report.json");
    const curatedSourceFile = path.join(runDir, "curated-vod-source.json");
    const curatedReportFile = path.join(runDir, "curated-vod-report.json");
    const curatedMergeReportFile = path.join(runDir, "curated-vod-merge-report.json");

    await run("Scrape and validate DonyayeSerial", "scripts/scrape-vod-archive.mjs", [
      SOURCE_URL,
      sourceFile,
    ]);

    const source = await readCatalogHeader(sourceFile);
    validateCoverage(current, source, previousStatus);
    const mergedFile = path.join(runDir, "catalog-merged.json");
    await run("Merge fresh links without deleting archive history", "scripts/merge-vod-source.mjs", [
      CATALOG_FILE,
      sourceFile,
      mergedFile,
      mergeReportFile,
    ]);
    const movieChanges = await readJson(mergeReportFile);
    if (!movieChanges) throw new Error("Movie merge completed without a validation report.");

    await run(
      "Check recent DonyayeSerial series and episode releases",
      "scripts/scrape-donyaye-series-feed.mjs",
      [seriesSourceFile],
      {
        DONYAYE_SERIES_FEED_CACHE:
          process.env.DONYAYE_SERIES_FEED_CACHE ||
          path.join(WORK_DIR, "series-feed-latest.json"),
      },
    );
    const seriesSource = await readJson(seriesSourceFile);
    let catalogWithFeedsFile = mergedFile;
    let seriesChanges = emptyChanges(movieChanges);
    if ((seriesSource?.items?.length ?? 0) > 0) {
      const seriesMergedFile = path.join(runDir, "catalog-series-merged.json");
      await run(
        "Merge recent series without deleting historical episodes",
        "scripts/merge-vod-source.mjs",
        [mergedFile, seriesSourceFile, seriesMergedFile, seriesMergeReportFile],
      );
      seriesChanges = await readJson(seriesMergeReportFile);
      if (!seriesChanges) {
        throw new Error("Series merge completed without a validation report.");
      }
      catalogWithFeedsFile = seriesMergedFile;
    }
    let changes = combineChanges(movieChanges, seriesChanges);
    const expansionFile = path.join(runDir, "catalog-expanded.json");
    const expansionReportFile = path.join(runDir, "expansion-report.json");
    const expansionIdsFile = path.join(runDir, "series-refresh-ids.json");
    await writeFile(
      expansionIdsFile,
      JSON.stringify(Array.from(new Set([...(changes.addedIds ?? []), ...(changes.updatedIds ?? [])]))),
    );
    await run(
      "Refresh recent and changed series episode directories",
      "scripts/expand-series-episode-links.mjs",
      [catalogWithFeedsFile, expansionFile, expansionReportFile],
      {
        VOD_SERIES_EXPAND_IDS_FILE: expansionIdsFile,
        VOD_SERIES_EXPAND_RECENT_LIMIT:
          process.env.VOD_SERIES_EXPAND_RECENT_LIMIT || "240",
        VOD_SERIES_EXPAND_CACHE:
          process.env.VOD_SERIES_EXPAND_CACHE ||
          path.join(WORK_DIR, "series-expansion-cache.json"),
        VOD_SERIES_EXPAND_CACHE_MAX_AGE_MS:
          process.env.VOD_SERIES_EXPAND_CACHE_MAX_AGE_MS || "21600000",
      },
    );
    const expansion = await readJson(expansionReportFile);
    if (!expansion) throw new Error("Series expansion completed without a validation report.");

    await run(
      "Check Moviesho 2025/2026 movies and series with exact IMDb evidence",
      "scripts/scrape-moviesho-source.mjs",
      [expansionFile, movieshoSourceFile, movieshoReportFile],
      {
        MOVIESHO_MATCH_CACHE:
          process.env.MOVIESHO_MATCH_CACHE || path.join(WORK_DIR, "moviesho-match-cache.json"),
      },
    );
    const movieshoSource = await readJson(movieshoSourceFile);
    const moviesho = await readJson(movieshoReportFile);
    if (!movieshoSource || !moviesho) {
      throw new Error("Moviesho scan completed without a validation report.");
    }
    let catalogAfterSourcesFile = expansionFile;
    let movieshoChanges = emptyChanges(changes);
    if ((movieshoSource.items?.length ?? 0) > 0) {
      const movieshoMergedFile = path.join(runDir, "catalog-moviesho-merged.json");
      await run(
        "Merge only newly matched Moviesho titles",
        "scripts/merge-vod-source.mjs",
        [expansionFile, movieshoSourceFile, movieshoMergedFile, movieshoMergeReportFile],
      );
      movieshoChanges = await readJson(movieshoMergeReportFile);
      if (!movieshoChanges) {
        throw new Error("Moviesho merge completed without a validation report.");
      }
      catalogAfterSourcesFile = movieshoMergedFile;
      changes = combineChanges(changes, movieshoChanges);
    }
    await run(
      "Review curated Moviesho and ZardFilm categories for new or refreshed links",
      "scripts/scrape-curated-vod-sources.mjs",
      [],
      {
        CURATED_VOD_OUTPUT: curatedSourceFile,
        CURATED_VOD_REPORT: curatedReportFile,
        CURATED_VOD_CACHE: process.env.CURATED_VOD_CACHE || path.join(WORK_DIR, "curated-vod-cache.json"),
        CURATED_VOD_CONCURRENCY: process.env.CURATED_VOD_CONCURRENCY || "2",
        CURATED_VOD_REQUEST_GAP_MS: process.env.CURATED_VOD_REQUEST_GAP_MS || "350",
      },
    );
    const curated = await readJson(curatedReportFile);
    const curatedSource = await readJson(curatedSourceFile);
    if (!curated || !curatedSource) {
      throw new Error("Curated source review completed without a validation report.");
    }
    let curatedChanges = emptyChanges(changes);
    if ((curatedSource.items?.length ?? 0) > 0) {
      const curatedMergedFile = path.join(runDir, "catalog-curated-merged.json");
      await run(
        "Merge verified curated source links and timestamps",
        "scripts/merge-curated-vod-source.mjs",
        [catalogAfterSourcesFile, curatedSourceFile, curatedMergedFile, curatedMergeReportFile],
      );
      curatedChanges = await readJson(curatedMergeReportFile);
      if (!curatedChanges) throw new Error("Curated source merge completed without a validation report.");
      catalogAfterSourcesFile = curatedMergedFile;
      changes = combineChanges(changes, curatedChanges);
    }
    const metadataDue =
      FORCE ||
      !previousStatus?.metadataEnrichedAt ||
      Date.now() - Date.parse(previousStatus.metadataEnrichedAt) >= METADATA_INTERVAL_MS;
    const shouldPublish =
      FORCE ||
      changes.added > 0 ||
      changes.updated > 0 ||
      expansion.changedItems > 0 ||
      metadataDue;

    if (!shouldPublish) {
      await writeStatus({
        ...previousStatus,
        ok: true,
        checkedAt: new Date().toISOString(),
        sourceUrl: source.sourceUrl,
        sourceTitles: source.totalTitles,
        sourceLinks: source.totalLinks,
        seriesFeedTitles: seriesSource?.totalTitles ?? 0,
        seriesFeedLinks: seriesSource?.totalLinks ?? 0,
        moviesho,
        movieshoChanges,
        curated,
        curatedChanges,
        changes,
        expansion,
        message: "Source checked; no catalog changes were found.",
      });
      console.log(
        JSON.stringify({ published: false, metadataDue, changes, expansion }, null, 2),
      );
      return;
    }

    const imdbFile = path.join(runDir, "catalog-imdb.json");
    const apiFile = path.join(runDir, "catalog-api.json");
    const idsFile = path.join(runDir, "new-imdb-ids.json");
    const indexFile = path.join(runDir, "vod-index.json");
    const homeFile = path.join(runDir, "vod-home.json");
    const titleMapFile = path.join(runDir, "title-map.json");
    const titlesDir = path.join(runDir, "titles");
    const peopleFile = path.join(runDir, "vod-people.json");
    const topPeopleFile = path.join(runDir, "vod-top-people.json");

    let finalCatalogFile = catalogAfterSourcesFile;
    let metadataEnrichedAt = previousStatus?.metadataEnrichedAt ?? null;
    if (metadataDue || changes.added > 0) {
      await run("Refresh official IMDb title data", "scripts/enrich-vod-imdb.mjs", [
        catalogAfterSourcesFile,
        imdbFile,
      ]);
      finalCatalogFile = imdbFile;
      metadataEnrichedAt = new Date().toISOString();
    }

    const imdbAddedIds = changes.addedIds.filter((id) => /^tt\d{5,12}$/i.test(String(id)));
    if (imdbAddedIds.length > 0) {
      await writeFile(idsFile, JSON.stringify(imdbAddedIds));
      await run(
        "Fetch rich metadata for newly discovered titles",
        "scripts/enrich-vod-api.mjs",
        [finalCatalogFile, apiFile],
        {
          IMDB_API_IDS_FILE: idsFile,
          IMDB_API_LIMIT: process.env.VOD_SYNC_API_LIMIT || "0",
          IMDB_API_RETRIES: process.env.IMDB_API_RETRIES || "1",
          IMDB_API_TIMEOUT_MS: process.env.IMDB_API_TIMEOUT_MS || "12000",
        },
      );
      finalCatalogFile = apiFile;
    }

    await Promise.all([
      run("Build browse and landing indexes", "scripts/build-vod-index.mjs", [
        finalCatalogFile,
        indexFile,
        homeFile,
      ]),
      run("Build per-title pages", "scripts/build-vod-title-files.mjs", [
        finalCatalogFile,
        titlesDir,
        titleMapFile,
      ]),
      run("Build cast index", "scripts/build-vod-people-index.mjs", [
        finalCatalogFile,
        peopleFile,
      ]),
    ]);
    await run("Build top cast rail", "scripts/build-vod-top-people.mjs", [
      peopleFile,
      topPeopleFile,
    ]);

    if (!DRY_RUN) {
      await replaceDirectory(titlesDir, path.join(DATA_DIR, "titles"));
      for (const [sourcePath, targetName] of [
        [titleMapFile, "title-map.json"],
        [indexFile, "vod-index.json"],
        [homeFile, "vod-home.json"],
        [peopleFile, "vod-people.json"],
        [topPeopleFile, "vod-top-people.json"],
        [finalCatalogFile, "vod-catalog.json"],
      ]) {
        await replaceFile(sourcePath, path.join(DATA_DIR, targetName));
      }
    }

    const completedAt = new Date().toISOString();
    const finalSummary = await readCatalogHeader(finalCatalogFile);
    await writeStatus({
      ok: true,
      checkedAt: completedAt,
      publishedAt: DRY_RUN ? previousStatus?.publishedAt ?? null : completedAt,
      metadataEnrichedAt,
      dryRun: DRY_RUN,
      sourceUrl: source.sourceUrl,
      sourceTitles: source.totalTitles,
      sourceLinks: source.totalLinks,
      seriesFeedTitles: seriesSource?.totalTitles ?? 0,
      seriesFeedLinks: seriesSource?.totalLinks ?? 0,
      moviesho,
      movieshoChanges,
      curated,
      curatedChanges,
      catalogTitles: finalSummary.totalTitles,
      catalogLinks: finalSummary.totalLinks,
      changes,
      expansion,
      message: DRY_RUN
        ? "Sync validated in dry-run mode; production data was not replaced."
        : "Catalog, title pages, search indexes and cast indexes were published atomically.",
    });
    console.log(
      JSON.stringify({ published: !DRY_RUN, metadataDue, changes, expansion }, null, 2),
    );
  } catch (error) {
    await writeStatus({
      ok: false,
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    }).catch(() => undefined);
    throw error;
  } finally {
    await rm(runDir, { recursive: true, force: true }).catch(() => undefined);
    await lock.close().catch(() => undefined);
    await unlink(LOCK_FILE).catch(() => undefined);
  }
}

function emptyChanges(base = {}) {
  return {
    added: 0,
    updated: 0,
    unchanged: 0,
    preserved: 0,
    addedIds: [],
    updatedIds: [],
    totalTitles: Number(base.totalTitles ?? 0),
    totalLinks: Number(base.totalLinks ?? 0),
  };
}

function combineChanges(first, second) {
  return {
    added: Number(first.added ?? 0) + Number(second.added ?? 0),
    updated: Number(first.updated ?? 0) + Number(second.updated ?? 0),
    unchanged: Number(first.unchanged ?? 0) + Number(second.unchanged ?? 0),
    preserved: Number(second.preserved ?? first.preserved ?? 0),
    addedIds: Array.from(new Set([...(first.addedIds ?? []), ...(second.addedIds ?? [])])),
    updatedIds: Array.from(
      new Set([...(first.updatedIds ?? []), ...(second.updatedIds ?? [])]),
    ),
    totalTitles: Number(second.totalTitles ?? first.totalTitles ?? 0),
    totalLinks: Number(second.totalLinks ?? first.totalLinks ?? 0),
  };
}

function validateCoverage(current, source, previousStatus) {
  const sourceTitles = Number(source.totalTitles ?? 0);
  const sourceLinks = Number(source.totalLinks ?? 0);
  const currentTitles = Number(current.totalTitles ?? 0);
  const previousSourceLinks = Number(previousStatus?.sourceLinks ?? 0);

  if (sourceTitles < 100 || sourceLinks < 1_000) {
    throw new Error(`Source validation failed: ${sourceTitles} titles / ${sourceLinks} links.`);
  }
  if (
    process.env.ALLOW_LARGE_ARCHIVE_SHRINK !== "1" &&
    (sourceTitles < currentTitles * MIN_SOURCE_COVERAGE ||
      (previousSourceLinks > 0 && sourceLinks < previousSourceLinks * MIN_SOURCE_COVERAGE))
  ) {
    throw new Error(
      `Source coverage is unsafe (${sourceTitles}/${sourceLinks} vs ${currentTitles} catalog titles / ${previousSourceLinks || "no"} previous raw links). Existing data was preserved.`,
    );
  }
}

async function readCatalogHeader(file) {
  const handle = await open(file, "r");
  try {
    const buffer = Buffer.alloc(128 * 1024);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const header = buffer.subarray(0, bytesRead).toString("utf8");
    const totalTitles = Number(/"totalTitles"\s*:\s*(\d+)/.exec(header)?.[1] ?? 0);
    const totalLinks = Number(/"totalLinks"\s*:\s*(\d+)/.exec(header)?.[1] ?? 0);
    const sourceMatch = /"sourceUrl"\s*:\s*("(?:\\.|[^"\\])*")/.exec(header)?.[1];
    if (!totalTitles || !totalLinks) {
      throw new Error(`Could not read catalog summary from ${file}.`);
    }
    return {
      totalTitles,
      totalLinks,
      sourceUrl: sourceMatch ? JSON.parse(sourceMatch) : null,
    };
  } finally {
    await handle.close();
  }
}

async function run(label, script, args, extraEnv = {}) {
  console.log(`\n== ${label} ==`);
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...extraEnv },
      stdio: "inherit",
      windowsHide: true,
    });
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`${label} timed out.`));
    }, Number(process.env.VOD_SYNC_STEP_TIMEOUT_MS || 45 * 60 * 1000));
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(`${label} failed (${signal || `exit ${code}`}).`));
    });
  });
}

async function replaceFile(source, target) {
  await mkdir(path.dirname(target), { recursive: true });
  const incoming = `${target}.incoming-${process.pid}`;
  const backup = `${target}.backup-${process.pid}`;
  await copyFile(source, incoming);
  let hasBackup = false;
  try {
    try {
      await rename(target, backup);
      hasBackup = true;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await rename(incoming, target);
    if (hasBackup) await unlink(backup).catch(() => undefined);
  } catch (error) {
    await unlink(incoming).catch(() => undefined);
    if (hasBackup) await rename(backup, target).catch(() => undefined);
    throw error;
  }
}

async function replaceDirectory(source, target) {
  await mkdir(path.dirname(target), { recursive: true });
  const backup = `${target}.backup-${process.pid}`;
  let hasBackup = false;
  try {
    try {
      await rename(target, backup);
      hasBackup = true;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await rename(source, target);
    if (hasBackup) await rm(backup, { recursive: true, force: true });
  } catch (error) {
    if (hasBackup) await rename(backup, target).catch(() => undefined);
    throw error;
  }
}

async function acquireLock() {
  try {
    const handle = await open(LOCK_FILE, "wx");
    await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    return handle;
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const lockStat = await stat(LOCK_FILE).catch(() => null);
    if (lockStat && Date.now() - lockStat.mtimeMs > 2 * 60 * 60 * 1000) {
      await unlink(LOCK_FILE).catch(() => undefined);
      const handle = await open(LOCK_FILE, "wx");
      await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
      return handle;
    }
    return null;
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function writeStatus(value) {
  const previous = await readJson(STATUS_FILE);
  const payload = { ...(previous ?? {}), ...value };
  const temporary = `${STATUS_FILE}.tmp-${process.pid}`;
  await mkdir(path.dirname(STATUS_FILE), { recursive: true });
  await writeFile(temporary, JSON.stringify(payload, null, 2));
  await replaceFile(temporary, STATUS_FILE);
  await unlink(temporary).catch(() => undefined);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
