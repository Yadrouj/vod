import { open, stat, unlink, writeFile, mkdir, rename } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const STATUS_FILE = path.join(DATA_DIR, "daily-release-bot-status.json");
const LOCK_FILE = path.join(DATA_DIR, "daily-release-refresh.lock");
const MONITOR_ONLY = args.has("--monitor-only");

async function main() {
  const lock = await acquireLock();
  if (!lock) {
    console.log(JSON.stringify({ skipped: true, reason: "A daily release refresh is already running." }));
    return;
  }
  const startedAt = new Date().toISOString();
  const steps = [];
  try {
    await writeStatus({ state: "running", startedAt, updatedAt: startedAt, phase: "Preparing daily source review", steps, error: null });
    if (!MONITOR_ONLY && process.env.DAILY_RELEASE_SKIP_CATALOG_SYNC !== "1") {
      await runStep("Review DonyayeSerial, series feed and Moviesho", "scripts/sync-vod-catalog.mjs", steps, startedAt);
    }
    if (!MONITOR_ONLY && process.env.DAILY_RELEASE_SKIP_F2MY !== "1") {
      await runStep("Review F2MY movies and series", "scripts/scrape-f2my-catalog.mjs", steps, startedAt, ["--skip-imdb-lookup"]);
    }
    await runStep("Compare IMDb discoveries with every source", "scripts/release-monitor.mjs", steps, startedAt);
    await runStep("Publish release-aware news", "scripts/scrape-vod-news.mjs", steps, startedAt);
    await writeStatus({ state: "completed", startedAt, finishedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), phase: "Daily update section published", steps, error: null });
    console.log(JSON.stringify({ completed: true, monitorOnly: MONITOR_ONLY, steps }, null, 2));
  } catch (error) {
    await writeStatus({ state: "failed", startedAt, finishedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), phase: "Daily review stopped", steps, error: error instanceof Error ? error.message : String(error) }).catch(() => undefined);
    throw error;
  } finally {
    await lock.close().catch(() => undefined);
    await unlink(LOCK_FILE).catch(() => undefined);
  }
}

async function runStep(label, script, steps, startedAt, scriptArgs = []) {
  const entry = { label, script, state: "running", startedAt: new Date().toISOString(), finishedAt: null };
  steps.push(entry);
  await writeStatus({ state: "running", startedAt, updatedAt: new Date().toISOString(), phase: label, steps, error: null });
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...scriptArgs], { cwd: ROOT, env: process.env, stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${label} failed (${signal || `exit ${code}`}).`)));
  });
  entry.state = "completed";
  entry.finishedAt = new Date().toISOString();
}

async function writeStatus(value) {
  await mkdir(path.dirname(STATUS_FILE), { recursive: true });
  const temporary = `${STATUS_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, STATUS_FILE);
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
    if (lockStat && Date.now() - lockStat.mtimeMs > 8 * 60 * 60 * 1000) {
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
