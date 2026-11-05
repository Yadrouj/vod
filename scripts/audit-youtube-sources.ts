import { mkdir, opendir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { enrichOldIranianFilm } from "../lib/old-iranian-media";
import { contentRestriction } from "../lib/content-restrictions.mjs";
import { canonicalYouTubeUrl } from "../components/youtube-download-guide";
import type { VodItem } from "../lib/types";
import { probeYouTubeMetadata, youtubeNetworkState } from "./youtube-source-audit-lib.mjs";

async function main() {
  const remote = process.argv.includes("--remote");
  const arg = (key: string, fallback: string) => process.argv.find(value => value.startsWith(`--${key}=`))?.slice(key.length + 3) || fallback;
  const limit = Math.max(1, Math.min(1000, Number(arg("limit", "50")) || 50));
  const root = path.resolve(process.env.VOD_DATA_DIR || "public/data");
  const output = path.resolve(arg("output", ".media-cache/youtube-audit"));
  const report = { checkedAt: new Date().toISOString(), scope: "YouTube references: structural inspection plus optional public metadata; not playback/download verification",
    titles: 0, titlesWithYouTube: 0, references: 0, invalidIds: 0, nonCanonicalLinks: 0,
    shortFeatureReferences: 0, restrictedSkipped: 0, probes: 0 };
  type Reference = { itemId: string; title: string; videoId: string; sourceUrl: string | null; storedSourceUrl: string; durationSeconds?: number; shortFeature: boolean };
  const references: Reference[] = [];
  let lastProgress = Date.now();
  for await (const entry of await opendir(path.join(root, "titles"))) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const raw = JSON.parse(await readFile(path.join(root, "titles", entry.name), "utf8")) as VodItem;
    report.titles++;
    if (contentRestriction(raw)) { report.restrictedSkipped++; continue; }
    const item = enrichOldIranianFilm(raw);
    if (item.youtubeVideos?.length) report.titlesWithYouTube++;
    for (const source of item.youtubeVideos || []) {
      if (contentRestriction({ title: item.title, source })) { report.restrictedSkipped++; continue; }
      const sourceUrl = canonicalYouTubeUrl(source.videoId);
      const shortFeature = Boolean(item.runtimeMinutes && item.runtimeMinutes >= 60 && source.durationSeconds && source.durationSeconds < 3600);
      report.references++;
      if (!sourceUrl) report.invalidIds++;
      if (sourceUrl && source.sourceUrl !== sourceUrl) report.nonCanonicalLinks++;
      if (shortFeature) report.shortFeatureReferences++;
      references.push({ itemId: item.imdbCode || item.id, title: item.title, videoId: source.videoId, sourceUrl,
        storedSourceUrl: source.sourceUrl, durationSeconds: source.durationSeconds, shortFeature });
    }
    if (Date.now() - lastProgress > 30000) { lastProgress = Date.now(); console.log(JSON.stringify({ phase: "inventory", titles: report.titles, references: report.references })); }
  }
  const network = await youtubeNetworkState();
  const unique = [...new Map(references.filter(row => row.sourceUrl && !row.shortFeature).map(row => [row.videoId, row])).values()];
  const checks: { videoId: string; check: Awaited<ReturnType<typeof probeYouTubeMetadata>> }[] = [];
  if (remote && network.state === "public-dns") {
    let cursor = 0;
    await Promise.all(Array.from({ length: 2 }, async () => {
      while (cursor < Math.min(unique.length, limit)) {
        const row = unique[cursor++]; report.probes++;
        checks.push({ videoId: row.videoId, check: await probeYouTubeMetadata(row.videoId) });
        if (checks.length % 10 === 0) console.log(JSON.stringify({ phase: "metadata", completed: checks.length }));
      }
    }));
  }
  await mkdir(output, { recursive: true });
  const temporary = path.join(output, `report.${process.pid}.tmp`);
  await writeFile(temporary, JSON.stringify({ ...report, network, uniqueVideoIds: unique.length, remoteSkipped: remote && network.state !== "public-dns", references, checks }, null, 2) + "\n");
  await rename(temporary, path.join(output, "report.json"));
  // Export existing, syntactically valid references. Never invent replacement
  // IDs or label unprobed sources as available because DNS/network is blocked.
  await writeFile(path.join(output, "catalog-links.txt"), references.filter(row => row.sourceUrl).map(row => `${row.title}\n${row.sourceUrl}\n`).join("\n"));
  console.log(JSON.stringify({ ...report, network, uniqueVideoIds: unique.length, remoteSkipped: remote && network.state !== "public-dns", output }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
