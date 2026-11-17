import previous from './data/media-refresh-2026-11-14-vod.json';
import latest from './data/media-refresh-2026-11-17-vod.json';
import { applyVideoReleaseIndex, mergeVideoRelease, type VideoReleaseBundle } from './bundled-video-release';
import type { VodCatalogIndex, VodItem } from './types';

const releases = [previous, latest] as unknown as VideoReleaseBundle[];

/** Keep earlier checked additions when publishing another incremental batch. */
export function mergeCurrentVideoRelease(item: VodItem | null, id: string): VodItem | null {
  return releases.reduce((current, release) => mergeVideoRelease(current, id, release), item);
}

export function applyCurrentVideoReleaseIndex(index: VodCatalogIndex, includeNew = true): VodCatalogIndex {
  return releases.reduce((current, release) => applyVideoReleaseIndex(current, release, includeNew), index);
}
