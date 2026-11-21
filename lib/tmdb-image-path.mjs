// Client-safe helpers for the self-hosted TMDB image mirror.
//
// image.tmdb.org is filtered for most SarvNema visitors (and for the production
// server itself), so pages never point browsers at TMDB. Every TMDB image is
// presented as /media/tmdb/<size>/<file>, which the app serves from the
// `sarvnema-tmdb` MinIO bucket (see docs/tmdb-image-mirror.md).

export const TMDB_IMAGE_HOSTS = new Set(["image.tmdb.org", "media.themoviedb.org"]);
export const TMDB_MIRROR_PREFIX = "/media/tmdb";

// TMDB sizes: w185, h632, original, or face crops like w454_and_h254_face.
const SIZE = /^(?:original|[wh]\d{2,4}|w\d{2,4}_and_h\d{2,4}_[a-z]{2,24})$/;
// No SVG: served from our own origin it could carry script.
const FILE = /^[A-Za-z0-9_-]{1,80}\.(?:jpe?g|png|webp)$/i;

/** Ordered fallbacks used when the exact size has not been mirrored yet. */
export const TMDB_WIDTHS = [185, 300, 342, 500, 780, 1280];

export function isTmdbImageSize(size) {
  return typeof size === "string" && SIZE.test(size);
}

export function isTmdbImageFile(file) {
  return typeof file === "string" && FILE.test(file);
}

/** @returns {{ size: string, file: string } | null} */
export function parseTmdbImageUrl(value) {
  if (typeof value !== "string" || !value) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password || url.port) return null;
  if (!TMDB_IMAGE_HOSTS.has(url.hostname.toLowerCase())) return null;
  const match = /^\/t\/p\/([^/]+)\/([^/]+)$/.exec(url.pathname);
  if (!match || !isTmdbImageSize(match[1]) || !isTmdbImageFile(match[2])) return null;
  return { size: match[1], file: match[2] };
}

export function tmdbMirrorPath(size, file) {
  return `${TMDB_MIRROR_PREFIX}/${size}/${file}`;
}

export function tmdbObjectKey(size, file) {
  return `${size}/${file}`;
}

export function tmdbUpstreamUrl(size, file) {
  return `https://image.tmdb.org/t/p/${size}/${file}`;
}

/** Rewrites a TMDB image URL to the same-origin mirror path; other URLs pass through. */
export function mirroredTmdbUrl(value) {
  const parsed = parseTmdbImageUrl(value);
  return parsed ? tmdbMirrorPath(parsed.size, parsed.file) : value;
}

/**
 * Sizes to try, nearest first, for a request. Larger sizes win ties so a
 * fallback is never blurrier than necessary.
 */
export function tmdbFallbackSizes(size) {
  const match = /^w(\d{2,4})$/.exec(size);
  if (size === "original") return ["original", "w1280", "w780", "w500"];
  if (!match) return [size];
  const wanted = Number(match[1]);
  const others = TMDB_WIDTHS.filter(width => width !== wanted)
    .sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted) || b - a)
    .map(width => `w${width}`);
  return [size, ...others, "original"];
}

/** Recognises the image types the mirror stores, from the bytes themselves. */
export function tmdbImageType(bytes) {
  if (!bytes || bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  // ISO-BMFF: "ftyp" at offset 4, then the brand.
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}
