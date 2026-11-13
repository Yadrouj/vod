import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseKind, releaseKindLabels, sortedQualities } from '../../lib/release-options';
test('version types have user-facing Persian names', () => {
  assert.equal(releaseKindLabels[releaseKind('Dubbed')][0], 'دوبله فارسی');
  assert.equal(releaseKindLabels[releaseKind('SoftSub')][0], 'زیرنویس قابل تغییر');
  assert.equal(releaseKindLabels[releaseKind('HardSub')][0], 'زیرنویس چسبیده');
  assert.equal(releaseKind('Files'), 'other');
});
test('quality order is numeric descending, not alphabetical', () => {
  assert.deepEqual(sortedQualities(['480p', '1080p', '720p', '2160p', '720p', null]), ['2160p', '1080p', '720p', '480p']);
});
