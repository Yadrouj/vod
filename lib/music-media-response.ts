import { mediaMimeType } from "./media-compatibility";

const SONG_CACHE_SECONDS = 7 * 24 * 60 * 60;

export function musicRelayHeaders(upstream: Response, url: string, video: boolean, range: string | null) {
  const headers = new Headers();
  const reported = upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase() || "";
  const generic = !reported || /^(?:application\/(?:octet-stream|download|force-download)|binary\/octet-stream)$/i.test(reported);
  const inferred = mediaMimeType(url, !video);
  const type = generic || ["audio/mp3", "audio/x-mp3"].includes(reported) ? inferred || "application/octet-stream" : reported;
  headers.set("Content-Type", type);
  for (const name of ["content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
    const value = upstream.headers.get(name); if (value) headers.set(name, value);
  }
  // Some music CDNs return valid 206 responses without advertising ranges.
  // Do not fabricate support for a source that actually ignored Range.
  if (upstream.status === 206 && /^bytes \d+-\d+\/\d+$/i.test(headers.get("content-range") || "")) headers.set("Accept-Ranges", "bytes");
  // Song files never change under a catalogued URL, so let browsers keep them: replaying,
  // seeking or reopening a track must not download it again. Range responses stay private
  // so a shared cache can never store a slice as the whole song; the browser's own cache
  // understands Content-Range, and Vary: Range would make every new slice a cache miss.
  if (range) {
    headers.set("Cache-Control", `private, max-age=${SONG_CACHE_SECONDS}, no-transform`);
  } else {
    headers.set("Vary", "Range");
    headers.set("Cache-Control", `public, max-age=${SONG_CACHE_SECONDS}, s-maxage=${SONG_CACHE_SECONDS}, no-transform`);
  }
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}
