import path from 'node:path';
import { readFileSnapshot, type FileSnapshot } from './file-snapshot';
import { matchingArtistSlugs, identityKey, findRecordingMatch } from './creator-identities.mjs';
import { diversifyMusicTracks } from './music';
import type { CreatorProfiles, SingerProfile } from './creator-profile-types';
import type { MusicArtist, MusicArtistIndex, MusicTrack } from './music-types';

const file = path.resolve(process.env.VOD_DATA_DIR || path.join(process.cwd(), 'public/data'), 'creator-profiles.json');
const snapshot: FileSnapshot<CreatorProfiles> = {};
const empty: CreatorProfiles = { version: 1, researchedAt: '', peopleUpdatedAt: '', musicUpdatedAt: '', selection: '', directors: [], singers: [] };
export function loadCreatorProfiles(): Promise<CreatorProfiles> { return readFileSnapshot(file, snapshot).catch(() => empty); }

export function findSingerProfile(data: CreatorProfiles, slug: string) {
  const key = identityKey(slug);
  return data.singers.find(profile => [profile.slug, ...profile.artistSlugs, ...profile.aliases].some(name => identityKey(name) === key)) || null;
}

const trackMaps = new WeakMap<MusicArtistIndex, Map<string, MusicTrack>>();
export function tracksForSinger(index: MusicArtistIndex, profile: SingerProfile): MusicTrack[] {
  const slugs = matchingArtistSlugs(index.artists, profile);
  const ids = new Set<string>(slugs.flatMap((slug: string) => index.artistTrackIds?.[slug] || index.artists.find(artist => artist.slug === slug)?.trackIds || []));
  let map = trackMaps.get(index);
  if (!map) { map = new Map(index.tracks.map(track => [track.id, track])); trackMaps.set(index, map); }
  return diversifyMusicTracks([...ids].map(id => map!.get(id)).filter((track): track is MusicTrack => Boolean(track)));
}

export function singerAsArtist(profile: SingerProfile, tracks: MusicTrack[]): MusicArtist {
  return { slug: profile.slug, name: profile.nameFa, sourceUrl: profile.sources[0]?.url || profile.imageSourceUrl,
    aliases: [profile.name, profile.nameFa, ...profile.artistSlugs, ...profile.aliases], coverUrl: profile.imageUrl, profileImageUrl: profile.imageUrl,
    bio: profile.focusFa, profileSourceUrl: profile.imageSourceUrl, trackIds: tracks.map(track => track.id),
    categories: [...new Set(tracks.flatMap(track => [track.category, ...(track.moods || [])]).filter(Boolean))] };
}

/** Availability follows the current archive, not the last metadata import. */
export function singerRecordings(profile: SingerProfile, tracks: MusicTrack[]) {
  return profile.recordings.map(recording => ({ ...recording,
    archiveTrackId: findRecordingMatch(recording, tracks, [profile.name, profile.nameFa, ...profile.aliases])?.id || null }));
}
