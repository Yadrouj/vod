import type { VodItem } from './types';
import { trailerPlayback } from './title-presentation';

export type ArticleVisuals = {
  images: { url: string; caption: string }[];
  trailer?: { name: string; url: string | null; sourceUrl?: string; poster?: string };
};
export function safeMediaUrl(value?: string | null): value is string {
  if (!value || /[\\\u0000-\u0020]/.test(value)) return false;
  if (value.startsWith('/')) return !value.startsWith('//') && !value.split('/').includes('..');
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

/** Read the same title gallery as About; never turn interviews into trailers. */
export function articleVisuals(item: Pick<VodItem, 'title' | 'imdbImages' | 'movieshoImages' | 'imdbVideos' | 'backdropUrl' | 'posterUrl'>, now = Date.now()): ArticleVisuals {
  const candidates = [...(item.imdbImages ?? []), ...(item.movieshoImages ?? [])];
  const landscape = candidates.filter(i => (i.width ?? 0) > (i.height ?? 0) && !/at an event|premiere|anniversary experience/i.test(i.caption ?? ''));
  const images = [...new Map([...landscape, ...candidates].filter(i => safeMediaUrl(i.url)).map(i => [i.url, { url: i.url, caption: i.caption || item.title }])).values()].slice(0, 2);
  if (!images.length) {
    const url = [item.backdropUrl, item.posterUrl].find(safeMediaUrl);
    if (url) images.push({ url, caption: item.title });
  }
  const trailers = item.imdbVideos?.filter(v => /trailer|teaser|preview|تریلر|تیزر/i.test(v.name)) ?? [];
  const video = trailers.find(v => trailerPlayback(v, now)) ?? trailers.find(v => /^vi\d+$/.test(v.video_id ?? ''));
  return { images, trailer: video ? {
    name: video.name, url: trailerPlayback(video, now),
    sourceUrl: /^vi\d+$/.test(video.video_id ?? '') ? `https://www.imdb.com/video/${video.video_id}/` : undefined,
    poster: safeMediaUrl(video.thumbnail_url) ? video.thumbnail_url : undefined,
  } : undefined };
}
