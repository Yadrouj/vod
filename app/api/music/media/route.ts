import { findMusicTrack, loadMusicIndex } from "@/lib/music";
import { fetchStreamHeaders } from "@/lib/upstream-stream";
import { musicAttachment } from "@/lib/music-download";
import { streamMelodifyFile } from "@/lib/melodify-library";
import { musicRelayHeaders } from "@/lib/music-media-response";
import { fetchHostedFile } from "@/lib/hosted-music";

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
  const download = requestUrl.searchParams.get("download") === "1";

  if (!id || id.length > MAX_ID_LENGTH || !sourceUrl || sourceUrl.length > MAX_URL_LENGTH) {
    return Response.json({ error: "Invalid music source." }, { status: 400 });
  }

  const track = findMusicTrack(await loadMusicIndex(), id);
  const source = track?.sources.find((item) => item.url === sourceUrl);
  if (!source?.url || source.available === false) {
    return Response.json({ error: "Music source is not available." }, { status: 404 });
  }

  if (source.provider === "melodify") {
    return (await streamMelodifyFile(request, track!, source, download)) ?? Response.json({ error: "The music archive file is not available on this server.", code: "MUSIC_LIBRARY_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store", "X-Sarvnema-Media-Error": "library-unavailable" } });
  }
  if (!isHttpUrl(source.url)) return Response.json({ error: "Music source is not available." }, { status: 404 });

  const range = request.headers.get("range");
  const upstreamHeaders = new Headers({
    Accept: "audio/*,video/*;q=0.8,*/*;q=0.1",
    "User-Agent": "SarvNema media relay/1.0",
    "Accept-Encoding": "identity",
  });
  if (range) upstreamHeaders.set("Range", range);

  let upstream: Response;
  let resolvedSourceUrl = source.url;
  try {
    upstream = source.provider === "sarvnema-hosted"
      ? await fetchHostedFile(source.url, upstreamHeaders, request.signal)
      : await fetchStreamHeaders(source.url, upstreamHeaders, request.signal);
  } catch {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    const fallbackUrl = worldOfMusicHttpFallback(source.url, source.provider);
    if (!fallbackUrl) return Response.json({ error: "The music source could not be reached." }, { status: 502 });
    try {
      resolvedSourceUrl = fallbackUrl;
      upstream = await fetchStreamHeaders(fallbackUrl, upstreamHeaders, request.signal);
    } catch {
      return Response.json({ error: "The music source could not be reached." }, { status: 502 });
    }
  }

  if (!upstream.ok && upstream.status !== 206) {
    await upstream.body?.cancel();
    return Response.json({ error: "The music source rejected playback." }, { status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502 });
  }

  const upstreamContentType = upstream.headers.get("content-type")?.split(";")[0].trim().toLocaleLowerCase() ?? "";
  if (/(?:text\/|json|html|xml)/i.test(upstreamContentType)) {
    await upstream.body?.cancel();
    return Response.json({ error: "The source returned a page instead of a media file. Please try another quality." }, { status: 502 });
  }
  const headers = musicRelayHeaders(upstream, resolvedSourceUrl, track?.kind === "video", range);
  if (download) headers.set("Content-Disposition", musicAttachment(track?.persianTitle || track?.title || "SarvNema", source.url));
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

export async function HEAD(request: Request) {
  const headers = new Headers(request.headers);
  const requestedRange = headers.has("range");
  if (!requestedRange) headers.set("Range", "bytes=0-1");
  const response = await GET(new Request(request.url, { headers, signal: request.signal }));
  await response.body?.cancel();
  const resultHeaders = new Headers(response.headers);
  const total = /\/(\d+)$/.exec(resultHeaders.get("content-range") || "")?.[1];
  if (!requestedRange && response.status === 206 && total) {
    resultHeaders.delete("content-range"); resultHeaders.set("Content-Length", total);
    return new Response(null, { status: 200, headers: resultHeaders });
  }
  return new Response(null, { status: response.status, headers: resultHeaders });
}
