import { mirroredUrl } from "./image-mirror-path.mjs";

const IMDB_HOST = "m.media-amazon.com";
// A fixed set keeps the mirror from storing a copy per arbitrary pixel width.
const IMDB_WIDTHS = [160, 320, 480, 720, 1080, 1440, 1920];

/**
 * External images are filtered or slow for our visitors: serve TMDB and every
 * allow-listed image host from the same-origin MinIO mirror (/media/tmdb,
 * /media/img). Other URLs, and videos, pass through unchanged.
 */
export function mirroredImageUrl<T extends string | null | undefined>(value: T): T {
  return (typeof value === "string" ? mirroredUrl(value) : value) as T;
}

export function sizedImageUrl(value: string | null | undefined, width: number) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname === IMDB_HOST) {
      url.pathname = url.pathname.replace(/\._V1_[^/]*(?=\.[a-z0-9]+$)/i, `._V1_QL75_UX${nearestImdbWidth(width)}_`);
      return mirroredUrl(url.toString());
    }
    if (/image\.tmdb\.org$/i.test(url.hostname)) {
      const tmdbWidth = nearestTmdbWidth(width);
      url.pathname = url.pathname.replace(/\/(?:original|w\d+)\//, `/${tmdbWidth}/`);
      return mirroredUrl(url.toString());
    }
  } catch {
    return value;
  }
  return mirroredUrl(value);
}

function nearestImdbWidth(width: number) {
  const wanted = Math.max(120, Math.round(width));
  return IMDB_WIDTHS.find((candidate) => candidate >= wanted) ?? IMDB_WIDTHS.at(-1)!;
}

function nearestTmdbWidth(width: number) {
  const widths = [185, 342, 500, 780, 1280];
  return `w${widths.find((candidate) => candidate >= width) ?? 1280}`;
}
