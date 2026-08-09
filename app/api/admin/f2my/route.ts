import { spawn } from "node:child_process";
import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadSourceLinkRegistry, saveSourceLinkBase } from "@/lib/source-link-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEGACY_STATUS_FILE = path.join(process.cwd(), "data", "f2my-scrape-status.json");
const STATUS_SNAPSHOT_DIR = path.join(process.cwd(), "data", "f2my-scrape-status");
const STATUS_SNAPSHOT_FILES = [
  path.join(STATUS_SNAPSHOT_DIR, "slot-a.json"),
  path.join(STATUS_SNAPSHOT_DIR, "slot-b.json"),
];
const CONTROL_FILE = path.join(process.cwd(), "data", "f2my-scrape-control.json");
const WORKER_LOG_FILE = path.join(process.cwd(), ".media-cache", "f2my-catalog", "worker.log");
let statusSlot = 0;

function idleStatus() {
  return {
    state: "idle",
    phase: "idle",
    totals: {},
    archivePages: { total: 0, processed: 0 },
    recentLogs: [],
    updatedAt: null,
  };
}

async function readStatus() {
  const candidates: Record<string, unknown>[] = [];
  for (const file of STATUS_SNAPSHOT_FILES) {
    try {
      candidates.push(JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>);
    } catch {
      // A writer may be updating this one slot; the other slot remains valid.
    }
  }
  if (candidates.length) {
    return candidates.sort((left, right) => Number(right.statusRevision || 0) - Number(left.statusRevision || 0))[0];
  }
  try {
    return JSON.parse(await readFile(LEGACY_STATUS_FILE, "utf8")) as Record<string, unknown>;
  } catch {
    return idleStatus();
  }
}

async function writeStatus(value: Record<string, unknown>) {
  await mkdir(STATUS_SNAPSHOT_DIR, { recursive: true });
  const file = STATUS_SNAPSHOT_FILES[statusSlot % STATUS_SNAPSHOT_FILES.length];
  statusSlot += 1;
  const handle = await open(file, "w");
  try {
    await handle.writeFile(`${JSON.stringify({ ...value, statusRevision: Date.now() }, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function writeControl(cancelRequested: boolean) {
  await mkdir(path.dirname(CONTROL_FILE), { recursive: true });
  await writeFile(CONTROL_FILE, `${JSON.stringify({ cancelRequested, updatedAt: new Date().toISOString() })}\n`, "utf8");
}

function isProcessAlive(pid: unknown) {
  if (!Number.isInteger(pid) || Number(pid) <= 0) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function isAuthorized(request: Request) {
  const requiredToken = process.env.SARVNEMA_ADMIN_TOKEN?.trim();
  if (requiredToken) return request.headers.get("x-admin-token") === requiredToken;
  if (process.env.NODE_ENV !== "production") return true;
  const host = request.headers.get("host") || "";
  return /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
}

function unauthorized() {
  return Response.json({ error: "Admin token required." }, { status: 401 });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  const [status, registry] = await Promise.all([readStatus(), loadSourceLinkRegistry()]);
  return Response.json({ status, registry });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  try {
    const body = (await request.json()) as {
      action?: "start" | "enrich" | "cancel" | "update-base";
      full?: boolean;
      baseId?: string;
      baseUrl?: string;
    };
    const action = body.action;

    if (action === "start" || action === "enrich") {
      const isEnrichment = action === "enrich";
      const current = await readStatus();
      const currentRecord = current as Record<string, unknown>;
      if (["running", "starting", "cancelling"].includes(String(current.state)) && isProcessAlive(currentRecord["pid"])) {
        return Response.json({ error: "An F2MY scrape is already running." }, { status: 409 });
      }
      const now = new Date().toISOString();
      await writeControl(false);
      await writeStatus({
        state: "starting",
        phase: "starting worker",
        mode: isEnrichment ? "imdb-enrichment" : body.full ? "full" : "incremental",
        startedAt: now,
        updatedAt: now,
        finishedAt: null,
        cancelRequested: false,
        totals: { discovered: 0, queued: 0, processed: 0, newTitles: 0, updatedTitles: 0, unchanged: 0, linksFound: 0, newLinks: 0, baseMappings: 0, baseMappingsUpdated: 0, failures: 0 },
        archivePages: { total: 0, processed: 0 },
        recentLogs: [isEnrichment ? "Starting lightweight IMDb enrichment…" : "Starting F2MY catalog worker…"],
        error: null,
      });
      await mkdir(path.dirname(WORKER_LOG_FILE), { recursive: true });
      const workerLog = await open(WORKER_LOG_FILE, "a");
      const child = spawn(process.execPath, ["scripts/scrape-f2my-catalog.mjs", ...(isEnrichment ? ["--enrich-only"] : body.full ? ["--full"] : [])], {
        cwd: process.cwd(),
        detached: true,
        stdio: ["ignore", workerLog.fd, workerLog.fd],
        windowsHide: true,
        env: process.env,
      });
      child.once("spawn", () => void workerLog.close());
      child.once("error", () => void workerLog.close());
      await writeStatus({
        state: "starting",
        phase: "starting worker",
        mode: isEnrichment ? "imdb-enrichment" : body.full ? "full" : "incremental",
        pid: child.pid,
        startedAt: now,
        updatedAt: new Date().toISOString(),
        finishedAt: null,
        cancelRequested: false,
        totals: { discovered: 0, queued: 0, processed: 0, newTitles: 0, updatedTitles: 0, unchanged: 0, linksFound: 0, newLinks: 0, baseMappings: 0, baseMappingsUpdated: 0, failures: 0 },
        archivePages: { total: 0, processed: 0 },
        recentLogs: [isEnrichment ? "Starting lightweight IMDb enrichment…" : "Starting F2MY catalog worker…"],
        error: null,
      });
      child.unref();
      return Response.json({ started: true, pid: child.pid, mode: isEnrichment ? "imdb-enrichment" : body.full ? "full" : "incremental" });
    }

    if (action === "cancel") {
      const current = await readStatus();
      await writeControl(true);
      await writeStatus({
        ...current,
        state: "cancelling",
        phase: "cancelling after the current request",
        cancelRequested: true,
        updatedAt: new Date().toISOString(),
      });
      return Response.json({ cancelled: true });
    }

    if (action === "update-base") {
      if (!body.baseId || !body.baseUrl) throw new Error("Base ID and replacement URL are required.");
      const base = await saveSourceLinkBase(body.baseId, body.baseUrl, true);
      return Response.json({ base });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not update F2MY." }, { status: 400 });
  }
}
