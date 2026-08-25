import { loadMusicIndex } from "@/lib/music";

const MAX_ID_LENGTH = 180;
const MAX_URL_LENGTH = 4096;

/**
 * Streams a catalogued music source through our origin.
 *
 * A few music hosts return valid audio with Content-Disposition: attachment.
 * Browsers then download the file instead of attaching it to <audio>. This
 * route normalizes those headers while remaining catalog-backed (and therefore
 * not an open proxy).
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const id = requestUrl.searchParams.get("id")?.trim() ?? "";
  const sourceUrl = requestUrl.searchParams.get("url")?.trim() ?? "";

  if (!id || id.length > MAX_ID_LENGTH || !sourceUrl || sourceUrl.length > MAX_URL_LENGTH) {
    return Response.json({ error: "Invalid music source." }, { status: 400 });
  }

  const track = (await loadMusicIndex()).tracks.find((item) => item.id === id);
  const source = track?.sources.find((item) => item.url === sourceUrl);
  if (!source?.url || source.available === false || !isHttpUrl(source.url)) {
    return Response.json({ error: "Music source is not available." }, { status: 404 });
  }

  const range = request.headers.get("range");
  const upstreamHeaders = new Headers({
    Accept: "audio/*,video/*;q=0.8,*/*;q=0.1",
    "User-Agent": "SarvNema media relay/1.0",
  });
  if (range) upstreamHeaders.set("Range", range);

  let upstream: Response;
  let resolvedSourceUrl = source.url;
  try {
    upstream = await fetch(source.url, {
      cache: "no-store",
      headers: upstreamHeaders,
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    const fallbackUrl = worldOfMusicHttpFallback(source.url, source.provider);
    if (!fallbackUrl) return Response.json({ error: "The music source could not be reached." }, { status: 502 });
    try {
      resolvedSourceUrl = fallbackUrl;
      upstream = await fetch(fallbackUrl, {
        cache: "no-store",
        headers: upstreamHeaders,
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      return Response.json({ error: "The music source could not be reached." }, { status: 502 });
    }
  }

  if (!upstream.ok && upstream.status !== 206) {
    return Response.json({ error: "The music source rejected playback." }, { status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502 });
  }

  const headers = new Headers();
  const upstreamContentType = upstream.headers.get("content-type")?.split(";")[0].trim().toLocaleLowerCase() ?? "";
  const contentType = isGenericContentType(upstreamContentType)
    ? inferMediaContentType(resolvedSourceUrl, track?.kind === "video")
    : upstreamContentType || inferMediaContentType(resolvedSourceUrl, track?.kind === "video");
  if (contentType) headers.set("Content-Type", contentType.split(";")[0]);
  for (const name of ["content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Cache-Control", "public, max-age=300, s-maxage=900");
  headers.set("X-Content-Type-Options", "nosniff");
  if (resolvedSourceUrl !== source.url) headers.set("X-Sarvnema-Source-Fallback", "http");

  return new Response(upstream.body, { status: upstream.status, headers });
}

function worldOfMusicHttpFallback(value: string, provider?: string) {
  try {
    const url = new URL(value);
    if (provider !== "worldofmusic" || url.protocol !== "https:" || url.hostname !== "dl2.worldofmusic.ir") return null;
    url.protocol = "http:";
    return url.toString();
  } catch {
    return null;
  }
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function inferMediaContentType(value: string, video: boolean) {
  const pathname = new URL(value).pathname.toLocaleLowerCase();
  if (pathname.endsWith(".mp3")) return "audio/mpeg";
  if (pathname.endsWith(".m4a")) return "audio/mp4";
  if (pathname.endsWith(".mp4")) return video ? "video/mp4" : "audio/mp4";
  if (pathname.endsWith(".aac")) return "audio/aac";
  if (pathname.endsWith(".ogg") || pathname.endsWith(".oga") || pathname.endsWith(".opus")) return "audio/ogg";
  if (pathname.endsWith(".wav")) return "audio/wav";
  if (pathname.endsWith(".webm")) return video ? "video/webm" : "audio/webm";
  if (pathname.endsWith(".mkv")) return "video/x-matroska";
  return "application/octet-stream";
}

function isGenericContentType(value: string) {
  return !value || value === "application/octet-stream" || value === "binary/octet-stream" || value === "application/download";
}
