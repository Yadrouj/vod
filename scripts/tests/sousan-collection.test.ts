import test from 'node:test';
import assert from 'node:assert/strict';
import { sousanCollection, sousanLibrary, sousanTracks } from '../../lib/sousan-collection';
test('collection contains unique existing tracks and attributed verified remix', () => {
  assert.equal(new Set(sousanCollection.trackIds).size, sousanCollection.trackIds.length);
  assert.equal(sousanCollection.trackIds.length, sousanTracks.length);
  assert.ok(sousanTracks.length > 30);
  const remix = sousanLibrary.tracks[0];
  assert.equal(remix.artist.name, 'سوسن');
  assert.equal(remix.sources[0].provider, 'avajavan');
  assert.ok(remix.sourceUrl.startsWith('https://avajavan.com/'));
  assert.equal(remix.publishedAt, null, 'do not invent a new publication date for an older remix');
});
