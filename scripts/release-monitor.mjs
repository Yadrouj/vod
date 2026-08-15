import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";
import {
  buildReleaseMonitorResult,
  normalizeImdbCandidate,
  summarizeCatalogItem,
} from "./release-monitor-lib.mjs";

const args = new Set(process.argv.slice(2));
const valueArg = (name, fallback) => {
  const prefix = `${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || fallback;
};
const ROOT = process.cwd();
const CATALOG_FILE = path.resolve(valueArg("--catalog", process.env.RELEASE_MONITOR_CATALOG || path.join("public", "data", "vod-catalog.json")));
const OUTPUT_FILE = path.resolve(valueArg("--output", process.env.RELEASE_MONITOR_OUTPUT || path.join("public", "data", "vod-updates.json")));
const STATE_FILE = path.resolve(valueArg("--state", process.env.RELEASE_MONITOR_STATE || path.join("data", "release-monitor-state.json")));
const STATUS_FILE = path.resolve(valueArg("--status", process.env.RELEASE_MONITOR_STATUS || path.join("data", "release-monitor-status.json")));
const LOCK_FILE = path.resolve(valueArg("--lock", process.env.RELEASE_MONITOR_LOCK || path.join("data", "release-monitor.lock")));
const DRY_RUN = args.has("--dry-run");
const SKIP_IMDB = args.has("--skip-imdb");
const RETENTION_DAYS = Math.max(1, Number(process.env.RELEASE_MONITOR_RETENTION_DAYS || 14));
const REQUEST_TIMEOUT_MS = Math.max(4_000, Number(process.env.RELEASE_MONITOR_TIMEOUT_MS || 15_000));
const USER_AGENT = "SarvNema Release Monitor/1.0 (+https://sarvnema.ir)";
const IMDB_SEARCH_TYPES = [
  { name: "films", type: "feature" },
  { name: "series", type: "tv_series,tv_miniseries" },
];

async function main() {
  const lock = await acquireLock();
  if (!lock) {
    console.log(JSON.stringify({ skipped: true, reason: "Release monitor is already running." }));
    return;
  }
  const startedAt = new Date().toISOString();
  try {
    await writeJsonAtomic(STATUS_FILE, { state: "running", startedAt, updatedAt: startedAt, phase: "Reading source catalog", error: null });
    const [previousState, catalogItems] = await Promise.all([
      readJson(STATE_FILE, { version: 1, items: {}, updates: [] }),
      readCatalogSummaries(CATALOG_FILE),
    ]);
    await writeJsonAtomic(STATUS_FILE, { state: "running", startedAt, updatedAt: new Date().toISOString(), phase: "Discovering current IMDb releases", catalogTitles: catalogItems.length, error: null });
    const imdb = SKIP_IMDB ? { candidates: [], sources: [], failures: [] } : await discoverImdbCandidates();
    const now = new Date();
    const result = buildReleaseMonitorResult({
      catalogItems,
      previousState,
      imdbCandidates: imdb.candidates,
      now,
      retentionDays: RETENTION_DAYS,
    });
    const payload = {
      generatedAt: now.toISOString(),
      sources: imdb.sources,
      bootstrap: result.bootstrap,
      summary: result.summary,
      items: result.updates,
    };
    if (!DRY_RUN) {
      await Promise.all([
        writeJsonAtomic(OUTPUT_FILE, payload),
        writeJsonAtomic(STATE_FILE, result.state),
      ]);
    }
    await writeJsonAtomic(STATUS_FILE, {
      state: "completed",
      startedAt,
      finishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phase: DRY_RUN ? "Validated without writing output" : "Update feed published",
      dryRun: DRY_RUN,
      bootstrap: result.bootstrap,
      summary: result.summary,
      imdbFailures: imdb.failures,
      outputFile: OUTPUT_FILE,
      error: null,
    });
    console.log(JSON.stringify({ dryRun: DRY_RUN, bootstrap: result.bootstrap, ...result.summary, imdbFailures: imdb.failures.length }, null, 2));
  } catch (error) {
    await writeJsonAtomic(STATUS_FILE, {
      state: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    }).catch(() => undefined);
    throw error;
  } finally {
    await lock.close().catch(() => undefined);
    await unlink(LOCK_FILE).catch(() => undefined);
  }
}

async function readCatalogSummaries(file) {
  const items = [];
  await streamVodArchiveItems(file, async (item) => {
    items.push(summarizeCatalogItem(item));
  });
  return items;
}

async function discoverImdbCandidates() {
  const customUrls = String(process.env.IMDB_RELEASE_DISCOVERY_URLS || "")
    .split(/\s*,\s*/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (!customUrls.length) return discoverCurrentImdbReleases();
  const urls = customUrls;
  const sources = [];
  const failures = [];
  const candidates = [];
  for (const url of urls) {
    sources.push(url);
    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const contentType = response.headers.get("content-type") || "";
      const body = await response.text();
      const data = contentType.includes("json") || /^\s*[\[{]/.test(body) ? JSON.parse(body) : null;
      const values = Array.isArray(data?.d) ? data.d : Array.isArray(data?.items) ? data.items : [];
      for (const value of values) {
        const candidate = normalizeImdbCandidate(value, "IMDb");
        if (candidate) candidates.push(candidate);
      }
    } catch (error) {
      failures.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const seen = new Set();
  return {
    sources,
    failures,
    candidates: candidates.filter((candidate) => {
      if (seen.has(candidate.imdbCode)) return false;
      seen.add(candidate.imdbCode);
      return true;
    }),
  };
}

async function discoverCurrentImdbReleases() {
  const now = new Date();
  const end = formatImdbDate(now);
  const start = formatImdbDate(new Date(now.getTime() - Math.max(1, Number(process.env.IMDB_RELEASE_LOOKBACK_DAYS || 7)) * 86_400_000));
  const sources = [];
  const failures = [];
  const candidates = [];
  for (const entry of IMDB_SEARCH_TYPES) {
    const url = `https://www.imdb.com/search/title/?title_type=${encodeURIComponent(entry.type)}&release_date=${start},${end}&sort=release_date,desc`;
    sources.push(url);
    try {
      const response = await fetchWithTimeout(url, { "user-agent": "facebookexternalhit/1.1", "accept-language": "en-US,en;q=0.9" });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const html = await response.text();
      const releases = parseImdbReleaseSearch(html, entry.type);
      if (!releases.length) throw new Error("IMDb returned no parsable release cards.");
      candidates.push(...releases);
    } catch (error) {
      failures.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const seen = new Set();
  return {
    sources,
    failures,
    candidates: candidates.filter((candidate) => {
      if (seen.has(candidate.imdbCode)) return false;
      seen.add(candidate.imdbCode);
      return true;
    }),
  };
}

function parseImdbReleaseSearch(html, type) {
  const entries = Array.from(html.matchAll(/<li\b[^>]*class=["'][^"']*ipc-metadata-list-summary-item[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi));
  return entries.map((match) => {
    const card = match[1];
    const imdbCode = card.match(/\/title\/(tt\d{5,})\//i)?.[1]?.toLowerCase() ?? "";
    const title = decodeHtml(card.match(/<h4\b[^>]*>\s*\d+\.\s*([^<]+)<\/h4>/i)?.[1] ?? "");
    const imageUrl = decodeHtml(card.match(/<img\b[^>]+src=["']([^"']+)["']/i)?.[1] ?? "") || null;
    const releaseText = decodeHtml(card.match(/Releases?\s+([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})/i)?.[1] ?? "");
    if (!imdbCode || !title) return null;
    const releasedAt = releaseText ? new Date(`${releaseText} UTC`) : null;
    const candidate = normalizeImdbCandidate({
      id: imdbCode,
      l: title,
      q: type,
      y: releasedAt && !Number.isNaN(releasedAt.getTime()) ? releasedAt.getUTCFullYear() : null,
      i: imageUrl ? { imageUrl } : null,
      releaseDate: releasedAt && !Number.isNaN(releasedAt.getTime()) ? releasedAt.toISOString().slice(0, 10) : null,
    }, "IMDb release calendar");
    if (!candidate) return null;
    if (candidate.releaseDate) return candidate;
    // IMDb's series list often shows an open release range (for example
    // "2026–") rather than a separate "Releases Aug …" label. The query is
    // already bounded by the current window, so retaining those cards gives
    // us newly released series without guessing a date.
    if (/tv_series|tv_miniseries/i.test(type)) return candidate;
    return null;
  }).filter(Boolean);
}

function decodeHtml(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function formatImdbDate(date) {
  return date.toISOString().slice(0, 10);
}

async function fetchWithTimeout(url, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "application/json,text/html;q=0.8,*/*;q=0.5", ...headers },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

async function acquireLock() {
  await mkdir(path.dirname(LOCK_FILE), { recursive: true });
  try {
    const handle = await open(LOCK_FILE, "wx");
    await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    return handle;
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const lockStat = await stat(LOCK_FILE).catch(() => null);
    if (lockStat && Date.now() - lockStat.mtimeMs > 3 * 60 * 60 * 1000) {
      await unlink(LOCK_FILE).catch(() => undefined);
      const handle = await open(LOCK_FILE, "wx");
      await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), recovered: true }));
      return handle;
    }
    return null;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
