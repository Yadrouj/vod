import { spawn } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

// Checkpoints belong to a scheduler day, not the lifetime of the image.
// A failing source does not prevent other sources or index publication.
export async function refreshStep(label, script, args = []) {
  const publishes = script.includes("build-") || script.includes("release-monitor") || script.includes("scrape-curated-vod-sources") || args.includes("--rebuild-only");
  const day = publishes ? null : process.env.MAINTENANCE_RUN_DAY;
  const file = path.join("data", "refresh-checkpoints", `${createHash("sha256").update(JSON.stringify([script, args])).digest("hex")}.json`);
  if (day) {
    try { if (JSON.parse(await readFile(file, "utf8")).day === day) return "already-completed"; } catch { /* Not completed yet. */ }
  }
  if (process.env.MAINTENANCE_DEADLINE && Date.now() >= Number(process.env.MAINTENANCE_DEADLINE)) throw new Error("Nightly deadline reached");
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: process.cwd(), env: process.env, stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${label} failed (${signal || code})`)));
  });
  if (day) {
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify({ day, completedAt: new Date().toISOString() }));
    await rename(temporary, file);
  }
  return "completed";
}
