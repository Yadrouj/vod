// MuscleWiki mp4s are 403'd when hotlinked cross-origin by a browser, so video
// playback goes through our same-origin proxy (see app/api/media/route.ts).
// Poster/thumbnail images load fine cross-origin and are used directly.

export function proxiedVideo(url: string): string {
  return `/api/media?u=${encodeURIComponent(url)}`;
}

export function videoSrc(clip: { url: string; localUrl?: string }): string {
  return clip.localUrl || proxiedVideo(clip.url);
}
