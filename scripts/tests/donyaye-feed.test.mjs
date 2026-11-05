import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchSeriesHtml, extractDetailUrls, parseDetail, seriesFeedCandidates } from '../scrape-donyaye-series-feed.mjs';

test('an explicitly configured old provider URL still gets its verified migration fallback', () => {
  assert.deepEqual(seriesFeedCandidates('https://donyayeserial.com/series/'),
    ['https://donyayeserial.com/series/', 'https://donyayeserial-new1.top/series/']);
  assert.deepEqual(seriesFeedCandidates('https://custom.example/series/'), ['https://custom.example/series/']);
});

test('series discovery uses the redirected origin and resolves relative links against it', () => {
  const html = '<a href="https://donyayeserial-new1.top/series/breaking-bad/">one</a><a href="/series/beef/?ref=x">two</a><a href="/series/page/2/">page</a><a href="https://evil.example/series/ad/">ad</a>';
  assert.deepEqual(extractDetailUrls(html, 'https://donyayeserial-new1.top/series/'), [
    'https://donyayeserial-new1.top/series/breaking-bad/', 'https://donyayeserial-new1.top/series/beef/',
  ]);
});

test('legitimate legacy series paths without an IMDb folder remain discoverable', () => {
  const item = parseDetail('<h1>24</h1><a href="https://imdb.com/title/tt0285331/">IMDb</a>'
    + '<a href="https://dls2.varzeshha3-uploader.top/DonyayeSerial/series/24/Dubbed/S03/24.S03E08.720p.mkv">episode</a>',
    'https://donyayeserial-new1.top/series/24/');
  assert.equal(item.links.length, 1); assert.equal(item.links[0].episode, 8);
});

test('feed follows the known new domain and rejects non-HTML, excessive bodies and unknown redirects', async () => {
  const result = await fetchSeriesHtml('https://donyayeserial.com/series/', { fetchImpl: async url =>
    url.startsWith('https://donyayeserial.com/') ? new Response(null, { status: 302, headers: { location: 'https://donyayeserial-new1.top/series/' } })
      : new Response('<html>series</html>', { headers: { 'content-type': 'text/html' } }) });
  assert.equal(result.url, 'https://donyayeserial-new1.top/series/');
  assert.ok(result.html.includes('series'));
  assert.equal(await fetchSeriesHtml('https://donyayeserial.com/series/', { fetchImpl: async () => new Response('media', { headers: { 'content-type': 'video/mp4' } }) }), null);
  assert.equal(await fetchSeriesHtml('https://donyayeserial.com/series/', { maxBytes: 10, fetchImpl: async () => new Response('x'.repeat(20), { headers: { 'content-type': 'text/html' } }) }), null);
  let calls = 0;
  assert.equal(await fetchSeriesHtml('https://donyayeserial.com/series/', { fetchImpl: async () => { calls++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } }); } }), null);
  assert.equal(calls, 1);
});

test('series parser retains only exact IMDb episode sources, ignoring sidebar and malformed downloads', () => {
  const html = '<h1>Breaking Bad</h1><a href="https://www.imdb.com/title/tt0903747/">IMDb</a>'
    + '<a href="https://dls7.varzeshha3-uploader.top/DonyayeSerial/series2/tt0903747/S01/Breaking.Bad.S01E01.720p.mkv">episode</a>'
    + '<a href="https://dls7.varzeshha3-uploader.top/DonyayeSerial/series2/tt1234567/Other.S01E01.720p.mkv">sidebar</a>'
    + '<a href="https://dls7.varzeshha3-uploader.top/DonyayeSerial/series2/tt0903747/bad%.mkv">bad</a>';
  const item = parseDetail(html, 'https://donyayeserial-new1.top/series/breaking-bad/');
  assert.equal(item.imdbCode, 'tt0903747'); assert.equal(item.links.length, 1);
  assert.equal(item.links[0].season, 1); assert.equal(item.links[0].episode, 1);
});
