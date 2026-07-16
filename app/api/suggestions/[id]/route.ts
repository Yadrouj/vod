import { findVodItem } from "@/lib/catalog";
import { similarTitles } from "@/lib/suggestions";
import { loadVodIndex } from "@/lib/vod-index";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const [item, index] = await Promise.all([findVodItem(id), loadVodIndex()]);
  if (!item) return Response.json({ items: [] }, { status: 404 });
  const items = similarTitles(item, index.items).map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    imdbCode: candidate.imdbCode,
    type: candidate.type,
    year: candidate.year,
    imdbRating: candidate.imdbRating,
    genres: candidate.genres,
    posterUrl: candidate.posterUrl,
    linksCount: candidate.linksCount,
    source: candidate.source,
  }));
  return Response.json({ items }, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
