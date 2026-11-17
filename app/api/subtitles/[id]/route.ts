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
  // A title endpoint cannot be turned into a search for some other movie.
  const query = (item.originalTitle || item.title).trim();
  const positive = (key: string) => { const raw = searchParams.get(key); return raw === null ? null : /^\d{1,3}$/.test(raw) && Number(raw) > 0 ? Number(raw) : NaN; };
  const season = positive('season'), episode = positive('episode');
  if (Number.isNaN(season) || Number.isNaN(episode) || episode && !season) return Response.json({ error: 'Invalid season or episode.' }, { status: 400 });
  const context = { year: item.year, type: item.type, imdbCode: /^tt\d+$/.test(item.imdbCode) ? item.imdbCode : undefined,
    aliases: (item.akas || []).map(alias => alias.text).filter(Boolean).slice(0, 40), season, episode };
  const rate = checkRateLimit(`subtitle-title:${clientIp(request)}`, 30, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate);

  try {
    const items = (await findSubzoneSubtitles(query, limit, ['Farsi/Persian', 'English'], context)).map((item) => ({ ...item, trackUrl: subtitleTrackUrl(item.downloadUrl, { ...context, language: item.language }) }));
    return Response.json({
      id,
      title: item.title,
      query,
      season, episode,
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
