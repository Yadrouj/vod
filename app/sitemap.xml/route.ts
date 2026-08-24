import { loadMusicIndex } from "@/lib/music";
import { loadVodIndex } from "@/lib/vod-index";
import { SITE_URL } from "@/lib/seo";

const SITEMAP_LIMIT = 45_000;

export async function GET() {
  const [vod, music] = await Promise.all([loadVodIndex(), loadMusicIndex()]);
  const eligibleVod = new Set(vod.items.filter((item) => item.linksCount > 0 || item.posterUrl || item.overview).map((item) => item.imdbCode)).size;
  const playableMusic = new Set(music.tracks.filter((track) => track.sources.some((source) => source.available !== false)).map((track) => track.id)).size;
  const artists = new Set(music.artists.filter((artist) => artist.trackIds.length > 0).map((artist) => artist.slug)).size;
  const total = 13 + eligibleVod + playableMusic + artists;
  const pages = Math.max(1, Math.ceil(total / SITEMAP_LIMIT));
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Array.from({ length: pages }, (_, id) => `<sitemap><loc>${SITE_URL}/sitemap/${id}.xml</loc></sitemap>`).join("")}</sitemapindex>`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" } });
}
