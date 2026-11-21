// Client-safe helpers for the self-hosted external image mirror.
//
// Many image hosts are filtered for SarvNema visitors (TVMaze, YouTube, TMDB)
// or are slow/unreliable from Iran. Pages therefore never point browsers at
// them: every allow-listed image is presented as
//   /media/img/<host>/<path>[?<query>]          (https upstream)
//   /media/img/http~<host>/<path>[?<query>]     (plain http upstream)
// and the app serves it from the public `sarvnema-tmdb` MinIO bucket under
// `ext/...`, copying it on first view (docs/image-mirror.md). TMDB keeps its own
// sized route, /media/tmdb (lib/tmdb-image-path.mjs). Videos are never mirrored.
import { mirroredTmdbUrl, parseTmdbImageUrl } from "./tmdb-image-path.mjs";

export const IMAGE_MIRROR_PREFIX = "/media/img";

// Exact hosts, from the catalog's image references (Nov 2026). The allowlist
// keeps /media/img from becoming an open proxy that strangers could use to
// fill the disk. Add new scraper sources here.
export const IMAGE_MIRROR_HOSTS = new Set([
  "static.tvmaze.com", "m.media-amazon.com", "artworks.thetvdb.com", "img.melodify.pw",
  "movielandz.com", "worldofmusic.ir", "rozmusic.com", "www.moviesho.com", "moviesho.com",
  "intocdn.top", "zardfilm.in", "commons.wikimedia.org", "upload.wikimedia.org",
  "thumb.wikimedia.org", "mihandownload.com", "musics-fa.com", "meloobit.ir", "i.ytimg.com",
  "img.youtube.com", "remiixbaz.com", "aftabmusic.com", "samfaa-static.s3.ir-thr-at1.arvanstorage.ir",
  "cdn.khabarfoori.com", "newsmedia.tasnimmedia.com", "flato.ir", "dkyhanv6paotz.cloudfront.net",
  "cdn.manzoom.ir", "tiarin.ir", "sevilmusics.com", "avadel.top", "webava.top", "uptune.ir",
  "musics-mehr.com", "imgsrv.crunchyroll.com", "en.pastelfilm.com.tr", "dl.avajavan.com",
  "assets.imvbox.com",
  "pardehtv.com", "familymovie.tr",
]);
// Apple Music artwork is spread over is1-ssl … is5-ssl.mzstatic.com.
const HOST_PATTERNS = [/^is\d+-ssl\.mzstatic\.com$/];

const NOT_IMAGES = /\.(?:mp4|m4v|m3u8|mpd|ts|webm|mkv|mov|avi|flv|mp3|m4a|aac|ogg|oga|opus|wav|flac|zip|rar|apk|pdf|html?|js|css|json|svgz?)$/i;

export function isMirrorImageHost(host) {
  const lower = String(host || "").toLowerCase();
  return IMAGE_MIRROR_HOSTS.has(lower) || HOST_PATTERNS.some(pattern => pattern.test(lower));
}

/** @returns {URL | null} an allow-listed, non-video image URL */
export function parseMirrorableImageUrl(value) {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.username || url.password || url.port || url.hash) return null;
  if (!isMirrorImageHost(url.hostname)) return null;
  if (url.pathname.length < 2 || url.pathname.length > 900 || url.search.length > 400) return null;
  if (NOT_IMAGES.test(url.pathname)) return null;
  if (url.pathname.split("/").some(part => part === ".." || part === ".")) return null;
  return url;
}

/** /media/img path for an external image URL, or null when it is not mirrored. */
export function externalMirrorPath(value) {
  const url = parseMirrorableImageUrl(value);
  if (!url) return null;
  const host = url.protocol === "http:" ? `http~${url.hostname}` : url.hostname;
  return `${IMAGE_MIRROR_PREFIX}/${host}${url.pathname}${url.search}`;
}

/**
 * Inverse of externalMirrorPath: the raw (still percent-encoded) path after
 * /media/img/ plus the query string → the upstream URL.
 */
export function upstreamFromMirrorPath(rawPath, search = "") {
  const match = /^\/?(http~)?([a-z0-9.-]+)(\/[^?#]*)$/i.exec(rawPath);
  if (!match || /(?:^|\/)(?:\.|%2e){1,2}(?:\/|$)/i.test(match[3])) return null;
  const url = parseMirrorableImageUrl(`${match[1] ? "http" : "https"}://${match[2]}${match[3]}${search}`);
  return url ? url.href : null;
}

/** Rewrites any mirrored image URL (TMDB or external) to its same-origin path. */
export function mirroredUrl(value) {
  if (typeof value !== "string" || !value) return value;
  if (parseTmdbImageUrl(value)) return mirroredTmdbUrl(value);
  return externalMirrorPath(value) ?? value;
}
