import { spawn } from "node:child_process";

const intervalHours = Math.max(1, Number(process.env.DAILY_RELEASE_BOT_INTERVAL_HOURS || 24));
const initialDelayMs = Math.max(0, Number(process.env.DAILY_RELEASE_BOT_INITIAL_DELAY_MS || 120_000));
const intervalMs = intervalHours * 60 * 60 * 1_000;
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function refresh() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/daily-release-refresh.mjs"], {
      cwd: process.cwd(), env: process.env, stdio: "inherit", windowsHide: true,
    });
    child.once("error", () => resolve(1));
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  if (initialDelayMs) await sleep(initialDelayMs);
  for (;;) {
    const startedAt = Date.now();
    const code = await refresh();
    console.log(`[daily-release-bot] Cycle ended with code ${code}; next review in ${intervalHours}h.`);
    const jitter = Math.round(Math.random() * Math.min(15 * 60 * 1_000, intervalMs * 0.06));
    await sleep(Math.max(60_000, intervalMs - (Date.now() - startedAt) + jitter));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
