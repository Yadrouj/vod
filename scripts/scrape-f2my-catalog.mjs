import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, open, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  extractF2myArchivePageCount,
  f2myLinkIdentity,
  parseF2myArchivePage,
  parseF2myDetailPage,
} from "./f2my-series-lib.mjs";

const execFileAsync = promisify(execFile);
const ROOT = "https://www.f2my.top";
const CACHE_DIR = path.join(".media-cache", "f2my-catalog");
const CACHE_FILE = path.join(CACHE_DIR, "details.json");
const SOURCE_FILE = path.join(".media-cache", "vod-sync", "f2my-source.json");
const REPORT_FILE = path.join(".media-cache", "vod-sync", "f2my-merge-report.json");
const IDS_FILE = path.join(".media-cache", "vod-sync", "f2my-imdb-ids.json");
const STATUS_SNAPSHOT_DIR = path.join("data", "f2my-scrape-status");
const STATUS_SNAPSHOT_FILES = [
  path.join(STATUS_SNAPSHOT_DIR, "slot-a.json"),
  path.join(STATUS_SNAPSHOT_DIR, "slot-b.json"),
];
const CONTROL_FILE = path.join("data", "f2my-scrape-control.json");
const REGISTRY_FILE = path.join("data", "source-link-registry.json");
const CATALOG_FILE = path.join("public", "data", "vod-catalog.json");

const args = new Set(process.argv.slice(2));
const valueArg = (name, fallback) => {
  const prefix = `${name}=`;
  const raw = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return raw ? raw.slice(prefix.length) : fallback;
};
const full = args.has("--full");
const enrichOnly = args.has("--enrich-only");
const noMerge = args.has("--no-merge");
const noBuild = args.has("--no-build");
const skipImdb = args.has("--skip-imdb");
const skipImdbLookup = args.has("--skip-imdb-lookup");
const limit = Math.max(0, Number(valueArg("--limit", "0")) || 0);
const concurrency = Math.min(8, Math.max(1, Number(valueArg("--concurrency", process.env.F2MY_SCRAPE_CONCURRENCY || "4")) || 4));
const archiveConcurrency = Math.min(6, Math.max(1, Number(valueArg("--archive-concurrency", "2")) || 2));
const staleHours = Math.max(1, Number(valueArg("--stale-hours", process.env.F2MY_STALE_HOURS || "168")) || 168);
const freshPages = Math.max(1, Number(valueArg("--fresh-pages", process.env.F2MY_FRESH_PAGES || "3")) || 3);
const archivePageLimit = Math.max(0, Number(valueArg("--archive-page-limit", "0")) || 0);
const timeoutMs = Math.max(5_000, Number(process.env.F2MY_FETCH_TIMEOUT_MS || 30_000));
const staleMs = staleHours * 60 * 60 * 1_000;

let status = {
  jobId: `f2my-${Date.now().toString(36)}`,
  pid: process.pid,
  state: "running",
  phase: "starting",
  mode: full ? "full" : "incremental",
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  finishedAt: null,
  archivePages: { total: 0, processed: 0 },
  totals: { discovered: 0, queued: 0, processed: 0, newTitles: 0, updatedTitles: 0, unchanged: 0, linksFound: 0, newLinks: 0, baseMappings: 0, baseMappingsUpdated: 0, failures: 0 },
  currentTitle: null,
  recentLogs: [],
  cancelRequested: false,
  error: null,
};
let statusWriteChain = Promise.resolve();
let cacheWriteChain = Promise.resolve();
let statusRevision = Date.now();
let statusSlot = 0;
let lastStatusSnapshotAt = 0;
let lastCacheCheckpointAt = 0;
let lastCancelCheckAt = 0;
let lastCancelCheckResult = false;
const STATUS_SNAPSHOT_INTERVAL_MS = 750;
const CACHE_CHECKPOINT_INTERVAL_MS = 15_000;

function log(message) {
  const stamped = `${new Date().toLocaleTimeString("en-GB", { hour12: false })}  ${message}`;
  status.recentLogs = [...status.recentLogs, stamped].slice(-24);
  console.log(stamped);
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await rename(temporary, file);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 40));
    }
  }
  throw lastError;
}

