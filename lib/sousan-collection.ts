import bundle from './data/sousan-collection.json';
import type { MusicIndex, MusicTrack } from './music-types';
import type { MoodPlaylist } from './mood-playlists';
export const sousanTracks = bundle.tracks as unknown as MusicTrack[];
export const sousanCollection = bundle.collection as MoodPlaylist;
const remix = sousanTracks.find(track => track.id === 'editorial-sousan-ba-to-che-shabha-remix')!;
export const sousanLibrary: MusicIndex = {
  version: 1, source: 'multi-source', updatedAt: bundle.checkedAt, scanned: { musicPages: 1, videoPages: 0, full: false },
  tracks: [remix], artists: [{ ...remix.artist, coverUrl: remix.coverUrl, trackIds: [remix.id], categories: [remix.category] }], categories: [remix.category],
};
