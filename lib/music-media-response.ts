import { mediaMimeType } from "./media-compatibility";

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
  headers.set("Vary", "Range");
  headers.set("Cache-Control", range ? "private, no-store, no-transform" : "public, max-age=300, s-maxage=900, no-transform");
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}
