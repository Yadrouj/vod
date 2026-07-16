import {
  checkRateLimit,
  clientIp,
  publicCacheHeaders,
  rateLimitedResponse,
  rateLimitHeaders,
} from "@/lib/runtime-cache";
import { searchSuggestions } from "@/lib/search-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const startedAt = performance.now();
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (query.length < 2) {
    return Response.json(
      { items: [] },
      { headers: publicCacheHeaders({ browserSeconds: 15, edgeSeconds: 60 }) },
    );
  }

  const rate = checkRateLimit(`suggest:${clientIp(request)}`, 120, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate);

  const result = await searchSuggestions(query, 8);
  return Response.json(
    { items: result.items },
    {
      headers: {
        ...publicCacheHeaders({ browserSeconds: 30, edgeSeconds: 600 }),
        ...rateLimitHeaders(rate),
        "Server-Timing": `search;dur=${(performance.now() - startedAt).toFixed(1)}`,
        "X-SarvNema-Cache": result.cache,
      },
    },
  );
}