async function writeStatusSnapshot(value) {
  await mkdir(STATUS_SNAPSHOT_DIR, { recursive: true });
  const file = STATUS_SNAPSHOT_FILES[statusSlot % STATUS_SNAPSHOT_FILES.length];
  statusSlot += 1;
  const payload = {
    ...value,
    statusRevision: ++statusRevision,
  };
  const handle = await open(file, "w");
  try {
    await handle.writeFile(`${JSON.stringify(payload, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function saveStatus(patch = {}, options = {}) {
  status = { ...status, ...patch, updatedAt: new Date().toISOString() };
  const force = Boolean(options.force);
  if (!force && Date.now() - lastStatusSnapshotAt < STATUS_SNAPSHOT_INTERVAL_MS) return;
  lastStatusSnapshotAt = Date.now();
  const snapshot = JSON.parse(JSON.stringify(status));
  statusWriteChain = statusWriteChain.catch(() => undefined).then(() => writeStatusSnapshot(snapshot));
  await statusWriteChain;
}

async function saveCache(cache, options = {}) {
  // Detail workers finish out of order. Serialising snapshots prevents a slower
  // worker from replacing a newer cache write with an earlier in-memory view.
  const force = Boolean(options.force);
  if (!force && Date.now() - lastCacheCheckpointAt < CACHE_CHECKPOINT_INTERVAL_MS) return;
  lastCacheCheckpointAt = Date.now();
  const snapshot = JSON.parse(JSON.stringify(cache));
  cacheWriteChain = cacheWriteChain.catch(() => undefined).then(() => writeJsonAtomic(CACHE_FILE, snapshot));
  await cacheWriteChain;
}

async function isCancelRequested() {
  if (Date.now() - lastCancelCheckAt < 650) return lastCancelCheckResult;
  lastCancelCheckAt = Date.now();
  try {
    const persisted = JSON.parse(await readFile(CONTROL_FILE, "utf8"));
    lastCancelCheckResult = Boolean(persisted.cancelRequested);
  } catch {
    lastCancelCheckResult = false;
  }
  return lastCancelCheckResult;
}

async function throwIfCancelled() {
  if (await isCancelRequested()) {
    status.cancelRequested = true;
    throw new Error("Cancelled from the admin dashboard.");
  }
}

async function fetchText(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "SarvNema catalog updater/1.0 (+https://sarvnema.ir)" },
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
  throw lastError;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "SarvNema catalog updater/1.0 (+https://sarvnema.ir)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function mapPool(values, workers, callback) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(workers, values.length || 1) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= values.length) return;
      await callback(values[index], index);
    }
  }));
}

async function discoverArchive(kind) {
  const root = `${ROOT}/${kind === "series" ? "series" : "movies"}/`;
  const firstPage = await fetchText(root);
  const pageCount = extractF2myArchivePageCount(firstPage, kind);
  const pages = Array.from({ length: archivePageLimit ? Math.min(pageCount, archivePageLimit) : pageCount }, (_, index) => index + 1);
  status.archivePages.total += pages.length;
  await saveStatus({ phase: `discovering ${kind}` });
  log(`${kind}: discovered ${pageCount} archive pages; scanning ${pages.length}`);

  const entriesByUrl = new Map();
  const ingest = (html, page) => {
    const pageUrl = page === 1 ? root : `${root}page/${page}/`;
    for (const entry of parseF2myArchivePage(html, kind, pageUrl)) {
      entriesByUrl.set(entry.link, { ...entry, archiveIndex: page });
    }
  };
  ingest(firstPage, 1);
  status.archivePages.processed += 1;
  await saveStatus();

  await mapPool(pages.slice(1), archiveConcurrency, async (page) => {
    await throwIfCancelled();
    try {
      ingest(await fetchText(`${root}page/${page}/`), page);
    } catch (error) {
      status.totals.failures += 1;
      log(`${kind} archive page ${page} failed: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      status.archivePages.processed += 1;
      await saveStatus();
    }
  });
  return Array.from(entriesByUrl.values());
}

