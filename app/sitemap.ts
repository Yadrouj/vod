import type { MetadataRoute } from "next";
import { loadMusicIndex } from "@/lib/music";
import { loadVodIndex } from "@/lib/vod-index";
import { SITE_URL } from "@/lib/seo";

const SITEMAP_LIMIT = 45_000;

type SitemapEntry = MetadataRoute.Sitemap[number];

export async function generateSitemaps() {
  const entries = await allEntries();
  return Array.from({ length: Math.max(1, Math.ceil(entries.length / SITEMAP_LIMIT)) }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const entries = await allEntries();
  const index = Math.max(0, Number(await id) || 0);
  return entries.slice(index * SITEMAP_LIMIT, (index + 1) * SITEMAP_LIMIT);
}

async function allEntries(): Promise<SitemapEntry[]> {
  const [vod, music] = await Promise.all([loadVodIndex(), loadMusicIndex()]);
  const now = new Date();
  const entries: SitemapEntry[] = [
    entry("/", now, 1, "daily"),
    entry("/browse", now, 0.9, "daily"),
    entry("/music", music.updatedAt || now, 0.9, "daily"),
    entry("/music/artists", music.updatedAt || now, 0.8, "weekly"),
    entry("/updates", now, 0.7, "daily"),
    entry("/mag", now, 0.85, "daily"),
  ];

  for (const item of vod.items) {
    if (item.linksCount <= 0 && !item.posterUrl && !item.overview) continue;
    entries.push({
      url: `${SITE_URL}/${encodeURIComponent(item.imdbCode)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: item.linksCount > 0 ? 0.75 : 0.45,
      images: item.posterUrl ? [item.posterUrl] : undefined,
    });
  }
  for (const track of music.tracks) {
    if (!track.sources.some((source) => source.available !== false)) continue;
    entries.push({
      url: `${SITE_URL}/music/${encodeURIComponent(track.id)}`,
      lastModified: track.publishedAt || music.updatedAt || now,
      changeFrequency: "monthly",
      priority: track.coverUrl ? 0.65 : 0.45,
      images: track.coverUrl ? [track.coverUrl] : undefined,
    });
  }
  for (const artist of music.artists) {
    if (!artist.trackIds.length) continue;
    entries.push({
      url: `${SITE_URL}/music/artists/${encodeURIComponent(artist.slug)}`,
      lastModified: music.updatedAt || now,
      changeFrequency: "weekly",
      priority: 0.6,
      images: artist.profileImageUrl || artist.coverUrl ? [artist.profileImageUrl || artist.coverUrl!] : undefined,
    });
  }
  for (const slug of ["daily-cinema-updates", "best-sad-movies", "best-mini-series", "persian-movies-guide", "best-ebi-music", "watch-together-guide", "listen-together-guide"]) {
    entries.push(entry(`/mag/${slug}`, now, 0.65, slug === "daily-cinema-updates" ? "daily" : "monthly"));
  }
  return [...new Map(entries.map((item) => [item.url, item])).values()];
}

function entry(pathname: string, lastModified: Date | string, priority: number, changeFrequency: SitemapEntry["changeFrequency"]): SitemapEntry {
  return { url: `${SITE_URL}${pathname}`, lastModified, priority, changeFrequency };
}
