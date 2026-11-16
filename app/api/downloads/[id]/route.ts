import { findVodItem, normalizeVodType } from "@/lib/catalog";
import { buildSeasonSummaries, expandSeasonDownloads, movieDownloadSources } from "@/lib/downloads";
import { checkRateLimit, clientIp, rateLimitedResponse, rateLimitHeaders, TtlLruCache } from "@/lib/runtime-cache";
import { downloadResponseHeaders, downloadResponseLifetime } from '@/lib/download-cache';

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";
const downloadResponseCache = new TtlLruCache<string, { payload: object; signed: boolean; expiresAt: number }>(300, 15 * 60_000);

export async function GET(request: Request, { params }: Props) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const requestedSeason = Number(searchParams.get("season") ?? 0);
  const cacheKey = `${id.toLowerCase()}:${requestedSeason}`;
  const rate = checkRateLimit(`downloads:${clientIp(request)}`, 60, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate);

  const cached = downloadResponseCache.get(cacheKey);
  if (cached) {
    return Response.json(cached.payload, {
      headers: {
        ...downloadResponseHeaders(cached),
        ...rateLimitHeaders(rate),
        "X-SarvNema-Cache": "HIT",
      },
    });
  }

  const item = await findVodItem(id);
  if (!item) return Response.json({ error: "Title not found" }, { status: 404 });
  const policy = downloadResponseLifetime(item.links);
  const remember = (payload: object) => downloadResponseCache.set(cacheKey, { payload, signed: policy.signed, expiresAt: Date.now() + policy.ttlMs }, policy.ttlMs);

  const season = requestedSeason;
  const seasons = buildSeasonSummaries(item.links);
  const isSeries = normalizeVodType(item.type) === "series" && seasons.length > 0;

  if (!isSeries) {
    const payload = {
      type: "movie",
      files: movieDownloadSources(item.links),
    };
    const entry = remember(payload);
    return Response.json(payload, {
      headers: {
        ...downloadResponseHeaders(entry),
        ...rateLimitHeaders(rate),
        "X-SarvNema-Cache": "MISS",
      },
    });
  }

  const selectedSeason = seasons.some((summary) => summary.season === season) ? season : seasons[0].season;
  const downloads = await expandSeasonDownloads(item, selectedSeason);
  const payload = {
    type: "series",
    seasons,
    ...downloads,
  };
  const entry = remember(payload);
  return Response.json(payload, {
    headers: {
      ...downloadResponseHeaders(entry),
      ...rateLimitHeaders(rate),
      "X-SarvNema-Cache": "MISS",
    },
  });
}
