import { refreshStep } from "./refresh-step.mjs";
const failures = [];
try {
  await refreshStep("Review Iranian archive embeds", "scripts/scrape-oitn-films.mjs");
  await refreshStep("Match legacy film references", "scripts/repair-legacy-video-catalog.mjs");
} catch (error) { failures.push(error.message); }
try {
  await refreshStep("Review official film archives", "scripts/scrape-public-film-archives.mjs");
  await refreshStep("Merge official archive references", "scripts/merge-vod-source-stream.mjs", ["public/data/vod-catalog.json", ".media-cache/vod-sync/public-film-archives.json"]);
} catch (error) { failures.push(error.message); }
await refreshStep("Publish title profiles", "scripts/build-vod-title-files.mjs");
await refreshStep("Publish archive indexes", "scripts/build-vod-index.mjs");
if (failures.length) throw new Error(failures.join("; "));
