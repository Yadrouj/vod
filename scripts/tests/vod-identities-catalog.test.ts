import assert from 'node:assert/strict';
import test from 'node:test';
import { findVodItem } from '../../lib/catalog';
import { browseVodIndex, loadVodIndex, loadVodHomeIndex } from '../../lib/vod-index';
import { loadVodIdentities } from '../../lib/vod-identities';

test('real East of Eden legacy page resolves to the complete canonical series, not the 1955 movie', async t => {
  // Identity tests must not depend on a publisher's token refresh availability.
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Network disabled for identity test'); });
  const canonical = await findVodItem('f2my-east-of-eden');
  const alias = await findVodItem('familymovie-0c050ee1689bd331');
  assert.ok(canonical && alias);
  assert.equal(alias.imdbCode, 'f2my-east-of-eden');
  assert.equal(alias.year, 2026);
  assert.equal(alias.persianTitle, 'شرق بهشت');
  assert.deepEqual(new Set(alias.links.map(link => link.url)), new Set(canonical.links.map(link => link.url)));
  assert.ok(alias.links.length >= 70, 'all non-expired F2MY qualities/encodes remain');
  assert.deepEqual([...new Set(alias.links.map(link => link.episode))].sort(), [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(alias.groups.includes('HardSub'));
  assert.ok(alias.groups.includes('Dubbed'));
  assert.ok(alias.persianOverview?.includes('تراسک'));
  const film = await findVodItem('tt0048028');
  assert.equal(film?.year, 1955);
  assert.equal(film?.imdbCode, 'tt0048028');
  t.mock.restoreAll();
});

test('search and home expose one canonical card per work; sitemap inherits the same canonical index', async () => {
  const registry = await loadVodIdentities();
  assert.equal(registry.canonicalId('familymovie-0c050ee1689bd331'), 'f2my-east-of-eden');
  for (const index of await Promise.all([loadVodIndex(), loadVodHomeIndex()])) {
    assert.equal(new Set(index.items.map(item => item.imdbCode)).size, index.items.length);
    assert.ok(!index.items.some(item => item.imdbCode === 'familymovie-0c050ee1689bd331'));
  }
  const index = await loadVodIndex();
  const results = browseVodIndex(index, { q: 'East of Eden' }, 200).items;
  assert.equal(results.filter(item => item.year === 2026 && item.type === 'series').length, 1);
  assert.ok(results.some(item => item.imdbCode === 'tt0048028'));
});
