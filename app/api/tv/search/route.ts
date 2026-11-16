import { getLocale } from "@/lib/server-locale";
import { loadVodIndex, browseVodIndex } from "@/lib/vod-index";
import { loadSearchRankingSignals } from "@/lib/search-popularity";
import { tvCard } from "@/lib/tv-catalog";
import { tvSearchParams } from "@/lib/tv-navigation";
import { checkRateLimit, clientIp, rateLimitedResponse, publicCacheHeaders } from "@/lib/runtime-cache";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const rate = checkRateLimit(`tv-search:${clientIp(request)}`, 120, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate);
  const params = tvSearchParams(new URL(request.url).searchParams);
  const [index, signals, locale] = await Promise.all([loadVodIndex(), loadSearchRankingSignals(), getLocale()]);
  const result = browseVodIndex(index, params, 24, signals);
  return Response.json({ items: result.items.map(item => tvCard(item, locale)), total: result.total, page: result.page, totalPages: result.totalPages, corrections: result.corrections }, {
    headers: { ...publicCacheHeaders({ browserSeconds: 30, edgeSeconds: 0, staleSeconds: 0 }), Vary: "Accept-Encoding, Cookie", "Cache-Control": "private, max-age=30", "CDN-Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
