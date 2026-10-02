import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMoodPlaylists } from '../build-mood-playlists.mjs';

test('every real tag gets a complete playlist including multi-tagged songs', () => {
  const source = (id, moods) => ({ id, kind: 'track', category: moods[0], moods, artist: { slug: id }, sources: [{ provider: 'melodify' }] });
  const tracks = [source('a', ['پاپ', 'Chill', 'Chill']), source('b', ['پاپ']), source('c', ['Rare tag'])];
  const result = buildMoodPlaylists([], new Date('2026-10-02T00:00:00Z'), tracks);
  const playlists = result.playlists.filter(p => p.scope === 'tags');
  assert.equal(playlists.length, 3);
  assert.deepEqual(playlists.find(p => p.title === 'پاپ').trackIds, ['a', 'b']);
  assert.deepEqual(playlists.find(p => p.title === 'Chill').trackIds, ['a']);
  assert.equal(playlists.find(p => p.title === 'Rare tag').selection, 'library-tags');
  assert.deepEqual(playlists.map(p => p.id), buildMoodPlaylists([], new Date('2026-10-03T00:00:00Z'), tracks).playlists.filter(p => p.scope === 'tags').map(p => p.id));
});
