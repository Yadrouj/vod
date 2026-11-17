import assert from 'node:assert/strict';
import test from 'node:test';
import previousVideo from '../../lib/data/media-refresh-2026-11-14-vod.json';
import latestVideo from '../../lib/data/media-refresh-2026-11-17-vod.json';
import previousMusic from '../../lib/data/media-refresh-2026-11-14-music.json';
import latestMusic from '../../lib/data/media-refresh-2026-11-17-music.json';
import { applyCurrentVideoReleaseIndex, mergeCurrentVideoRelease } from '../../lib/current-video-release';
import { applyCurrentMusicReleases } from '../../lib/current-music-release';
import type { VodCatalogIndex } from '../../lib/types';
import type { MusicIndex } from '../../lib/music-types';
import { sourceLinkExpiry } from '../../lib/alternative-source-links.mjs';

test('the incremental video release preserves previous additions and exposes the new exact IDs', t => {
  // Real publisher signatures expire; test the reviewed snapshot at its capture
  // time rather than turning a healthy future CI run into a network-age test.
  t.mock.method(Date, 'now', () => Date.parse(latestVideo.observedAt));
  const oldOnly = previousVideo.items.find(item => item.links.some(link => sourceLinkExpiry(link) > Date.now())
    && !latestVideo.items.some(fresh => fresh.imdbCode === item.imdbCode));
  assert.ok(oldOnly);
  const restored = mergeCurrentVideoRelease(null, oldOnly.imdbCode);
  assert.equal(restored?.imdbCode, oldOnly.imdbCode);
  assert.ok(restored!.links.length > 0);
  for (const id of latestVideo.newTitleIds) {
    const item = mergeCurrentVideoRelease(null, id);
    assert.ok(item, id);
    assert.equal(item.imdbCode, id);
    assert.ok(item.links.length > 0, id);
    assert.ok(!previousVideo.newTitleIds.includes(id), 'already published additions are not announced as new');
  }
  assert.equal(mergeCurrentVideoRelease(null, 'tt33184638'), null, 'takedowns remain blocked');
});

test('current video index contains unique compact cards, and repeat overlay does not inflate counts', () => {
  const base = { items: [], sections: [], totalTitles: 0, generatedAt: '2026-11-13T00:00:00Z', updatedAt: '2026-11-13T00:00:00Z' } as unknown as VodCatalogIndex;
  const first = applyCurrentVideoReleaseIndex(base);
  const again = applyCurrentVideoReleaseIndex(first);
  assert.equal(new Set(first.items.map(item => item.imdbCode)).size, first.items.length);
  assert.equal(again.totalTitles, first.totalTitles);
  assert.equal(again.items.length, first.items.length);
  assert.ok(first.items.every(card => !('links' in card)), 'never leak the full source file lists into search/home');
  for (const id of latestVideo.newTitleIds) assert.ok(first.items.some(item => item.imdbCode === id));
});

test('new music remains checked and both release batches populate canonical artist profiles', () => {
  const base = { version: 1, tracks: [], artists: [], categories: [], updatedAt: '2026-11-13T00:00:00Z' } as unknown as MusicIndex;
  const first = applyCurrentMusicReleases(base);
  const again = applyCurrentMusicReleases(first);
  assert.equal(first.tracks.length, again.tracks.length);
  assert.equal(new Set(first.tracks.map(track => track.id)).size, first.tracks.length);
  for (const id of [...previousMusic.newTrackIds, ...latestMusic.newTrackIds]) {
    const track = first.tracks.find(track => track.id === id || track.idAliases?.includes(id));
    assert.ok(track, id);
    assert.ok(track.sources.some(source => source.available === true && source.checkedAt));
    for (const ref of track.artists) assert.ok(first.artists.find(artist => artist.slug === ref.slug)?.trackIds.includes(track.id));
  }
  assert.ok(latestMusic.newTrackIds.every(id => !previousMusic.newTrackIds.includes(id)));
});
