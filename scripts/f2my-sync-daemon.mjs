import { spawn } from "node:child_process";

const intervalHours = Math.max(1, Number(process.env.F2MY_SYNC_INTERVAL_HOURS || "24") || 24);
const intervalMs = intervalHours * 60 * 60 * 1_000;

function runOnce() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/scrape-f2my-catalog.mjs"], {
      cwd: process.cwd(),
      stdio: "inherit",
      windowsHide: true,
      env: process.env,
    });
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  // The incremental crawler only re-opens newly listed, recently updated, or stale detail pages.
  // Keep this process under a supervisor (PM2, systemd, Docker, or the hosting platform) in production.
  while (true) {
    const code = await runOnce();
    console.log(`F2MY sync ended with code ${code}; next incremental sync in ${intervalHours}h.`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
