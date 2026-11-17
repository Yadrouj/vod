import previous from './data/media-refresh-2026-11-14-music.json';
import latest from './data/media-refresh-2026-11-17-music.json';
import { applyMusicReleaseBundle, type MusicReleaseBundle } from './bundled-music-release';
import type { MusicIndex } from './music-types';

const releases = [previous, latest] as unknown as MusicReleaseBundle[];

/** Use the same checked releases on full, home, landing and artist indexes. */
export function applyCurrentMusicReleases<T extends MusicIndex>(index: T): T {
  return releases.reduce((current, release) => applyMusicReleaseBundle(current, release), index);
}
