import { refreshStep } from "./refresh-step.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";

try {
  await refreshStep("Refresh verified Breaking Bad episode mirrors", "scripts/refresh-breaking-bad-mirrors.mjs");
} catch (error) { console.warn(`Episode mirrors retained: ${error.message}`); }

// Independent fallback: a DonyayeSerial outage cannot prevent Moviesho/ZardFilm publication.
await refreshStep("Curated movie and series sources", "scripts/scrape-curated-vod-sources.mjs");
const report = JSON.parse(await readFile(process.env.CURATED_VOD_REPORT || ".media-cache/vod-sync/curated-vod-report.json", "utf8"));
if (report.failures?.length && !report.postsReceived) throw new Error("Curated sources unavailable; existing catalog retained");
await refreshStep("Verify alternative providers for DonyayeSerial titles", "scripts/refresh-alternative-sources.mjs", [process.env.CURATED_VOD_OUTPUT || ".media-cache/vod-sync/curated-vod-source.json", path.join(process.env.VOD_DATA_DIR || "public/data", "alternative-source-links.json"), ".media-cache/vod-sync/alternative-verification-report.json"]);
await refreshStep("Merge curated sources", "scripts/merge-curated-vod-source.mjs");
await refreshStep("Publish title pages", "scripts/build-vod-title-files.mjs");
await refreshStep("Publish browse and landing data", "scripts/build-vod-index.mjs");
