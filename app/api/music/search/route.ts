import { loadMusicIndex, searchMusic } from "@/lib/music";
import { publicCacheHeaders } from "@/lib/runtime-cache";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const tracks = searchMusic(await loadMusicIndex(), query).slice(0, 12);
  return Response.json({
    items: tracks.map((track) => ({
      imdbCode: track.id,
      title: track.persianTitle || track.title,
      year: track.publishedAt?.match(/\b(19|20)\d{2}\b/)?.[0] ? Number(track.publishedAt.match(/\b(19|20)\d{2}\b/)?.[0]) : null,
      type: track.kind === "video" ? "Music video" : "Track",
      posterUrl: track.coverUrl,
      imdbRating: null,
      artists: track.artists.map((artist) => artist.name),
    })),
  }, { headers: publicCacheHeaders({ browserSeconds: 30, edgeSeconds: 120 }) });
}
