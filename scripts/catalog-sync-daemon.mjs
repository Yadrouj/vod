import { spawn } from "node:child_process";

const INTERVAL_MS = Math.max(
  15 * 60 * 1000,
  Number(process.env.VOD_SYNC_INTERVAL_MS || 6 * 60 * 60 * 1000),
);
const INITIAL_DELAY_MS = Math.max(0, Number(process.env.VOD_SYNC_INITIAL_DELAY_MS || 90_000));

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function sync() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/sync-vod-catalog.mjs"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Catalog sync stopped with ${signal || `exit ${code}`}.`));
    });
  });
}

async function main() {
  if (INITIAL_DELAY_MS) await sleep(INITIAL_DELAY_MS);
  for (;;) {
    const startedAt = Date.now();
    try {
      await sync();
    } catch (error) {
      console.error(`[catalog-sync] ${error instanceof Error ? error.message : String(error)}`);
    }
    const jitter = Math.round(Math.random() * Math.min(10 * 60 * 1000, INTERVAL_MS * 0.08));
    await sleep(Math.max(60_000, INTERVAL_MS - (Date.now() - startedAt) + jitter));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
