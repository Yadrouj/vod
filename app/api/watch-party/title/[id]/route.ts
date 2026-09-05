import { findVodItem, normalizeVodType } from "@/lib/catalog";
import { playbackSourceLabel, roomPlayableLinks } from "@/lib/link-labels";
import { publicCacheHeaders } from "@/lib/runtime-cache";
import { watchPartyDetails } from "@/lib/watch-party-media";

type Props = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Props) {
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) return Response.json({ error: "Title not found" }, { status: 404 });
  const isSeries = normalizeVodType(item.type) === "series";
  const sources = roomPlayableLinks(item.links, { isSeries, title: item.title }).map((link, index) => ({
    url: link.url,
    label: playbackSourceLabel(link, index, isSeries),
    quality: link.quality,
    season: isSeries ? link.season ?? null : null,
    episode: isSeries ? link.episode ?? null : null,
    subtitleUrl: link.subtitleUrl ?? null,
  }));
  if (!sources.length) return Response.json({ error: "No playable source" }, { status: 404 });
  return Response.json(
    {
      itemId: item.imdbCode,
      title: item.title,
      posterUrl: item.backdropUrl ?? item.posterUrl ?? null,
      source: sources[0],
      sources,
      details: watchPartyDetails(item),
    },
    { headers: publicCacheHeaders({ browserSeconds: 60, edgeSeconds: 900 }) },
  );
}
