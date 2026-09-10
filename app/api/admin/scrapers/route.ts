import { readFile } from "node:fs/promises";
import path from "node:path";
import { DAILY_JOBS } from "../../../../scripts/maintenance-policy.mjs";
import { DEFAULT_SCRAPER_DASHBOARD_CONFIG, readScraperDashboardConfig, sanitizeScraperDashboardConfig, writeScraperDashboardConfig } from "../../../../scripts/scraper-dashboard-config.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const PUBLIC_DATA = path.join(ROOT, "public", "data");
const statusFiles: Record<string, string[]> = {
  news: [path.join(PUBLIC_DATA, "vod-news.json")],
  video: [path.join(PUBLIC_DATA, "vod-sync-status.json")],
  f2my: [path.join(DATA, "f2my-scrape-status.json"), path.join(DATA, "f2my-scrape-status", "slot-a.json"), path.join(DATA, "f2my-scrape-status", "slot-b.json")],
  music: [path.join(DATA, "daily-music-refresh-status.json")],
  releases: [path.join(DATA, "release-monitor-status.json")],
  "imdb-trending": [path.join(DATA, "imdb-trending-status.json")],
  "curated-video": [path.join(DATA, "maintenance-scheduler-status.json")],
  "public-archives": [path.join(DATA, "public-film-archives-report.json")],
};
type JsonRecord = Record<string, unknown>;

function isAuthorized(request: Request) {
  const requiredToken = process.env.SARVNEMA_ADMIN_TOKEN?.trim();
  if (requiredToken) return request.headers.get("x-admin-token") === requiredToken;
  if (process.env.NODE_ENV !== "production") return true;
  const host = request.headers.get("host") || "";
  return /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
}

function unauthorized() { return Response.json({ error: "Admin token required." }, { status: 401 }); }

async function readJson(file: string) {
  try { return JSON.parse(await readFile(file, "utf8")) as JsonRecord; } catch { return null; }
}

async function latestStatus(files: string[]) {
  const values = (await Promise.all(files.map(readJson))).filter((value): value is JsonRecord => Boolean(value));
  return values.sort((left, right) => String(value(right, "statusRevision") || value(right, "updatedAt") || value(right, "generatedAt") || value(right, "attemptedAt") || "").localeCompare(String(value(left, "statusRevision") || value(left, "updatedAt") || value(left, "generatedAt") || value(left, "attemptedAt") || "")))[0] || null;
}

function value(record: JsonRecord | null | undefined, key: string): unknown { return record?.[key]; }
function record(valueToRead: unknown): JsonRecord { return valueToRead && typeof valueToRead === "object" && !Array.isArray(valueToRead) ? valueToRead as JsonRecord : {}; }
function stringValue(valueToRead: unknown): string | null { return typeof valueToRead === "string" ? valueToRead : null; }
function number(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }

function counts(status: JsonRecord | null) {
  const totals = record(value(status, "totals"));
  const tracks = record(value(status, "tracks"));
  const pages = record(value(status, "archivePages") || value(status, "pages"));
  const summary = record(value(status, "summary"));
  return {
    received: number(value(totals, "newTitles")) ?? number(value(totals, "discovered")) ?? number(value(tracks, "new")) ?? number(value(tracks, "discovered")) ?? number(value(summary, "catalogTitles")) ?? number(value(status, "catalogTitles")),
    processed: number(value(totals, "processed")) ?? number(value(tracks, "complete")) ?? number(value(pages, "complete")) ?? number(value(summary, "newEvents")),
    total: number(value(totals, "queued")) ?? number(value(pages, "total")) ?? number(value(summary, "catalogTitles")),
    failures: number(value(totals, "failures")) ?? number(value(tracks, "failures")) ?? number(value(pages, "failed")) ?? (Array.isArray(value(status, "failures")) ? (value(status, "failures") as unknown[]).length : 0),
  };
}

async function buildSnapshot() {
  const config = await readScraperDashboardConfig();
  const maintenance = await readJson(path.join(DATA, "maintenance-scheduler-status.json"));
  const state = await readJson(path.join(DATA, "maintenance-scheduler-state.json"));
  const stepMap = new Map((Array.isArray(value(maintenance, "steps")) ? value(maintenance, "steps") as unknown[] : []).map((item) => { const step = record(item); return [stringValue(value(step, "id")) || "", step] as const; }));
  const local = record(value(maintenance, "local"));
  const stateDays = record(value(state, "days"));
  const completedToday = record(value(stateDays, String(value(local, "day") || "")));
  const jobs = await Promise.all(DAILY_JOBS.map(async (job) => {
    const source = config.sources.find((item) => item.id === job.id) || { id: job.id, name: job.id, siteUrl: "", scraper: job.script, enabled: true, startHour: config.schedule.startHour, endHour: config.schedule.endHour, days: config.schedule.days, kind: "known" };
    const status = await latestStatus(statusFiles[job.id] || []);
    const step = stepMap.get(job.id);
    const dailyCompletedAt = stringValue(value(completedToday, job.id));
    const jobState = stringValue(value(step, "state")) || stringValue(value(status, "state")) || (dailyCompletedAt ? "completed" : value(maintenance, "state") === "waiting" ? "waiting" : "idle");
    return {
      ...source,
      script: job.script,
      state: jobState,
      phase: value(step, "state") === "running" ? "در حال دریافت" : stringValue(value(status, "phase")) || stringValue(value(maintenance, "reason")) || "هنوز اجرا نشده",
      lastCheckedAt: stringValue(value(status, "updatedAt") || value(status, "generatedAt") || value(status, "attemptedAt") || value(step, "finishedAt") || dailyCompletedAt || value(maintenance, "checkedAt")),
      startedAt: stringValue(value(status, "startedAt") || value(step, "startedAt")),
      current: stringValue(value(status, "currentTitle") || value(status, "current")),
      counts: counts(status),
    };
  }));
  const manualJobs = config.sources.filter((source) => source.kind === "manual" && !DAILY_JOBS.some((job) => job.id === source.id)).map((source) => ({
    ...source,
    script: "manual",
    state: "manual",
    phase: "منبع ثبت شده؛ adapter اسکریپر هنوز متصل نیست",
    lastCheckedAt: null,
    startedAt: null,
    current: null,
    counts: { received: null, processed: null, total: null, failures: 0 },
  }));
  const allJobs = [...jobs, ...manualJobs];
  const running = allJobs.filter((job) => ["running", "starting", "cancelling"].includes(job.state));
  return {
    config,
    schedule: { ...config.schedule, active: value(record(value(maintenance, "trigger")), "active") === true, trigger: record(value(maintenance, "trigger")) },
    maintenance: { state: stringValue(value(maintenance, "state")) || "idle", reason: stringValue(value(maintenance, "reason")), checkedAt: stringValue(value(maintenance, "checkedAt")), local: Object.keys(local).length ? local : null },
    summary: { sources: allJobs.length, enabled: allJobs.filter((job) => job.enabled).length, running: running.length, failures: allJobs.reduce((sum, job) => sum + (job.counts.failures || 0), 0) },
    jobs: allJobs,
    generatedAt: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  return Response.json(await buildSnapshot(), { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  try {
    const body = await request.json() as { action?: string; config?: unknown };
    if (body.action !== "save-config") return Response.json({ error: "Unknown scraper dashboard action." }, { status: 400 });
    const config = sanitizeScraperDashboardConfig(body.config || DEFAULT_SCRAPER_DASHBOARD_CONFIG);
    return Response.json({ config: await writeScraperDashboardConfig(config) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save scraper settings." }, { status: 400 });
  }
}
