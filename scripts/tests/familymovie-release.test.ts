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

test('a reviewed alternative publisher page can refresh even when the original source is DonyayeSerial', async () => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ id: 'alternative-fixture', title: 'Fixture', type: 'series', year: 2026,
      downloads: [{ url: 'https://cdn.example.com/Fixture.S01E01.1080p.mp4', season: '1', episode: '1' }] });
  };
  try {
    const source = { ...item('alternative-fixture'), sourcePageUrl: 'https://donyayeserial.com/fixture/',
      curatedSourcePages: ['https://familymovie.tr/?movie=alternative-fixture'],
      links: [{ url: 'https://old.example.com/Fixture.S01E01.mkv', group: 'SoftSub', label: 'Old', quality: '720p', release: null, size: null, sourceProvider: 'donyaye' }] };
    const refreshed = await refreshFamilyMovieRelease(source);
    assert.equal(calls, 1); assert.equal(refreshed.links.length, 2);
    assert.equal(refreshed.links[0].sourceProvider, 'familymovie');
    assert.equal(refreshed.links[1].url, source.links[0].url);
  } finally { globalThis.fetch = original; }
});

test('runtime refresh accepts a public four-hour signature instead of silently rejecting all files', async () => {
  const original = globalThis.fetch;
  const expires = Math.floor(Date.now() / 1000) + 4 * 3600;
  const url = `https://cdn.example.com/Fixture.S01E01.720p.mp4?md5=fresh&expires=${expires}`;
  globalThis.fetch = async () => Response.json({ id: 'short-signature-fixture', title: 'Fixture', type: 'series', year: 2026, downloads: [{ url }] });
  try {
    const result = await refreshFamilyMovieRelease(item('short-signature-fixture'));
    assert.equal(result.links.length, 1);
    assert.equal(result.links[0].url, url);
  } finally { globalThis.fetch = original; }
});

test('one healthy signature cannot prevent the other expired episodes from refreshing', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  const expiry = Math.floor(Date.now() / 1000) + 8 * 3600;
  const links = [1, 2].map(episode => ({ url: `https://cdn.example.com/Fixture.S01E0${episode}.720p.mp4?expires=${episode === 1 ? expiry : 1}`, sourceProvider: 'familymovie', quality: '720p', group: 'Dubbed', label: '', release: null, size: null }));
  globalThis.fetch = async () => { calls++; return Response.json({ id: 'mixed-signature-fixture', title: 'Fixture', type: 'series', year: 2026,
    downloads: links.map(link => ({ url: link.url.replace(/expires=\d+/, `expires=${expiry}`) })) }); };
  try {
    // Simulate catalogue normalization already removing expired episode two.
    const result = await refreshFamilyMovieRelease({ ...item('mixed-signature-fixture'), links: links.slice(0, 1) });
    assert.equal(calls, 1); assert.equal(result.links.length, 2);
    assert.ok(result.links.every(link => Number(new URL(link.url).searchParams.get('expires')) > Date.now() / 1000));
  } finally { globalThis.fetch = original; }
});

test('publisher failures do not resurrect expired links or remove working alternative providers', async () => {
  const original = globalThis.fetch;
  const expired = { url: 'https://cdn.example.com/Fixture.S01E01.mp4?expires=1', sourceProvider: 'familymovie', label: '', group: 'Dubbed', quality: '720p', release: null, size: null };
  const other = { ...expired, url: 'https://other.example.com/Fixture.S01E01.mp4', sourceProvider: 'moviesho' };
  globalThis.fetch = async () => { throw Error('offline'); };
  try {
    const source = { ...item('offline-signature-fixture'), links: [expired, other] };
    for (let i = 0; i < 2; i++) assert.deepEqual((await refreshFamilyMovieRelease(source)).links, [other]);
  } finally { globalThis.fetch = original; }
});

test('a cached short-lived token is refreshed before it expires, not after the five-minute cache TTL', async () => {
  const original = globalThis.fetch, originalNow = Date.now;
  let time = originalNow(), calls = 0;
  Date.now = () => time;
  globalThis.fetch = async () => { calls++; return Response.json({ id: 'cache-signature-fixture', title: 'Fixture', type: 'series', year: 2026,
    downloads: [{ url: `https://cdn.example.com/Fixture.S01E01.mp4?md5=${calls}&expires=${Math.floor(time / 1000) + 180}` }] }); };
  try {
    await refreshFamilyMovieRelease(item('cache-signature-fixture'));
    time += 125_000;
    const result = await refreshFamilyMovieRelease(item('cache-signature-fixture'));
    assert.equal(calls, 2);
    assert.equal(new URL(result.links[0].url).searchParams.get('md5'), '2');
  } finally { globalThis.fetch = original; Date.now = originalNow; }
});
