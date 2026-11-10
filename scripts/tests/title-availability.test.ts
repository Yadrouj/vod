import test from 'node:test';
import assert from 'node:assert/strict';
import { isAwaitingTitleLinks } from '../../lib/title-availability';

test('coming soon is based on missing full-release links, not release year', () => {
  assert.equal(isAwaitingTitleLinks({ linksCount: 0 }), true);
  assert.equal(isAwaitingTitleLinks({ linksCount: 2 }), false);
  assert.equal(isAwaitingTitleLinks({ linksCount: 3, fullLengthLinksCount: 0 }), true);
  assert.equal(isAwaitingTitleLinks({ linksCount: 3, fullLengthLinksCount: 1 }), false);
  assert.equal(isAwaitingTitleLinks({ linksCount: 1, groups: ['Trailers'] }), true);
  assert.equal(isAwaitingTitleLinks({ linksCount: 1, id: 'zardfilm-post-111810' }), true);
  assert.equal(isAwaitingTitleLinks({ linksCount: 1, id: 'zardfilm-post-111810', fullLengthLinksCount: 1 }), false);
});
