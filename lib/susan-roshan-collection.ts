import bundle from './data/tiarin-susan-roshan.json';
import type { MusicReleaseBundle } from './bundled-music-release';
import type { MoodPlaylist } from './mood-playlists';
import type { MusicTrack } from './music-types';

export const susanRoshanRelease = bundle as unknown as MusicReleaseBundle;
export const susanRoshanTracks = bundle.tracks as unknown as MusicTrack[];
export const susanRoshanCollections = bundle.collections as MoodPlaylist[];
