import os from "node:os";
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const STATE_FILE = path.join(DATA_DIR, "maintenance-scheduler-state.json");
const STATUS_FILE = path.join(DATA_DIR, "maintenance-scheduler-status.json");
const LOCK_FILE = path.join(DATA_DIR, "maintenance-scheduler.lock");
const args = new Set(process.argv.slice(2));
const DAEMON = args.has("--daemon");
const FORCE = args.has("--force") || process.env.MAINTENANCE_FORCE === "1";
const FULL = args.has("--full") || process.env.MAINTENANCE_FULL === "1";

const number = (name, fallback, minimum = 0) => {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? Math.max(minimum, value) : fallback;
};
const TIME_ZONE = process.env.MAINTENANCE_TIME_ZONE || "Asia/Tehran";
const IDLE_START_HOUR = Math.min(23, number("MAINTENANCE_IDLE_START_HOUR", 2));
const IDLE_END_HOUR = Math.min(23, number("MAINTENANCE_IDLE_END_HOUR", 6));
const POLL_MS = number("MAINTENANCE_POLL_MS", 15 * 60_000, 60_000);
const READY_URL = process.env.MAINTENANCE_READY_URL || "http://127.0.0.1:3004/readyz";
const MAX_RECENT_REQUESTS = number("MAINTENANCE_MAX_RECENT_REQUESTS", 12);
const MAX_ACTIVE_ROOMS = number("MAINTENANCE_MAX_ACTIVE_ROOMS", 1);
const MAX_MEMORY_MB = number("MAINTENANCE_MAX_MEMORY_MB", 1_350);
const MAX_LOAD_AVG = number("MAINTENANCE_MAX_LOAD_AVG", 1.25);

async function main() {
  if (DAEMON) {
    console.log(`[maintenance] Scheduler polling every ${Math.round(POLL_MS / 60_000)} minutes (${TIME_ZONE}, idle ${IDLE_START_HOUR}:00-${IDLE_END_HOUR}:59).`);
    for (;;) {
      await runCycle().catch((error) => console.error(`[maintenance] ${message(error)}`));
      await sleep(POLL_MS);
    }
  }
  await runCycle();
}

async function runCycle() {
  const lock = await acquireLock();
  if (!lock) return;
  try {
    const local = localClock();
    const previous = await readJson(STATE_FILE, { version: 1, completedDays: {} });
    if (!FORCE && previous.completedDays?.[local.day]) {
      await writeStatus({ state: "skipped", checkedAt: new Date().toISOString(), reason: "Today's maintenance cycle already completed.", local });
      return;
    }
    if (!FORCE && !inIdleWindow(local.hour)) {
      await writeStatus({ state: "waiting", checkedAt: new Date().toISOString(), reason: "Outside configured idle window.", local });
      return;
    }
    const capacity = await checkCapacity();
    if (!FORCE && !capacity.idle) {
      await writeStatus({ state: "waiting", checkedAt: new Date().toISOString(), reason: capacity.reason, local, capacity });
      return;
    }
    const startedAt = new Date().toISOString();
    const steps = [];
    await writeStatus({ state: "running", startedAt, checkedAt: startedAt, local, capacity, phase: "Daily source refresh", steps, error: null });
    await runStep(
      "Refresh video sources, IMDb releases and news",
      "scripts/daily-release-refresh.mjs",
      FULL ? ["--full"] : [],
      steps,
      startedAt,
      local,
      capacity,
    );
    await runStep("Refresh music sources and landing indexes", "scripts/daily-music-refresh.mjs", FULL ? ["--full"] : [], steps, startedAt, local, capacity);
    const completedAt = new Date().toISOString();
    const completedDays = { ...(previous.completedDays ?? {}), [local.day]: completedAt };
    for (const [day] of Object.entries(completedDays)) {
      if (day < local.dayMinus(14)) delete completedDays[day];
    }
    await writeJsonAtomic(STATE_FILE, { version: 1, completedDays, lastCompletedAt: completedAt, lastLocalDay: local.day, lastCapacity: capacity });
    await writeStatus({ state: "completed", startedAt, finishedAt: completedAt, checkedAt: completedAt, local, capacity, full: FULL, phase: "All source updates published", steps, error: null });
    console.log(JSON.stringify({ completed: true, full: FULL, localDay: local.day, steps }, null, 2));
  } finally {
    await lock.close().catch(() => undefined);
    await unlink(LOCK_FILE).catch(() => undefined);
  }
}

function localClock() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date())
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  const dayMinus = (days) => {
    const date = new Date(`${day}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - days);
    return date.toISOString().slice(0, 10);
  };
  return { day, hour: Number(parts.hour), timeZone: TIME_ZONE, dayMinus };
}

function inIdleWindow(hour) {
  if (IDLE_START_HOUR === IDLE_END_HOUR) return true;
  return IDLE_START_HOUR < IDLE_END_HOUR
    ? hour >= IDLE_START_HOUR && hour <= IDLE_END_HOUR
    : hour >= IDLE_START_HOUR || hour <= IDLE_END_HOUR;
}

async function checkCapacity() {
  const loadAverage = os.loadavg()[0];
  let ready = null;
  try {
    const response = await fetch(READY_URL, { signal: AbortSignal.timeout(4_000), headers: { "cache-control": "no-cache" } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    ready = await response.json();
  } catch (error) {
    return { idle: false, reason: `Application readiness is unavailable: ${message(error)}`, loadAverage, ready: null };
  }
  if (ready.status !== "ready") return { idle: false, reason: "Application is not ready.", loadAverage, ready };
  if (Number(ready.rooms ?? 0) > MAX_ACTIVE_ROOMS) return { idle: false, reason: `Active watch rooms (${ready.rooms}) exceed the idle threshold.`, loadAverage, ready };
  if (Number(ready.recentRequests5m ?? 0) > MAX_RECENT_REQUESTS) return { idle: false, reason: `Recent requests (${ready.recentRequests5m}) exceed the idle threshold.`, loadAverage, ready };
  if (Number(ready.memoryMb?.rss ?? 0) > MAX_MEMORY_MB) return { idle: false, reason: `Application memory (${ready.memoryMb.rss}MB) exceeds the idle threshold.`, loadAverage, ready };
  if (loadAverage > 0 && loadAverage > MAX_LOAD_AVG) return { idle: false, reason: `System load (${loadAverage.toFixed(2)}) exceeds the idle threshold.`, loadAverage, ready };
  return { idle: true, reason: "Application and host are idle.", loadAverage, ready };
}

async function runStep(label, script, scriptArgs, steps, startedAt, local, capacity) {
  const entry = { label, script, state: "running", startedAt: new Date().toISOString(), finishedAt: null };
  steps.push(entry);
  await writeStatus({ state: "running", startedAt, checkedAt: new Date().toISOString(), local, capacity, phase: label, steps, error: null });
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...scriptArgs], { cwd: ROOT, env: process.env, stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${label} failed (${signal || `exit ${code}`}).`)));
  });
  entry.state = "completed";
  entry.finishedAt = new Date().toISOString();
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
    if (lockStat && Date.now() - lockStat.mtimeMs > 18 * 60 * 60 * 1000) {
      await unlink(LOCK_FILE).catch(() => undefined);
      const handle = await open(LOCK_FILE, "wx");
      await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), recovered: true }));
      return handle;
    }
    return null;
  }
}

async function writeStatus(value) {
  await writeJsonAtomic(STATUS_FILE, value);
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
