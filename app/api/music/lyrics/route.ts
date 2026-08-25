import { findMusicTrack, loadMusicIndex } from "@/lib/music";
import { scrapeMusicLyrics } from "@/lib/music-lyrics";
import { checkRateLimit, clientIp, publicCacheHeaders, rateLimitedResponse, rateLimitHeaders } from "@/lib/runtime-cache";

export const dynamic = "force-dynamic";

const TRUSTED_HOSTS = new Set([
  "musics-fa.com", "www.musics-fa.com", "rozmusic.com", "www.rozmusic.com",
  "remiixbaz.com", "www.remiixbaz.com", "aftabmusic.com", "www.aftabmusic.com",
  "sevilmusics.com", "www.sevilmusics.com", "musics-mehr.com", "www.musics-mehr.com",
  "worldofmusic.ir", "www.worldofmusic.ir",
]);

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id || id.length > 180) return Response.json({ found: false, lines: [], message: "Invalid track." }, { status: 400 });

  const rate = checkRateLimit(`music-lyrics:${clientIp(request)}`, 30, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate);

  const track = findMusicTrack(await loadMusicIndex(), id);
  if (!track || !isTrustedSource(track.sourceUrl)) return Response.json({ found: false, lines: [], message: "Lyrics are not available for this source." }, { status: 404 });

  try {
    const result = await scrapeMusicLyrics(track.sourceUrl);
    return Response.json(result, { headers: { ...publicCacheHeaders({ browserSeconds: 300, edgeSeconds: 21_600 }), ...rateLimitHeaders(rate) } });
  } catch (error) {
    return Response.json({ found: false, lines: [], sourceUrl: track.sourceUrl, message: error instanceof Error ? error.message : "Lyrics could not be loaded." }, { status: 502, headers: rateLimitHeaders(rate) });
  }
}

function isTrustedSource(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && TRUSTED_HOSTS.has(url.hostname.toLocaleLowerCase());
  } catch {
    return false;
  }
}
