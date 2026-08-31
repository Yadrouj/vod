import { loadMusicIndex, searchMusic } from "@/lib/music";
import { publicCacheHeaders } from "@/lib/runtime-cache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const requestedLimit = Number(searchParams.get("limit") ?? 12);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.floor(requestedLimit), 6), 20) : 12;
  const tracks = searchMusic(await loadMusicIndex(), query).slice(0, limit);
  const currentYear = new Date().getUTCFullYear();
  return Response.json({
    items: tracks.map((track) => {
      const year = track.publishedAt?.match(/\b(19|20)\d{2}\b/)?.[0] ? Number(track.publishedAt.match(/\b(19|20)\d{2}\b/)?.[0]) : null;
      return {
      imdbCode: track.id,
      title: track.persianTitle || track.title,
      year,
      type: track.kind === "video" ? "Music video" : "Track",
      posterUrl: track.coverUrl,
      imdbRating: null,
      artists: track.artists.map((artist) => artist.name),
      updatedAt: track.detailCheckedAt ?? track.publishedAt ?? null,
      isFresh: isFreshRelease(track.publishedAt, track.folder, year, currentYear),
      };
    }),
  }, { headers: publicCacheHeaders({ browserSeconds: 30, edgeSeconds: 120 }) });
}

function isFreshRelease(publishedAt: string | null, folder: { year: string | null; month: string | null; day: string | null }, year: number | null, currentYear: number) {
  const timestamp = Date.parse(publishedAt || [folder.year, folder.month, folder.day].filter(Boolean).join("-"));
  const age = Date.now() - timestamp;
  return (Number.isFinite(timestamp) && age >= 0 && age <= 7 * 24 * 60 * 60 * 1_000) || (year ?? 0) >= currentYear;
}
