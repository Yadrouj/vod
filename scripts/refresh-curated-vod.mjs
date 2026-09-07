import { refreshStep } from "./refresh-step.mjs";
import { readFile } from "node:fs/promises";

// Independent fallback: a DonyayeSerial outage cannot prevent Moviesho/ZardFilm publication.
await refreshStep("Curated movie and series sources", "scripts/scrape-curated-vod-sources.mjs");
const report = JSON.parse(await readFile(process.env.CURATED_VOD_REPORT || ".media-cache/vod-sync/curated-vod-report.json", "utf8"));
if (report.failures?.length && !report.postsReceived) throw new Error("Curated sources unavailable; existing catalog retained");
await refreshStep("Merge curated sources", "scripts/merge-curated-vod-source.mjs");
await refreshStep("Publish title pages", "scripts/build-vod-title-files.mjs");
await refreshStep("Publish browse and landing data", "scripts/build-vod-index.mjs");
