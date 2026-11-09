import type { MetadataRoute } from "next";
import { loadMusicIndex } from "@/lib/music";
import { SITE_URL } from "@/lib/seo";
import { loadVodIndex } from "@/lib/vod-index";
import { loadMoodPlaylists } from '@/lib/mood-playlists';
import { loadCreatorProfiles } from '@/lib/creator-profiles';

// Stay below Google's 50,000-URL / 50MB sitemap limit while leaving room for
// route growth. robots.txt advertises every generated part.
export const SITEMAP_LIMIT = 20_000;

type SitemapEntry = MetadataRoute.Sitemap[number];
let snapshot: { entries: SitemapEntry[]; expiresAt: number } | undefined;
let pending: Promise<SitemapEntry[]> | undefined;

async function cachedEntries(): Promise<SitemapEntry[]> {
  if (snapshot && snapshot.expiresAt > Date.now()) return snapshot.entries;
  if (!pending) pending = allEntries().then(entries => {
    snapshot = { entries, expiresAt: Date.now() + 60_000 };
    return entries;
  }).finally(() => { pending = undefined; });
  return pending;
}

export async function sitemapEntriesForPart(index: number): Promise<MetadataRoute.Sitemap> {
  if (!Number.isSafeInteger(index) || index < 0) return [];
  const entries = await cachedEntries();
  return entries.slice(index * SITEMAP_LIMIT, (index + 1) * SITEMAP_LIMIT);
}

export async function sitemapPartCount() {
  const count = (await cachedEntries()).length;
  return Math.max(1, Math.ceil(count / SITEMAP_LIMIT));
}

async function allEntries(): Promise<SitemapEntry[]> {
  const [vod, music, playlists, creators] = await Promise.all([loadVodIndex(), loadMusicIndex(), loadMoodPlaylists(), loadCreatorProfiles()]);
  const vodUpdatedAt = validDate(vod.generatedAt);
  const musicUpdatedAt = validDate(music.updatedAt);
  const entries: SitemapEntry[] = [
    entry("/", vodUpdatedAt, 1, "daily"),
    entry("/browse", vodUpdatedAt, 0.9, "daily"),
    entry("/kids", vodUpdatedAt, 0.8, "weekly"),
    entry("/kids/learn", vodUpdatedAt, 0.75, "weekly"),
    entry("/music", musicUpdatedAt, 0.95, "daily"),
    entry("/music/artists", musicUpdatedAt, 0.85, "weekly"),
    entry("/music/playlists", musicUpdatedAt, 0.75, "daily"),
    entry("/updates", vodUpdatedAt, 0.8, "daily"),
    entry("/music/collections", musicUpdatedAt, 0.75, "weekly"),
    entry("/people", vodUpdatedAt, 0.65, "weekly"),
    entry('/people/directors', validDate(creators.researchedAt), 0.8, 'monthly'),
    entry('/music/artists/top-100', validDate(creators.researchedAt), 0.8, 'monthly'),
  ];

  for (const item of vod.items) {
    if (item.linksCount <= 0 && !item.posterUrl && !item.overview) continue;
    const id = item.imdbCode || item.id;
    if (!id || id === 'undefined' || id === 'null') continue;
    entries.push({
      url: `${SITE_URL}/${encodeURIComponent(id)}`,
      lastModified: validDate(item.catalogUpdatedAt || item.sourceUpdatedAt) ?? vodUpdatedAt,
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
  // Magazine URLs are published once, in /mag/sitemap.xml linked by the index.
  for (const playlist of playlists.playlists) entries.push(entry(`/music/collections/${encodeURIComponent(playlist.id)}`, validDate(playlist.updatedAt), 0.65, 'weekly'));
  for (const profile of creators.directors) entries.push({...entry(`/person/${profile.id}`, validDate(profile.researchedAt),0.7,'monthly'),images:profile.imageUrl?[profile.imageUrl]:undefined});
  for (const profile of creators.singers) entries.push({...entry(`/music/artists/${encodeURIComponent(profile.slug)}`, validDate(profile.researchedAt),0.7,'monthly'),images:profile.imageUrl?[profile.imageUrl]:undefined});
  return [...new Map(entries.map((item) => [item.url, item])).values()];
}

function entry(pathname: string, lastModified: Date | undefined, priority: number, changeFrequency: SitemapEntry["changeFrequency"]): SitemapEntry {
  return { url: `${SITE_URL}${pathname}`, lastModified, priority, changeFrequency };
}

function validDate(value: string | null | undefined) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.valueOf()) && date.valueOf() <= Date.now() ? date : undefined;
}
