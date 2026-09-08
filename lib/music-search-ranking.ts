import type { MusicArtist, MusicTrack } from "./music-types";
export const musicSearchTextKey = (value: string) => value.toLocaleLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\u200c\s_-]+/g, " ").trim();
export function matchingMusicArtists(artists: MusicArtist[], query: string) {
  const key = musicSearchTextKey(query);
  if (!key) return [];
  return artists.filter(artist => [artist.name, artist.slug, ...(artist.aliases ?? [])].some(value => musicSearchTextKey(value).includes(key)))
    .sort((a, b) => Number(musicSearchTextKey(b.name) === key) - Number(musicSearchTextKey(a.name) === key)
      || (b.trackCount ?? b.trackIds.length) - (a.trackCount ?? a.trackIds.length)
      || (b.playCount ?? 0) - (a.playCount ?? 0) || a.name.localeCompare(b.name, "fa"));
}
export function compareMusicPopularityYear(a: MusicTrack, b: MusicTrack) {
  return (b.playCount ?? 0) - (a.playCount ?? 0)
    || (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0);
}
