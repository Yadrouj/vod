import { loadMusicIndex } from "./music";

/** Older bot/history links have no id: only resolve exact catalogued audio URLs. */
export async function resolveMusicDownload(url: string, musicId = "") {
  if (!musicId && !/\.(mp3|m4a|aac|ogg|oga|opus|wav|flac)(?:[?#]|$)/i.test(url)) return null;
  const track = (await loadMusicIndex()).tracks.find(item => (!musicId || item.id === musicId)
    && item.sources.some(source => source.url === url && source.available !== false));
  if (!track) return null;
  return `/api/music/media?${new URLSearchParams({ id: track.id, url, download: "1" })}`;
}

export function musicAttachment(title: string, sourceUrl: string) {
  const extension = new URL(sourceUrl).pathname.match(/\.(mp3|m4a|mp4|aac|ogg|oga|opus|wav|flac|webm|mkv)$/i)?.[1]?.toLowerCase() || "bin";
  const name = (title.replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g, "").trim() || "SarvNema").slice(0, 120);
  const filename = `${name}.${extension}`;
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="SarvNema.${extension}"; filename*=UTF-8''${encoded}`;
}
