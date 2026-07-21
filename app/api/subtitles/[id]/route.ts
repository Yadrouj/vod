import { findVodItem } from "@/lib/catalog";
import { checkRateLimit, clientIp, publicCacheHeaders, rateLimitedResponse, rateLimitHeaders } from "@/lib/runtime-cache";
import { findSubzoneSubtitles, subtitleTrackUrl, subzoneSearchUrl } from "@/lib/subtitles";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: Props) {
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) return Response.json({ error: "Title not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(80, Math.max(1, Number(searchParams.get("limit") ?? 40) || 40));
  const query = (searchParams.get("q") ?? item.originalTitle ?? item.title).trim();
  const rate = checkRateLimit(`subtitle-title:${clientIp(request)}`, 30, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate);

  try {
    const items = (await findSubzoneSubtitles(query, limit)).map((item) => ({ ...item, trackUrl: subtitleTrackUrl(item.downloadUrl) }));
    return Response.json({
      id,
      title: item.title,
      query,
      searchUrl: subzoneSearchUrl(query),
      languages: ["Farsi/Persian", "English"],
      count: items.length,
      items,
    }, { headers: { ...publicCacheHeaders({ browserSeconds: 60, edgeSeconds: 3600 }), ...rateLimitHeaders(rate) } });
  } catch (error) {
    return Response.json({
      id,
      title: item.title,
      query,
      searchUrl: subzoneSearchUrl(query),
      error: error instanceof Error ? error.message : "Subzone scrape failed",
      items: [],
    }, { status: 502 });
  }
}
