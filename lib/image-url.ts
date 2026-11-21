import { mirroredTmdbUrl } from "./tmdb-image-path.mjs";

const IMDB_HOST = "m.media-amazon.com";

/** TMDB is filtered for our visitors: serve it from the same-origin MinIO mirror. */
export function mirroredImageUrl<T extends string | null | undefined>(value: T): T {
  return (typeof value === "string" ? mirroredTmdbUrl(value) : value) as T;
}

export function sizedImageUrl(value: string | null | undefined, width: number) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname === IMDB_HOST) {
      url.pathname = url.pathname.replace(/\._V1_[^/]*(?=\.[a-z0-9]+$)/i, `._V1_QL75_UX${Math.max(120, Math.round(width))}_`);
      return url.toString();
    }
    if (/image\.tmdb\.org$/i.test(url.hostname)) {
      const tmdbWidth = nearestTmdbWidth(width);
      url.pathname = url.pathname.replace(/\/(?:original|w\d+)\//, `/${tmdbWidth}/`);
      return mirroredTmdbUrl(url.toString());
    }
    if (/media\.themoviedb\.org$/i.test(url.hostname)) return mirroredTmdbUrl(value);
  } catch {
    return value;
  }
  return value;
}

function nearestTmdbWidth(width: number) {
  const widths = [185, 342, 500, 780, 1280];
  return `w${widths.find((candidate) => candidate >= width) ?? 1280}`;
}