function allItemLinks(item) {
  return [...(item?.links ?? []), ...(item?.f2myExtraLinks ?? [])];
}

function reconcileRotatedBases(previous, parsed) {
  if (!previous?.item) return parsed;
  const previousByIdentity = new Map(allItemLinks(previous.item)
    .filter((link) => link.sourceProvider === "f2my")
    .map((link) => [f2myLinkIdentity(link), link]));
  const scannedBases = new Map(parsed.bases.map((base) => [base.id, base]));
  const activeBases = new Map(parsed.bases.map((base) => [base.id, base]));

  for (const link of allItemLinks(parsed.item)) {
    if (link.sourceProvider !== "f2my" || !link.sourceBaseId) continue;
    const prior = previousByIdentity.get(f2myLinkIdentity(link));
    if (!prior?.sourceBaseId || prior.sourceBaseId === link.sourceBaseId) continue;
    const newBase = scannedBases.get(link.sourceBaseId);
    if (!newBase) continue;
    activeBases.delete(link.sourceBaseId);
    activeBases.set(prior.sourceBaseId, { ...newBase, id: prior.sourceBaseId, label: `F2MY ${newBase.host}` });
    link.sourceBaseId = prior.sourceBaseId;
  }
  return { ...parsed, bases: Array.from(activeBases.values()) };
}

async function updateSourceRegistry(bases) {
  const registry = await readJson(REGISTRY_FILE, { version: 1, updatedAt: null, bases: {} });
  const now = new Date().toISOString();
  let changed = 0;
  for (const base of bases) {
    if (!base?.id || !base?.baseUrl) continue;
    const existing = registry.bases[base.id];
    const normalized = normalizeBaseUrl(base.baseUrl);
    const next = {
      id: base.id,
      provider: "f2my",
      label: base.label || `F2MY ${base.host || new URL(normalized).host}`,
      baseUrl: existing?.manual ? existing.baseUrl : normalized,
      aliases: Array.from(new Set([...(existing?.aliases ?? []), existing?.baseUrl, normalized].filter(Boolean))),
      manual: Boolean(existing?.manual),
      discoveredAt: existing?.discoveredAt || now,
      lastSeenAt: now,
      updatedAt: existing?.manual ? existing.updatedAt || now : now,
    };
    if (!existing || JSON.stringify(existing) !== JSON.stringify(next)) changed += 1;
    registry.bases[base.id] = next;
  }
  registry.updatedAt = now;
  await writeJsonAtomic(REGISTRY_FILE, registry);
  status.totals.baseMappings = Object.values(registry.bases).filter((base) => base.provider === "f2my").length;
  status.totals.baseMappingsUpdated += changed;
  await saveStatus();
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/+$/, "") + "/";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function needsFetch(entry, cached) {
  if (full || !cached?.item) return true;
  if (entry.archiveIndex <= freshPages) return true;
  const fetchedAt = Date.parse(cached.fetchedAt || "");
  return !Number.isFinite(fetchedAt) || Date.now() - fetchedAt > staleMs;
}

