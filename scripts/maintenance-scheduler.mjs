import os from "node:os";
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assessCapacity, DAILY_JOBS, DEFAULT_IDLE_END_HOUR, DEFAULT_IDLE_START_HOUR, localClock, windowDeadline } from "./maintenance-policy.mjs";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const STATE = path.join(DATA, "maintenance-scheduler-state.json");
const STATUS = path.join(DATA, "maintenance-scheduler-status.json");
const LOCK = path.join(DATA, "maintenance-scheduler.lock");
const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const FULL = args.has("--full");
const number = (name, fallback) => Number.isFinite(Number(process.env[name])) ? Number(process.env[name]) : fallback;
const ZONE = process.env.MAINTENANCE_TIME_ZONE || "Asia/Tehran";
const START = Math.min(23, Math.max(0, number("MAINTENANCE_IDLE_START_HOUR", DEFAULT_IDLE_START_HOUR)));
const END = Math.min(23, Math.max(0, number("MAINTENANCE_IDLE_END_HOUR", DEFAULT_IDLE_END_HOUR)));
const POLL = Math.max(60_000, number("MAINTENANCE_POLL_MS", 900_000));
let stopping = false;
let activeStop = null;
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => { stopping = true; activeStop?.(); });

async function main() {
  if (args.has("--check")) {
    const local = localClock(new Date(), ZONE);
    const eligibleNow = windowDeadline(new Date(), ZONE, START, END) > Date.now();
    console.log(JSON.stringify({ timeZone: ZONE, startHour: START, endHourExclusive: END, local, eligibleNow, trigger: { name: "daily-scraper-check", schedule: "daily", active: eligibleNow }, capacity: await checkCapacity(), jobs: DAILY_JOBS }, null, 2));
    return;
  }
  do {
    await runCycle().catch(async error => {
      console.error(error);
      await atomic(STATUS, { state: "failed", checkedAt: new Date().toISOString(), error: error.message });
      if (!args.has("--daemon")) process.exitCode = 1;
    });
    if (!args.has("--daemon") || stopping) break;
    // Short, interruptible pauses allow the container to shut down promptly.
    const until = Date.now() + POLL;
    while (!stopping && Date.now() < until) await new Promise(resolve => setTimeout(resolve, Math.min(1000, until - Date.now())));
  } while (!stopping);
}

async function runCycle() {
  const local = localClock(new Date(), ZONE);
  const deadline = FORCE ? Date.now() + 3 * 60 * 60_000 : windowDeadline(new Date(), ZONE, START, END);
  const trigger = {
    id: `${local.day}@${String(START).padStart(2, "0")}-${String(END).padStart(2, "0")}`,
    name: "daily-scraper-check",
    schedule: "daily",
    source: args.has("--daemon") ? "maintenance-daemon" : "scheduled-worker",
  };
  if (deadline <= Date.now()) {
    await atomic(STATUS, { state: "waiting", local, trigger: { ...trigger, active: false }, reason: "Outside 03:00–07:00 maintenance window", checkedAt: new Date().toISOString() });
    return;
  }
  const lock = await acquireLock();
  if (!lock) return;
  try {
    const previous = await readJson(STATE, { days: {} });
    const activatedAt = previous.lastDailyTrigger?.id === trigger.id ? previous.lastDailyTrigger.activatedAt : new Date().toISOString();
    const activeTrigger = { ...trigger, active: true, activatedAt, checkedAt: new Date().toISOString() };
    if (previous.lastDailyTrigger?.id !== trigger.id) {
      await atomic(STATE, { ...previous, version: 3, lastDailyTrigger: activeTrigger, updatedAt: new Date().toISOString() });
    }
    const days = previous.days ?? {};
    const completed = days[local.day] ?? {};
    const steps = [];
    for (const job of DAILY_JOBS) {
      if (stopping || Date.now() >= deadline) break;
      if (!FORCE && completed[job.id]) continue;
      const capacity = await checkCapacity();
      if (!FORCE && !capacity.idle) {
        await atomic(STATUS, { state: "waiting", local, trigger: activeTrigger, steps, capacity, checkedAt: new Date().toISOString() });
        return;
      }
      if (stopping || Date.now() >= deadline) break;
      const entry = { id: job.id, script: job.script, state: "running", startedAt: new Date().toISOString() };
      steps.push(entry);
      await atomic(STATUS, { state: "running", local, trigger: activeTrigger, steps, deadline: new Date(deadline).toISOString(), checkedAt: new Date().toISOString() });
      try {
        const jobDeadline = Math.min(deadline, Date.now() + job.minutes * 60_000);
        await runJob(job, jobDeadline, local.day);
        entry.state = "completed";
        completed[job.id] = new Date().toISOString();
        days[local.day] = completed;
        const recentDays = Object.fromEntries(Object.entries(days).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14));
        await atomic(STATE, { version: 3, lastDailyTrigger: activeTrigger, days: recentDays, updatedAt: new Date().toISOString() });
      } catch (error) {
        entry.state = "failed";
        entry.error = error.message;
        console.error(`[maintenance] ${job.id}: ${error.message}`);
        // Continue: unavailable IMDb/video sources must not starve music/news.
      }
      entry.finishedAt = new Date().toISOString();
    }
    const complete = DAILY_JOBS.every(job => completed[job.id]);
    await atomic(STATUS, { state: complete ? "completed" : "partial", local, trigger: activeTrigger, steps, completedJobs: Object.keys(completed), checkedAt: new Date().toISOString() });
    if (!complete && !args.has("--daemon")) process.exitCode = 1;
  } finally {
    await lock.close();
    await unlink(LOCK).catch(() => {});
  }
}

