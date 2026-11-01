import { refreshStep } from "./refresh-step.mjs";
import { readFile } from "node:fs/promises";
const failures = [];
try {
  const source = ".media-cache/vod-sync/mihan-nightly-source.json";
  await refreshStep("Review Iranian movie directories", "scripts/scrape-mihan-persian-movies.mjs", [`https://dl.mihandownload.com/Movies/${new Date().getUTCFullYear()}/`, source]);
  const archive = JSON.parse(await readFile(source, "utf8"));
  await refreshStep("Merge Iranian movie versions", "scripts/merge-curated-vod-source.mjs", ["public/data/vod-catalog.json", source, "public/data/vod-catalog.json", ".media-cache/vod-sync/mihan-nightly-merge-report.json"]);
  if (!archive.discovery?.complete) failures.push("Iranian directory review is partial; collected versions were retained");
} catch (error) { failures.push(error.message); }
try {
  await refreshStep("Review Iranian archive embeds", "scripts/scrape-oitn-films.mjs");
  await refreshStep("Match legacy film references", "scripts/repair-legacy-video-catalog.mjs");
} catch (error) { failures.push(error.message); }
try {
  await refreshStep("Review official film archives", "scripts/scrape-public-film-archives.mjs");
  await refreshStep("Merge official archive references", "scripts/merge-curated-vod-source.mjs", ["public/data/vod-catalog.json", ".media-cache/vod-sync/public-film-archives.json", "public/data/vod-catalog.json", ".media-cache/vod-sync/public-film-archives-merge-report.json"]);
} catch (error) { failures.push(error.message); }
await refreshStep("Publish title profiles", "scripts/build-vod-title-files.mjs");
await refreshStep("Publish archive indexes", "scripts/build-vod-index.mjs");
if (failures.length) throw new Error(failures.join("; "));
