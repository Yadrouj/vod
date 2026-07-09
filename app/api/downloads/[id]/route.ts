import { findVodItem, normalizeVodType } from "@/lib/catalog";
import { buildSeasonSummaries, expandSeasonDownloads, movieDownloadSources } from "@/lib/downloads";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: Props) {
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) return Response.json({ error: "Title not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const season = Number(searchParams.get("season") ?? 0);
  const seasons = buildSeasonSummaries(item.links);
  const isSeries = normalizeVodType(item.type) === "series" && seasons.length > 0;

  if (!isSeries) {
    return Response.json({
      type: "movie",
      files: movieDownloadSources(item.links),
    });
  }

  const selectedSeason = seasons.some((summary) => summary.season === season) ? season : seasons[0].season;
  const downloads = await expandSeasonDownloads(item, selectedSeason);
  return Response.json({
    type: "series",
    seasons,
    ...downloads,
  });
}
