import { createWriteStream } from "node:fs";
import { readFile, mkdir, rename, writeFile, unlink } from "node:fs/promises";
import { once } from "node:events";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";
import { quarantineLegacyMetadata, legacyMismatch } from "./catalog-evidence.mjs";
import { readLegacyList } from "./scrape-oitn-films.mjs";

const catalog = "public/data/vod-catalog.json", output = `${catalog}.tmp-${process.pid}`;
const names = new Map(readLegacyList(await readFile("scripts/data/old-iranian-film-list.txt", "utf8")).map(e => [e.id, e.title]));
const references = JSON.parse(await readFile("public/data/old-iranian-video-references.json", "utf8"));
const grouped = Map.groupBy(references.items, item => item.id);
const backup = [], stats = { metadataQuarantined: 0, linkedTitles: 0, youtubeReferences: 0 };
await mkdir(".media-cache/research", { recursive: true });
const stream = createWriteStream(output, { encoding: "utf8" });
let first = true;
const write = async value => { if (!stream.write(value)) await once(stream, "drain"); };
try {
  await streamVodArchiveItems(catalog, async item => {
    if (legacyMismatch(item)) { backup.push(item); stats.metadataQuarantined++; item = quarantineLegacyMetadata(item, names.get(item.id)); }
    const videos = grouped.get(item.id);
    if (videos?.length) {
      const existing = new Map((item.youtubeVideos || []).map(v => [v.videoId, v]));
      for (const ref of videos) existing.set(ref.videoId, {
        videoId: ref.videoId, title: ref.filmTitle, channel: ref.publisher,
        sourceUrl: `https://www.youtube.com/watch?v=${ref.videoId}`, thumbnailUrl: `https://i.ytimg.com/vi/${ref.videoId}/hqdefault.jpg`,
        evidenceUrl: ref.sourceUrl, checkedAt: ref.checkedAt, durationSeconds: ref.durationSeconds, playbackStatus: ref.playbackStatus,
      });
      item.youtubeVideos = [...existing.values()];
      item.posterUrl ||= item.youtubeVideos[0].thumbnailUrl;
      item.backdropUrl ||= item.youtubeVideos[0].thumbnailUrl;
      item.runtimeMinutes ||= Math.round(videos[0].durationSeconds / 60);
      stats.linkedTitles++; stats.youtubeReferences += videos.length;
      // Discovery is not a new release: leave publication/freshness dates untouched.
    }
    await write(`${first ? "" : ","}${JSON.stringify(item)}`); first = false;
  }, { onMetadata: async header => { const { items, ...rest } = header; await write(`${JSON.stringify(rest).slice(0,-1)},"items":[`); } });
  await write("]}"); stream.end(); await once(stream, "finish");
  // Preserve rejected records before replacing the archive, including original metadata.
  if (backup.length) await writeFile(`.media-cache/research/legacy-quarantine-${Date.now()}.json`, JSON.stringify(backup));
  await rename(output, catalog);
  await writeFile("data/legacy-video-repair-report.json", JSON.stringify({ checkedAt: new Date().toISOString(), ...stats }, null, 2));
  console.log(JSON.stringify(stats));
} catch (error) { stream.destroy(); await unlink(output).catch(() => {}); throw error; }
