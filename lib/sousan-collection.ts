import bundle from './data/sousan-collection.json';
import type { MusicIndex, MusicTrack } from './music-types';
import type { MoodPlaylist } from './mood-playlists';
export const sousanTracks = bundle.tracks as unknown as MusicTrack[];
export const sousanCollection = bundle.collection as MoodPlaylist;
const remixes = sousanTracks.filter(track => track.id.startsWith('editorial-sousan-'));
export const sousanLibrary: MusicIndex = {
  version: 1, source: 'multi-source', updatedAt: bundle.checkedAt, scanned: { musicPages: remixes.length, videoPages: 0, full: false },
  tracks: remixes, artists: remixes.length ? [{ ...remixes[0].artist, coverUrl: remixes[0].coverUrl, trackIds: remixes.map(track => track.id), categories: [...new Set(remixes.map(track => track.category))] }] : [], categories: [...new Set(remixes.map(track => track.category))],
};
