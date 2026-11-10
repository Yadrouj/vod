import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldWarmMedia, hasWarmBuffer } from '../../lib/media-warmup';

test('warm selected media on ordinary connections, honor data saver and background tabs', () => {
  assert.equal(shouldWarmMedia(), true);
  assert.equal(shouldWarmMedia({ effectiveType: '4g' }), true);
  assert.equal(shouldWarmMedia({ saveData: true }), false);
  assert.equal(shouldWarmMedia({ effectiveType: '2g' }), false);
  assert.equal(shouldWarmMedia(undefined, false), false);
});
test('warm buffer is measured around playback position, not another seek range', () => {
  const buffered = { length: 2, start: (i: number) => [0, 90][i], end: (i: number) => [15, 110][i] };
  assert.equal(hasWarmBuffer({ currentTime: 0, buffered }), true);
  assert.equal(hasWarmBuffer({ currentTime: 10, buffered }), false);
  assert.equal(hasWarmBuffer({ currentTime: 60, buffered }), false);
  assert.equal(hasWarmBuffer({ currentTime: 95, buffered }), true);
});
