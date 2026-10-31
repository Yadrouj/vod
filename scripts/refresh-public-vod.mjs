import path from "node:path";
import { readFile } from "node:fs/promises";
import { refreshStep } from "./refresh-step.mjs";

const root = process.env.PUBLIC_VOD_WORK_DIR || ".media-cache/public-vod";
await refreshStep("Review public movie/series sources", "scripts/scrape-public-vod-sources.mjs", process.argv.includes("--full") ? ["--full"] : []);
const report = JSON.parse(await readFile(path.join(root, "report.json"), "utf8"));
if (report.titles) {
  await refreshStep("Merge public movie/series versions without deleting older sources", "scripts/merge-curated-vod-source.mjs", ["public/data/vod-catalog.json", path.join(root, "source.json"), "public/data/vod-catalog.json", path.join(root, "merge-report.json")]);
  await refreshStep("Publish title files", "scripts/build-vod-title-files.mjs");
  await refreshStep("Publish browse and landing indexes", "scripts/build-vod-index.mjs");
}
if (report.partial) throw new Error("Public source scan is partial; progress was saved for the next run");
if (report.sources.every(source => source.state === "unavailable")) throw new Error("Public sources are unavailable; existing archive retained");
