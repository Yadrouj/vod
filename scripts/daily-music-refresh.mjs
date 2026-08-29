import { open, readFile, rename, stat, unlink, writeFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const STATUS_FILE = path.join(DATA_DIR, "daily-music-refresh-status.json");
const LOCK_FILE = path.join(DATA_DIR, "daily-music-refresh.lock");
const args = new Set(process.argv.slice(2));
const FULL = args.has("--full");
const REBUILD_ONLY = args.has("--rebuild-only");

const envNumber = (name, fallback, minimum = 0) => {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? Math.max(minimum, value) : fallback;
};

const FRONT_PAGES = envNumber("MUSIC_REFRESH_FRONT_PAGES", FULL ? 1777 : 4, 1);
const VIDEO_PAGES = envNumber("MUSIC_REFRESH_VIDEO_PAGES", FULL ? 60 : 2, 1);
const MUSICS_FA_PAGES = envNumber("MUSIC_REFRESH_MUSICS_FA_PAGES", FULL ? 1247 : 4, 1);
const REMIX_PAGES = envNumber("MUSIC_REFRESH_REMIX_PAGES", 35, 1);
const WORLDOFMUSIC_ARTISTS = envNumber("MUSIC_REFRESH_WORLDOFMUSIC_ARTISTS", FULL ? 0 : 20, 0);
const WORLDOFMUSIC_ALBUMS = envNumber("MUSIC_REFRESH_WORLDOFMUSIC_ALBUMS", FULL ? 0 : 50, 0);
const FOREIGN_PAGES = envNumber("MUSIC_REFRESH_FOREIGN_PAGES", 18, 1);
const DELAY_MS = envNumber("MUSIC_REFRESH_REQUEST_GAP_MS", 1_200, 250);

async function main() {
  const lock = await acquireLock();
  if (!lock) {
    console.log(JSON.stringify({ skipped: true, reason: "A music refresh is already running." }));
    return;
  }

  const startedAt = new Date().toISOString();
  const steps = [];
  try {
    await writeStatus({ state: "running", startedAt, updatedAt: startedAt, phase: "Preparing music source review", full: FULL, steps, error: null });
    if (!REBUILD_ONLY) {
      await runStep(
        "Review newest RozMusic tracks and music videos",
        "scripts/scrape-rozmusic.mjs",
        [
          `--pages=${FRONT_PAGES}`,
          `--video-pages=${VIDEO_PAGES}`,
          `--detail-limit=${FULL ? 0 : 36}`,
          "--concurrency=1",
          `--delay-ms=${DELAY_MS}`,
        ],
        steps,
        startedAt,
      );
      await runStep(
        "Review newest Musics-Fa tracks",
        "scripts/scrape-musics-fa.mjs",
        [
          ...(FULL ? ["--full"] : [`--pages=${MUSICS_FA_PAGES}`, "--detail-limit=36"]),
          "--concurrency=1",
          `--delay-ms=${DELAY_MS}`,
        ],
        steps,
        startedAt,
      );
      await runStep(
        "Review Musics-Fa remix releases",
        "scripts/scrape-musics-fa.mjs",
        [
          "--category-path=remix",
          `--pages=${REMIX_PAGES}`,
          `--detail-limit=${FULL ? 0 : 18}`,
          "--concurrency=1",
          `--delay-ms=${DELAY_MS}`,
        ],
        steps,
        startedAt,
      );
      await runStep(
        "Review WorldOfMusic artists and albums",
        "scripts/scrape-worldofmusic.mjs",
        [
          "--refresh-artists",
          "--refresh-albums",
          ...(WORLDOFMUSIC_ARTISTS ? [`--limit-artists=${WORLDOFMUSIC_ARTISTS}`] : []),
          ...(WORLDOFMUSIC_ALBUMS ? [`--limit-albums=${WORLDOFMUSIC_ALBUMS}`] : []),
          ...(FULL ? ["--include-sitemap"] : []),
          "--concurrency=1",
          `--delay-ms=${DELAY_MS}`,
        ],
        steps,
        startedAt,
      );
      await runStep(
        "Review legacy Persian music collections",
        "scripts/scrape-persian-classics.mjs",
        [],
        steps,
        startedAt,
      );
      await runStep(
        "Review RemiixBaz legacy playlists",
        "scripts/scrape-remiixbaz.mjs",
        [`--delay-ms=${DELAY_MS}`],
        steps,
        startedAt,
      );
      await runStep(
        "Review Aftab foreign music collection",
        "scripts/scrape-aftab-foreign.mjs",
        [`--pages=${FOREIGN_PAGES}`],
        steps,
        startedAt,
      );
    }
    await runStep("Rebuild music landing and artist indexes", "scripts/scrape-rozmusic.mjs", ["--rebuild-only"], steps, startedAt);
    await runStep("Rebuild compact music landing data", "scripts/build-music-landing-index.mjs", [], steps, startedAt);
    await writeStatus({
      state: "completed",
      startedAt,
      finishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phase: "Music catalog published",
      full: FULL,
      steps,
      error: null,
    });
    console.log(JSON.stringify({ completed: true, full: FULL, steps }, null, 2));
  } catch (error) {
    await writeStatus({ state: "failed", startedAt, finishedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), phase: "Music source review stopped", full: FULL, steps, error: message(error) }).catch(() => undefined);
    throw error;
  } finally {
    await lock.close().catch(() => undefined);
    await unlink(LOCK_FILE).catch(() => undefined);
  }
}

async function runStep(label, script, scriptArgs, steps, startedAt) {
  const entry = { label, script, state: "running", startedAt: new Date().toISOString(), finishedAt: null };
  steps.push(entry);
  await writeStatus({ state: "running", startedAt, updatedAt: new Date().toISOString(), phase: label, full: FULL, steps, error: null });
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...scriptArgs], {
      cwd: ROOT,
      env: process.env,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${label} failed (${signal || `exit ${code}`}).`)));
  });
  entry.state = "completed";
  entry.finishedAt = new Date().toISOString();
}

async function writeStatus(value) {
  await mkdir(path.dirname(STATUS_FILE), { recursive: true });
  const current = await readJson(STATUS_FILE, {});
  const temporary = `${STATUS_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify({ ...current, ...value }, null, 2)}\n`, "utf8");
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
    if (lockStat && Date.now() - lockStat.mtimeMs > 12 * 60 * 60 * 1000) {
      await unlink(LOCK_FILE).catch(() => undefined);
      const handle = await open(LOCK_FILE, "wx");
      await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), recovered: true }));
      return handle;
    }
    return null;
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
