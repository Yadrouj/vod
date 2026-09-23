import { findVodItem } from "@/lib/catalog";
import { similarTitles } from "@/lib/suggestions";
import { loadVodIndex } from "@/lib/vod-index";
import { loadImdbTrending } from "@/lib/imdb-trending";
import { loadAudienceSignals } from "@/lib/discovery-feedback";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const [item, index, trends, audience] = await Promise.all([findVodItem(id), loadVodIndex(), loadImdbTrending(100), loadAudienceSignals()]);
  if (!item) return Response.json({ items: [] }, { status: 404 });
  const items = similarTitles(item, index.items, { trends, audience }).map((candidate) => ({
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
    headers: { "Cache-Control": "public, max-age=30, s-maxage=300, stale-while-revalidate=300" },
  });
}
