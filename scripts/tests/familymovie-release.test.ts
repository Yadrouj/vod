import test from 'node:test';
import assert from 'node:assert/strict';
import type { VodItem } from '../../lib/types';
import { refreshFamilyMovieRelease, cachedFamilyMovieCount } from '../../lib/familymovie-release';

const item = (id: string) => ({ id, imdbCode: id, title: 'Fixture', originalTitle: 'Fixture', type: 'tvSeries', year: 2026, links: [], sourcePageUrl: `https://familymovie.tr/?movie=${id}` }) as unknown as VodItem;
test('missing releases refresh from exact publisher identity, coalesce and cache', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ id: 'refresh-fixture', title: 'Fixture', type: 'series', year: 2026, downloads: [
      { url: 'https://cdn.example.com/Fixture.S01E01.720p.mp4', quality: '720p', season: '1', episode: '1' },
      { url: 'https://cdn.example.com/Fixture.trailer.mp4' },
      { url: 'https://cdn.example.com/Fixture.S01E02.mp4', dead: true },
    ] });
  };
  try {
    const results = await Promise.all([refreshFamilyMovieRelease(item('refresh-fixture')), refreshFamilyMovieRelease(item('refresh-fixture'))]);
    assert.equal(calls, 1);
    assert.equal(results[0].links.length, 1);
    assert.equal(results[0].links[0].episode, 1);
    assert.equal(cachedFamilyMovieCount(item('refresh-fixture')), 1);
  } finally { globalThis.fetch = original; }
});
test('provider mismatches and failures never attach unrelated media', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ id: 'another-title', title: 'Another title', downloads: [] });
  try {
    const source = item('identity-fixture');
    assert.equal(await refreshFamilyMovieRelease(source), source);
    assert.equal(cachedFamilyMovieCount(source), undefined);
  } finally { globalThis.fetch = original; }
});
