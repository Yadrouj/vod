import type { MetadataRoute } from "next";
import { loadMusicIndex } from "@/lib/music";
import { SITE_URL } from "@/lib/seo";
import { loadVodIndex } from "@/lib/vod-index";

// Stay below Google's 50,000-URL / 50MB sitemap limit while leaving room for
// route growth. robots.txt advertises every generated part.
export const SITEMAP_LIMIT = 45_000;

type SitemapEntry = MetadataRoute.Sitemap[number];

export async function generateSitemaps() {
  const count = await sitemapPartCount();
  return Array.from({ length: count }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const entries = await allEntries();
  const index = Math.max(0, Number(await id) || 0);
  return entries.slice(index * SITEMAP_LIMIT, (index + 1) * SITEMAP_LIMIT);
}

export async function sitemapPartCount() {
  const [vod, music] = await Promise.all([loadVodIndex(), loadMusicIndex()]);
  const staticCount = 8;
  const vodCount = vod.items.filter((item) => item.linksCount > 0 || Boolean(item.posterUrl) || Boolean(item.overview)).length;
  const trackCount = music.tracks.filter((track) => track.sources.some((source) => source.available !== false)).length;
  const artistCount = music.artists.filter((artist) => artist.trackIds.length > 0).length;
  const count = staticCount + vodCount + trackCount + artistCount + 7;
  return Math.max(1, Math.ceil(count / SITEMAP_LIMIT));
}

async function allEntries(): Promise<SitemapEntry[]> {
  const [vod, music] = await Promise.all([loadVodIndex(), loadMusicIndex()]);
  const vodUpdatedAt = validDate(vod.generatedAt);
  const musicUpdatedAt = validDate(music.updatedAt);
  const entries: SitemapEntry[] = [
    entry("/", vodUpdatedAt, 1, "daily"),
    entry("/browse", vodUpdatedAt, 0.9, "daily"),
    entry("/music", musicUpdatedAt, 0.95, "daily"),
    entry("/music/artists", musicUpdatedAt, 0.85, "weekly"),
    entry("/music/playlists", musicUpdatedAt, 0.75, "daily"),
    entry("/updates", vodUpdatedAt, 0.8, "daily"),
    entry("/mag", vodUpdatedAt, 0.8, "weekly"),
    entry("/people", vodUpdatedAt, 0.65, "weekly"),
  ];

  for (const item of vod.items) {
    if (item.linksCount <= 0 && !item.posterUrl && !item.overview) continue;
    entries.push({
      url: `${SITE_URL}/${encodeURIComponent(item.imdbCode)}`,
      lastModified: vodUpdatedAt,
      changeFrequency: "weekly",
      priority: item.linksCount > 0 ? 0.75 : 0.45,
      images: item.posterUrl ? [item.posterUrl] : undefined,
    });
  }
  for (const track of music.tracks) {
    if (!track.sources.some((source) => source.available !== false)) continue;
    entries.push({
      url: `${SITE_URL}/music/${encodeURIComponent(track.id)}`,
      lastModified: validDate(track.publishedAt) || musicUpdatedAt,
      changeFrequency: "monthly",
      priority: track.coverUrl ? 0.65 : 0.45,
      images: track.coverUrl ? [track.coverUrl] : undefined,
    });
  }
  for (const artist of music.artists) {
    if (!artist.trackIds.length) continue;
    entries.push({
      url: `${SITE_URL}/music/artists/${encodeURIComponent(artist.slug)}`,
      lastModified: musicUpdatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
      images: artist.profileImageUrl || artist.coverUrl ? [artist.profileImageUrl || artist.coverUrl!] : undefined,
    });
  }
  for (const slug of ["daily-cinema-updates", "best-sad-movies", "best-mini-series", "persian-movies-guide", "best-ebi-music", "watch-together-guide", "listen-together-guide"]) {
    entries.push(entry(`/mag/${slug}`, slug === "daily-cinema-updates" ? vodUpdatedAt : musicUpdatedAt, 0.65, slug === "daily-cinema-updates" ? "daily" : "monthly"));
  }
  return [...new Map(entries.map((item) => [item.url, item])).values()];
}

function entry(pathname: string, lastModified: Date, priority: number, changeFrequency: SitemapEntry["changeFrequency"]): SitemapEntry {
  return { url: `${SITE_URL}${pathname}`, lastModified, priority, changeFrequency };
}

function validDate(value: string | null | undefined) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.valueOf()) ? date : new Date();
}
