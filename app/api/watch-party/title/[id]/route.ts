import { findVodItem } from "@/lib/catalog";
import { episodeLabel, playableLinks } from "@/lib/link-labels";
import { publicCacheHeaders } from "@/lib/runtime-cache";

type Props = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Props) {
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) return Response.json({ error: "Title not found" }, { status: 404 });
  const sources = playableLinks(item.links).map((link, index) => ({
    url: link.url,
    label: [episodeLabel(link), link.quality, link.release ?? link.group].filter(Boolean).join(" / ") || `Source ${index + 1}`,
    quality: link.quality,
    season: link.season ?? null,
    episode: link.episode ?? null,
  }));
  if (!sources.length) return Response.json({ error: "No playable source" }, { status: 404 });
  return Response.json(
    { itemId: item.imdbCode, title: item.title, posterUrl: item.backdropUrl ?? item.posterUrl ?? null, source: sources[0], sources },
    { headers: publicCacheHeaders({ browserSeconds: 60, edgeSeconds: 900 }) },
  );
}
