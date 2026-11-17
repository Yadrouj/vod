import { findSubzoneSubtitles, subtitleTrackUrl, subzoneSearchUrl } from "@/lib/subtitles";
import { checkRateLimit, clientIp, publicCacheHeaders, rateLimitedResponse, rateLimitHeaders } from "@/lib/runtime-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? searchParams.get("query") ?? "").trim();
  const limit = Math.min(80, Math.max(1, Number(searchParams.get("limit") ?? 40) || 40));
  const year = Number(searchParams.get('year')) || null;
  const type = ['movie', 'series'].includes(searchParams.get('type') || '') ? searchParams.get('type')! : undefined;
  const context = { year, type };

  if (query.length < 2) {
    return Response.json({ query, searchUrl: subzoneSearchUrl(query), items: [] });
  }

  const rate = checkRateLimit(`subtitle-search:${clientIp(request)}`, 20, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate);

  try {
    const items = (await findSubzoneSubtitles(query, limit, ['Farsi/Persian', 'English'], context)).map((item) => ({ ...item, trackUrl: subtitleTrackUrl(item.downloadUrl, { language: item.language }) }));
    return Response.json(
      { query, searchUrl: subzoneSearchUrl(query), languages: ["Farsi/Persian", "English"], count: items.length, items },
      { headers: { ...publicCacheHeaders({ browserSeconds: 60, edgeSeconds: 3600 }), ...rateLimitHeaders(rate) } },
    );
  } catch (error) {
    return Response.json({ query, searchUrl: subzoneSearchUrl(query), error: error instanceof Error ? error.message : "Subzone scrape failed", items: [] }, { status: 502 });
  }
}