export async function runJob(job, deadline, day) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [job.script, ...(job.args || []), ...(FULL && ["f2my", "music"].includes(job.id) ? ["--full"] : [])], {
      cwd: ROOT, windowsHide: true, detached: process.platform !== "win32", stdio: "inherit",
      env: { ...process.env, MAINTENANCE_RUN_DAY: FORCE ? "" : day, MAINTENANCE_DEADLINE: String(deadline), DAILY_RELEASE_SKIP_NEWS: "1", DAILY_RELEASE_SKIP_TRENDING: "1" },
    });
    let expired = false;
    let killTimer;
    const stop = () => {
      if (expired) return;
      expired = true;
      if (!child.pid) return;
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
      } else {
        try { process.kill(-child.pid, "SIGTERM"); } catch { /* Already exited. */ }
        killTimer = setTimeout(() => { try { process.kill(-child.pid, "SIGKILL"); } catch {} }, 5000);
      }
    };
    activeStop = stop;
    const timer = setTimeout(stop, Math.max(1, deadline - Date.now()));
    const finish = error => {
      clearTimeout(timer); clearTimeout(killTimer); activeStop = null;
      if (error) reject(error); else resolve();
    };
    child.once("error", finish);
    child.once("exit", (code, signal) => {
      if (expired && process.platform !== "win32") {
        try { process.kill(-child.pid, "SIGKILL"); } catch { /* No descendants remain. */ }
      }
      finish(expired ? new Error("Time budget reached; unfinished steps retry next cycle") : code === 0 ? null : new Error(`exit ${signal || code}`));
    });
  });
}

async function checkCapacity() {
  try {
    const response = await fetch(process.env.MAINTENANCE_READY_URL || "http://127.0.0.1:3004/readyz", { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const ready = await response.json();
    return { ...assessCapacity(ready, os.loadavg()[0], {
      requests: number("MAINTENANCE_MAX_RECENT_REQUESTS", 12), rooms: number("MAINTENANCE_MAX_ACTIVE_ROOMS", 1),
      memory: number("MAINTENANCE_MAX_MEMORY_MB", 1350), load: number("MAINTENANCE_MAX_LOAD_AVG", 1.25),
    }), ready };
  } catch (error) { return { idle: false, reason: error.message }; }
}

async function acquireLock() {
  await mkdir(DATA, { recursive: true });
  try {
    const handle = await open(LOCK, "wx");
    await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    return handle;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const info = await stat(LOCK).catch(() => null);
    // Every worker has a three-hour hard limit; never steal an active lock.
    if (info && Date.now() - info.mtimeMs > 6 * 60 * 60_000) {
      await unlink(LOCK).catch(() => {});
      return acquireLock();
    }
    return null;
  }
}
async function atomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2));
  await rename(temporary, file);
}
async function readJson(file, fallback) { try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; } }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error); process.exitCode = 1; });
