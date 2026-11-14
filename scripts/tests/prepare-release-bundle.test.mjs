import assert from 'node:assert/strict';
import test from 'node:test';
import { combineVideoSources, compatibleMusicAttribution, selectVideoUpdates, verifyMusicSources } from '../prepare-release-bundle.mjs';
import { mergeMeloobitTracks } from '../meloobit-source.mjs';

const track = (id, url) => ({ id, title: 'Song', persianTitle: 'آهنگ', kind: 'track', artist: { name: 'Singer', slug: 'singer', sourceUrl: 'https://publisher.test/' }, artists: [{ name: 'Singer', slug: 'singer', sourceUrl: 'https://publisher.test/' }], sourceUrl: 'https://publisher.test/song/', sources: [{ url, kind: 'download', provider: 'meloobit' }] });

test('video batches exclude takedowns, merge only exact IDs and retain publisher pages', () => {
  const first = { id: 'tt1234567', imdbCode: 'tt1234567', title: 'Film', sourcePageUrl: 'https://first.test/', links: [{ url: 'https://cdn.test/a.mkv' }] };
  const second = { ...first, sourcePageUrl: 'https://second.test/', links: [{ url: 'https://cdn.test/b.mkv' }] };
  const result = combineVideoSources([{ items: [first, { ...first, id: 'tt33184638', imdbCode: 'tt33184638' }] }, { items: [second] }]);
  assert.equal(result.length, 1); assert.equal(result[0].links.length, 2);
  assert.deepEqual(result[0].curatedSourcePages, ['https://first.test/', 'https://second.test/']);
});

test('bounded audio probes inspect a prefix, deduplicate URLs, reject HTML/image/private targets', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, ...options });
    return url.includes('html') ? new Response('<html>not a file</html>', { headers: { 'content-type': 'text/html' } })
      : url.includes('image') ? new Response(Buffer.from('ID3not-an-audio-file'), { headers: { 'content-type': 'image/png' } })
      : new Response(Buffer.from('ID3audio-prefix'), { status: 206, headers: { 'content-type': 'audio/mpeg' } });
  };
  const source = [track('one', 'https://cdn.test/a.mp3'), track('same', 'https://cdn.test/a.mp3'), track('bad', 'https://cdn.test/html'), track('picture', 'https://cdn.test/image'), track('private', 'http://127.0.0.1/private')];
  const result = await verifyMusicSources(source, { fetchImpl, gapMs: 0 });
  assert.deepEqual(result.tracks.map(t => t.id).sort(), ['one', 'same']);
  assert.equal(requests.length, 3);
  assert.ok(requests.every(request => request.headers.Range === 'bytes=0-4095' && request.redirect === 'error'));
  assert.ok(result.tracks.every(t => t.sources.every(s => s.available === true && s.checkedAt && s.kind === 'stream')));
});

test('same-named remix and original recordings do not collapse during batch matching', () => {
  const original = track('original', 'https://cdn.test/Song.mp3');
  const remix = track('remix', 'https://cdn.test/Song_Remix.mp3'); remix.sources[0].available = true;
  assert.equal(mergeMeloobitTracks([original], [remix]).length, 2);
});

test('ambiguous same-title/year source IDs do not create duplicate new cards or cross-attach files', () => {
  const old = { id: 'familymovie-a', title: 'Film', originalTitle: 'Film', type: 'movie', year: 2026, links: [{ url: 'https://one.test/a.mp4' }] };
  const fresh = { ...old, id: 'moviesho-new', persianTitle: 'فیلم نمونه', links: [{ url: 'https://two.test/b.mp4' }] };
  assert.deepEqual(selectVideoUpdates([old, fresh], [old]).selected, [old]);
  assert.deepEqual(selectVideoUpdates([old, fresh], []).selected, [fresh]);
  assert.equal(selectVideoUpdates([old, fresh], []).heldBack.length, 1);
  const distinct = [{ ...old, id: 'tt1234567' }, { ...fresh, id: 'tt7654321' }];
  assert.deepEqual(selectVideoUpdates(distinct, []).selected, distinct);
});

test('a stale sidebar singer is not propagated over checked primary-article attribution', () => {
  const original = track('old', 'https://cdn.test/song.mp3');
  const unrelated = { ...original, artist: { ...original.artist, name: 'Another Singer', slug: 'another-singer' }, artists: [{ ...original.artist, name: 'Another Singer', slug: 'another-singer' }] };
  assert.equal(compatibleMusicAttribution(original, [original]), true);
  assert.equal(compatibleMusicAttribution(original, [unrelated]), false);
});
