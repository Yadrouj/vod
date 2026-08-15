import { spawn } from "node:child_process";
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_FILE = path.join(process.cwd(), "data", "daily-release-bot-status.json");
const CONTROL_FILE = path.join(process.cwd(), "data", "release-monitor-admin.json");
const LOG_FILE = path.join(process.cwd(), ".media-cache", "daily-release-bot", "worker.log");

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

async function readStatus() {
  try {
    return JSON.parse(await readFile(STATUS_FILE, "utf8"));
  } catch {
    return { state: "idle", phase: "No daily release review has run yet.", steps: [] };
  }
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

async function writeStatus(value: Record<string, unknown>) {
  await mkdir(path.dirname(STATUS_FILE), { recursive: true });
  const temporary = `${STATUS_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, STATUS_FILE);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  return Response.json({ status: await readStatus() });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  try {
    const body = (await request.json()) as { action?: "monitor" | "full" };
    if (body.action !== "monitor" && body.action !== "full") return Response.json({ error: "Unknown action." }, { status: 400 });
    const current = await readStatus();
    if (["running", "starting"].includes(String(current.state)) && isProcessAlive(current.pid)) {
      return Response.json({ error: "A daily review is already running." }, { status: 409 });
    }
    const startedAt = new Date().toISOString();
    await mkdir(path.dirname(LOG_FILE), { recursive: true });
    const log = await open(LOG_FILE, "a");
    const child = spawn(process.execPath, ["scripts/daily-release-refresh.mjs", ...(body.action === "monitor" ? ["--monitor-only"] : [])], {
      cwd: process.cwd(), env: process.env, detached: true, stdio: ["ignore", log.fd, log.fd], windowsHide: true,
    });
    child.once("spawn", () => void log.close());
    child.once("error", () => void log.close());
    await writeStatus({
      state: "starting",
      pid: child.pid,
      startedAt,
      updatedAt: startedAt,
      phase: body.action === "monitor" ? "Starting IMDb/source reconciliation" : "Starting all-source daily release review",
      mode: body.action,
      steps: [],
      error: null,
    });
    child.unref();
    return Response.json({ started: true, pid: child.pid, mode: body.action });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not start daily review." }, { status: 400 });
  }
}