function normalizeTitle(value) {
  return String(value || "")
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function imdbSuggestionScore(item, candidate) {
  if (!/^tt\d+$/i.test(candidate?.id || "")) return -Infinity;
  const candidateType = `${candidate.qid || ""} ${candidate.q || ""}`.toLowerCase();
  const expectedType = item.type === "series" ? /tv|series|mini/ : /movie|feature/;
  if (!expectedType.test(candidateType)) return -Infinity;
  const wanted = normalizeTitle(item.title);
  const actual = normalizeTitle(candidate.l);
  if (!wanted || !actual) return -Infinity;
  const wantedTokens = new Set(wanted.split(" "));
  const actualTokens = new Set(actual.split(" "));
  let shared = 0;
  for (const token of wantedTokens) if (actualTokens.has(token)) shared += 1;
  const overlap = shared / Math.max(wantedTokens.size, actualTokens.size, 1);
  const titleScore = wanted === actual ? 180 : (wanted.includes(actual) || actual.includes(wanted) ? 75 : overlap * 70);
  const yearScore = item.year && candidate.y ? Math.max(-24, 18 - Math.abs(Number(item.year) - Number(candidate.y)) * 7) : 0;
  const rankScore = candidate.rank ? Math.max(0, 10 - Math.log10(Number(candidate.rank) + 1)) : 0;
  return titleScore + yearScore + rankScore;
}

async function resolveMissingImdb(item, cache) {
  if (skipImdbLookup || /^tt\d+$/i.test(item.imdbCode || "")) return item;
  cache.imdbSuggestions ??= {};
  const key = `${item.type}:${normalizeTitle(item.title)}:${item.year || ""}`;
  let candidate = cache.imdbSuggestions[key];
  if (!candidate) {
    try {
      const payload = await fetchJson(`https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(normalizeTitle(item.title).replace(/\s+/g, "_"))}.json`);
      candidate = (payload?.d || [])
        .map((value) => ({ value, score: imdbSuggestionScore(item, value) }))
        .sort((left, right) => right.score - left.score)[0]?.value || null;
      cache.imdbSuggestions[key] = candidate;
    } catch (error) {
      log(`IMDb lookup skipped for ${item.title}: ${error instanceof Error ? error.message : "unknown error"}`);
      cache.imdbSuggestions[key] = null;
      return item;
    }
  }
  if (!candidate || imdbSuggestionScore(item, candidate) < 72) return item;
  return {
    ...item,
    id: candidate.id,
    imdbCode: candidate.id,
    imdbUrl: `https://www.imdb.com/title/${candidate.id}/`,
    title: candidate.l || item.title,
    year: Number(candidate.y) || item.year || null,
    posterUrl: item.posterUrl || candidate.i?.imageUrl || null,
  };
}

async function runCommand(commandArgs, phase, extraEnv = {}) {
  await saveStatus({ phase });
  log(phase);
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, commandArgs, {
      windowsHide: true,
      env: { ...process.env, ...extraEnv, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --max-old-space-size=4096`.trim() },
      maxBuffer: 8 * 1024 * 1024,
    });
    const message = (stdout || stderr || "completed").trim().split(/\r?\n/).at(-1);
    if (message) log(message.slice(0, 500));
    return true;
  } catch (error) {
    log(`${phase} skipped: ${error instanceof Error ? error.message : "unknown error"}`);
    return false;
  }
}

async function writeAddedImdbIds(report) {
  const ids = [...new Set((report?.addedIds ?? []).filter((id) => /^tt\d+$/i.test(id)))];
  await writeJsonAtomic(IDS_FILE, { ids });
  return ids;
}

async function enrichF2myTitles() {
  const enriched = await runCommand(
    ["scripts/enrich-vod-api.mjs", CATALOG_FILE, CATALOG_FILE],
    "enriching new F2MY titles from IMDb",
    {
      IMDB_API_IDS_FILE: IDS_FILE,
      // Large source archives must remain lean; title pages can request extended
      // cast/gallery data on demand instead of putting every asset in the catalog.
      IMDB_API_LIGHTWEIGHT: "1",
      IMDB_API_WRITE_EVERY: "0",
    }
  );
  if (!enriched) throw new Error("IMDb enrichment did not complete. The F2MY crawl data remains available.");
}

async function rebuildCatalogOutputs() {
  if (noBuild) return;
  if (!await runCommand(["scripts/build-vod-title-files.mjs", CATALOG_FILE], "building title pages")) {
    throw new Error("Title files could not be rebuilt after the F2MY merge.");
  }
  if (!await runCommand(["scripts/build-vod-index.mjs", CATALOG_FILE], "building browse and home indexes")) {
    throw new Error("Browse indexes could not be rebuilt after the F2MY merge.");
  }
}

async function main() {
  await saveStatus();
  if (enrichOnly) {
    log("Starting lightweight IMDb enrichment for newly added F2MY titles");
    const report = await readJson(REPORT_FILE, null);
    const ids = await writeAddedImdbIds(report);
    if (ids.length) await enrichF2myTitles();
    else log("No newly added IMDb IDs are waiting for enrichment");
    await rebuildCatalogOutputs();
    await saveStatus({ state: "completed", phase: "completed", finishedAt: new Date().toISOString() });
    log("F2MY IMDb enrichment complete");
    return;
  }
  log(`Starting ${full ? "full" : "incremental"} F2MY movie + series crawl`);
  const cache = await readJson(CACHE_FILE, { version: 1, updatedAt: null, entries: {} });
  cache.entries ??= {};
  const [movies, series] = await Promise.all([discoverArchive("movie"), discoverArchive("series")]);
  const entries = [...movies, ...series];
  status.totals.discovered = entries.length;
  const targets = entries.filter((entry) => needsFetch(entry, cache.entries[entry.link]));
  const selected = limit ? targets.slice(0, limit) : targets;
  status.totals.queued = selected.length;
  await saveStatus({ phase: "scraping detail pages" });
  log(`Found ${entries.length} unique titles; ${selected.length} detail pages need refresh`);

  const bases = new Map();
  await mapPool(selected, concurrency, async (entry, index) => {
    await throwIfCancelled();
    status.currentTitle = entry.cardTitle || entry.slug || entry.link;
    try {
      const parsed = reconcileRotatedBases(cache.entries[entry.link], parseF2myDetailPage(await fetchText(entry.link), entry));
      if (!parsed.item.links.length) throw new Error("no direct media links were found");
      parsed.item = await resolveMissingImdb(parsed.item, cache);
      cache.entries[entry.link] = { entry, fetchedAt: new Date().toISOString(), item: parsed.item };
      for (const base of parsed.bases) bases.set(base.id, base);
      status.totals.linksFound += parsed.item.links.length;
    } catch (error) {
      status.totals.failures += 1;
      log(`Detail failed ${entry.link}: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      status.totals.processed += 1;
      if ((index + 1) % 10 === 0 || index + 1 === selected.length) {
        cache.updatedAt = new Date().toISOString();
        await saveCache(cache);
      }
      await saveStatus();
    }
  });

  cache.updatedAt = new Date().toISOString();
  await saveCache(cache);
  await updateSourceRegistry(Array.from(bases.values()));
  const items = entries.map((entry) => cache.entries[entry.link]?.item).filter((item) => item?.links?.length);
  await writeJsonAtomic(SOURCE_FILE, {
    sourceUrl: ROOT,
    sourceUrls: [`${ROOT}/movies/`, `${ROOT}/series/`],
    generatedAt: new Date().toISOString(),
    mode: full ? "full" : "incremental",
    discovered: entries.length,
    items,
  });

  if (!noMerge) {
    const merged = await runCommand(["scripts/merge-f2my-source.mjs", CATALOG_FILE, SOURCE_FILE, CATALOG_FILE, REPORT_FILE], "merging F2MY titles into catalog");
    if (!merged) throw new Error("F2MY source could not be merged into the catalog.");
    const report = await readJson(REPORT_FILE, null);
    if (report) {
      status.totals.newTitles = report.added || 0;
      status.totals.updatedTitles = report.updated || 0;
      status.totals.unchanged = report.unchanged || 0;
      status.totals.newLinks = report.newLinks || 0;
      await writeAddedImdbIds(report);
      await saveStatus();
    }
    if (!skipImdb && report?.addedIds?.length) {
      await enrichF2myTitles();
    }
    await rebuildCatalogOutputs();
  }

  status.currentTitle = null;
  await saveStatus({ state: "completed", phase: "completed", finishedAt: new Date().toISOString() }, { force: true });
  log("F2MY crawl complete");
}

main().catch(async (error) => {
  const cancelled = /cancelled/i.test(error instanceof Error ? error.message : "");
  status.currentTitle = null;
  await saveStatus({
    state: cancelled ? "cancelled" : "failed",
    phase: cancelled ? "cancelled" : "failed",
    finishedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : "Unknown scraper error",
  }, { force: true }).catch(() => undefined);
  console.error(error);
  process.exitCode = cancelled ? 0 : 1;
});
