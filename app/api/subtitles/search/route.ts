import { findSubzoneEnglishSubtitles, subzoneSearchUrl } from "@/lib/subtitles";
import { checkRateLimit, clientIp, publicCacheHeaders, rateLimitedResponse, rateLimitHeaders } from "@/lib/runtime-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? searchParams.get("query") ?? "").trim();
  const limit = Math.min(80, Math.max(1, Number(searchParams.get("limit") ?? 40) || 40));

  if (query.length < 2) {
    return Response.json({ query, searchUrl: subzoneSearchUrl(query), items: [] });
  }

  const rate = checkRateLimit(`subtitle-search:${clientIp(request)}`, 20, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate);

  try {
    const items = await findSubzoneEnglishSubtitles(query, limit);
    return Response.json(
      { query, searchUrl: subzoneSearchUrl(query), language: "english", count: items.length, items },
      { headers: { ...publicCacheHeaders({ browserSeconds: 60, edgeSeconds: 3600 }), ...rateLimitHeaders(rate) } },
    );
  } catch (error) {
    return Response.json({ query, searchUrl: subzoneSearchUrl(query), error: error instanceof Error ? error.message : "Subzone scrape failed", items: [] }, { status: 502 });
  }
}
