import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const INDEX = path.join("public", "data", "music-index.json");
const args = new Set(process.argv.slice(2));
const limit = Number(process.argv.find((value) => value.startsWith("--limit="))?.slice(8) ?? 0);
const concurrency = Math.max(1, Math.min(5, Number(process.argv.find((value) => value.startsWith("--concurrency="))?.slice(14) ?? 3)));

async function main() {
  const index = JSON.parse(await readFile(INDEX, "utf8"));
  const references = [];
  for (const track of index.tracks.filter((track) => track.kind === "video")) {
    for (let index = 0; index < track.sources.length; index += 1) references.push({ track, source: track.sources[index] });
  }
  const targets = limit ? references.slice(0, limit) : references;
  const report = { checked: 0, playable: 0, unavailable: 0, failures: [] };

  await pool(targets, concurrency, async ({ source }) => {
    try {
      const response = await fetch(source.url, { method: "GET", headers: { range: "bytes=0-3", "user-agent": "SarvNema media health/1.0 (+https://sarvnema.ir)" }, signal: AbortSignal.timeout(25_000) });
      // Consume / cancel a tiny range response to release the socket promptly.
      await response.body?.cancel().catch(() => undefined);
      source.available = response.ok || response.status === 206;
      source.checkedAt = new Date().toISOString();
      if (source.available) report.playable += 1; else report.unavailable += 1;
      if (!source.available) report.failures.push({ url: source.url, status: response.status });
    } catch (error) {
      source.available = false;
      source.checkedAt = new Date().toISOString();
      report.unavailable += 1;
      report.failures.push({ url: source.url, error: error instanceof Error ? error.message : String(error) });
    }
    report.checked += 1;
  });

  index.updatedAt = new Date().toISOString();
  const temporary = `${INDEX}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await rename(temporary, INDEX);
  console.log(JSON.stringify(report, null, 2));
}

async function pool(values, workers, callback) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(workers, values.length || 1) }, async () => {
    while (true) {
      const value = values[cursor++];
      if (!value) return;
      await callback(value);
    }
  }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
