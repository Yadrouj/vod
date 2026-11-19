import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { VodItem } from './types';
import { normalizeImdbVideos, hasPlayableTrailer } from './imdb-trailer-data.mjs';

let cache: { checkedAt: number; mtime: number; items: Record<string, { videos: NonNullable<VodItem['imdbVideos']> }> } = { checkedAt: 0, mtime: 0, items: {} };
let pending: Promise<void> | null = null;
export async function applyRefreshedImdbTrailers(item: VodItem): Promise<VodItem> {
  if (Date.now() - cache.checkedAt > 30_000) {
    pending ??= (async () => {
      try {
        const file = path.join(process.env.VOD_DATA_DIR || 'public/data', 'imdb-trailers.json');
        const info = await stat(file);
        if (info.mtimeMs !== cache.mtime) {
          const payload = JSON.parse(await readFile(file, 'utf8'));
          if (payload.version === 1 && payload.items && typeof payload.items === 'object') cache = { ...cache, items: payload.items, mtime: info.mtimeMs };
        }
      } catch { /* A failed refresh must not remove the existing title gallery. */ }
      cache.checkedAt = Date.now();
    })().finally(() => { pending = null; });
    await pending;
  }
  const extra = normalizeImdbVideos(cache.items[item.imdbCode]?.videos);
  if (!extra.length) return item;
  const videos = new Map<string, NonNullable<VodItem['imdbVideos']>[number]>();
  for (const video of [...(item.imdbVideos ?? []), ...extra]) {
    const key = video.video_id ?? video.name;
    if (!videos.has(key) || hasPlayableTrailer(video) || !hasPlayableTrailer(videos.get(key))) videos.set(key, video);
  }
  return { ...item, imdbVideos: [...videos.values()] };
}
