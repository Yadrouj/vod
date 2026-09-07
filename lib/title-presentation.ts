import type { VodItem, VodLink } from "./types";

/** Unsigned URLs have no expiration. Never interpret a missing parameter as 0. */
export function videoUrlExpired(value: string, now = Date.now()) {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return true;
    const params = new Map([...url.searchParams].map(([key, val]) => [key.toLowerCase(), val]));
    const expires = params.get("expires") ?? params.get("exp");
    if (expires && Number.isFinite(Number(expires))) return Number(expires) * 1000 <= now + 60_000;
    const signedAt = params.get("x-amz-date");
    const lifetime = params.get("x-amz-expires");
    if (signedAt && lifetime && /^\d{8}T\d{6}Z$/.test(signedAt)) {
      const date = signedAt.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z");
      return Date.parse(date) + Number(lifetime) * 1000 <= now + 60_000;
    }
    return false;
  } catch { return true; }
}

export function trailerPlayback(video: NonNullable<VodItem["imdbVideos"]>[number], now = Date.now()) {
  return (video.playback_urls ?? [])
    .filter((file) => !videoUrlExpired(file.url, now)
      && (/\.(mp4|m4v|webm)(?:$|[?#])/i.test(file.url) || /^(video\/)?(mp4|webm)$/i.test(file.mime_type ?? "")))
    .sort((a, b) => previewCost(a.quality) - previewCost(b.quality))[0]?.url ?? null;
}

function previewCost(quality?: string | null) {
  const height = Number(quality?.match(/\d+/)?.[0] ?? 720);
  return height === 720 ? 0 : height <= 720 ? 1 : height;
}

export function detailHeroVideo(item: Pick<VodItem, "imdbVideos">, now = Date.now()) {
  // Interviews, clips and full movies must not silently become a trailer.
  for (const video of item.imdbVideos ?? []) {
    if (!/trailer|teaser|preview|تریلر|تیزر/i.test(video.name)) continue;
    const url = trailerPlayback(video, now);
    if (url) return url;
  }
  return null;
}

export function titleDownloadLinks(links: VodLink[]) {
  return links.filter((link) => /^https?:\/\//i.test(link.url)
    && link.mediaKind !== "trailer" && link.mediaKind !== "subtitle"
    && !/(?:^|[._/\s-])(?:trailer|teaser|preview|promo|clip)(?:[._/\s-]|$)/i.test(`${link.label} ${link.fileName ?? ""} ${link.url}`)
    && !/\.(srt|vtt|ass|ssa|sub)(?:$|[?#])/i.test(link.url));
}

/** Highest tagged resolution among actual release files, not a folder or preview. */
export function bestDownloadLink(links: VodLink[]) {
  return titleDownloadLinks(links)
    .filter((link) => link.mediaKind !== "archive" && /\.(mp4|m4v|webm|mkv|mov|avi|ts)(?:$|[?#])/i.test(link.url))
    .sort((a, b) => qualityScore(b) - qualityScore(a))[0] ?? null;
}

function qualityScore(link: VodLink) {
  const text = `${link.quality ?? ""} ${link.label} ${link.url}`;
  return Number(text.match(/(?:^|\D)(2160|1440|1080|720|576|480|360)p?(?=\D|$)/i)?.[1] ?? (/4k/i.test(text) ? 2160 : 0));
}

export function sourceHost(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}
