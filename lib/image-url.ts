const IMDB_HOST = "m.media-amazon.com";

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
      return url.toString();
    }
  } catch {
    return value;
  }
  return value;
}

function nearestTmdbWidth(width: number) {
  const widths = [185, 342, 500, 780, 1280];
  return `w${widths.find((candidate) => candidate >= width) ?? 1280}`;
}
