import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaUrl, directFileIdentity, buildDirectPlan, probeMedia, exactPublisherPageMapping } from '../lib/moviezland-direct.mjs';

test('a prior mapping is evidence only when its complete page slug matches, not a substring', () => {
  assert.equal(exactPublisherPageMapping({ title: 'The G', movieLandzPage: 'https://movielandz.com/the-blackening-2023-film/' }), false);
  assert.equal(exactPublisherPageMapping({ title: 'Chernobyl', movieLandzPage: 'https://movielandz.com/2019-chernobyl-series/' }), true);
});

const root = 'https://dl.moviezland.ir/movies/';
test('accepts only exact public publisher file URLs; excludes teasers and malformed escapes', () => {
  assert.ok(mediaUrl(root + 'Pixels.2015.1080p.mkv'));
  for (const url of ['http://dl.moviezland.ir/a.mp4', root + '../Tizer/a.mp4', 'https://dl.moviezland.ir/anons/a.mp4', root + 'a.mkv?redirect=1', root + '%E0%A4%A.mp4', 'https://evil.test/a.mkv', 'https://user@dl.moviezland.ir/a.mp4']) assert.equal(mediaUrl(url), null, url);
});
test('keeps explicit episode identity and strips quality before episode labels', () => {
  assert.deepEqual(directFileIdentity('Char_Khooneh_01_mer30download.com.wmv'), { key: 'charkhooneh', season: 1, episode: 1 });
  assert.deepEqual(directFileIdentity('Dandoon_Tala_E09_720p.mkv'), { key: 'dandoontala', season: 1, episode: 9 });
  assert.deepEqual(directFileIdentity('Show-720p-HD-E29.mkv'), { key: 'show', season: 1, episode: 29 });
  assert.equal(directFileIdentity('Unknown.720p.mkv'), null);
});
test('matches exact title/year, never nearest title, remakes, or ambiguous IDs', () => {
  const catalog = [{ id: 'tt9999001', title: 'Pixels', year: 2015, type: 'movie' }, { id: 'tt9999002', title: 'Pixels', year: 2020, type: 'movie' }];
  const lines = [root + 'Pixels.2015.1080p.mkv', root + 'Pixels.2016.720p.mkv', root + 'Pixel.2015.720p.mkv'].join('\n');
  const result = buildDirectPlan(lines, catalog);
  assert.equal(result.candidates.length, 1); assert.equal(result.candidates[0].id, 'tt9999001'); assert.equal(result.unresolved.length, 2);
  const ambiguous = buildDirectPlan(lines, [...catalog, { ...catalog[0], id: 'tt9999003' }]);
  assert.equal(ambiguous.candidates.length, 0); assert.equal(ambiguous.unresolved[0].reason, 'ambiguous-title-year');
});
test('exact publisher anchors support researched profiles without IMDb and no fabricated year', () => {
  const url = root + 'irani/Unknown.720p.mkv';
  const profile = { id: 'moviezland-abc123', title: 'A researched title', type: 'movie', year: null, sourcePageUrl: 'https://movielandz.com/example/', fileUrls: [url] };
  const plan = buildDirectPlan(url, [], [], [profile]);
  assert.equal(plan.candidates[0].id, profile.id);
  assert.equal(plan.candidates[0].matchType, 'exact-publisher-file-url');
  assert.equal(plan.candidates[0].link.sourceUrl, profile.sourcePageUrl);
});
test('known aliases cannot revive restricted content', () => {
  const plan = buildDirectPlan(root + 'Paris.Has.Fallen.2024.1080p.mkv', [{ id: 'tt33184638', title: 'Paris Has Fallen', year: 2024, type: 'movie' }]);
  assert.equal(plan.candidates.length, 0);
});
test('range probe checks signature and full size and cancels its reader', async () => {
  let cancelled = false;
  const good = async () => new Response(new ReadableStream({ start(c) { c.enqueue(Buffer.from('1a45dfa3a34286810142f7810142f281', 'hex')); }, cancel() { cancelled = true; } }), { status: 206, headers: { 'content-range': 'bytes 0-31/100000000' } });
  assert.equal((await probeMedia(root + 'x.mkv', false, good)).format, 'matroska'); assert.equal(cancelled, true);
  await assert.rejects(() => probeMedia(root + 'x.mp4', false, async () => new Response('<html>login</html>', { status: 200 })), /signature/);
  await assert.rejects(() => probeMedia(root + 'x.mkv', false, async () => new Response(Buffer.from('1a45dfa3a34286810142f7810142f281', 'hex'), { status: 206, headers: { 'content-range': 'bytes 0-31/1000000' } })), /size/);
});
