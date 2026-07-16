import {
  checkRateLimit,
  clientIp,
  publicCacheHeaders,
  rateLimitedResponse,
  rateLimitHeaders,
} from "@/lib/runtime-cache";
import { searchWithAi } from "@/lib/search-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const startedAt = performance.now();
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (query.length < 3) {
    return Response.json(
      { query, items: [] },
      { headers: publicCacheHeaders({ browserSeconds: 15, edgeSeconds: 60 }) },
    );
  }

  const rate = checkRateLimit(`ai-search:${clientIp(request)}`, 180, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate);

  const result = await searchWithAi(query, 10);
  return Response.json(
    { query, items: result.items },
    {
      headers: {
        ...publicCacheHeaders({ browserSeconds: 30, edgeSeconds: 900 }),
        ...rateLimitHeaders(rate),
        "Server-Timing": `ai-search;dur=${(performance.now() - startedAt).toFixed(1)}`,
        "X-SarvNema-Cache": result.cache,
      },
    },
  );
}
