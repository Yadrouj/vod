import assert from 'node:assert/strict';
import test from 'node:test';
import { addPlaybackSample, approvedMediaAuditUrl, probePlaybackMedia } from '../playback-source-audit-lib.mjs';
import { probeAlternativeMedia } from '../refresh-alternative-sources.mjs';
import { probeDonyayeMedia } from '../donyaye-link-health.mjs';

const source = 'https://source.abrtech.top/pnot/Series/test.mkv';
const mkv = Buffer.from('1a45dfa3a34286810142f7810142f281', 'hex');

test('audit follows approved redirects, verifies file bytes and cancels the stream', async () => {
  let calls = 0, cancelled = false;
  const result = await probePlaybackMedia(source, { fetchImpl: async (_, options) => {
    assert.equal(options.headers.Range, 'bytes=0-4095');
    if (++calls === 1) return new Response(null, { status: 302, headers: { location: 'https://edge07.tmk51.ir.cdn.ir/pnot/Series/test.mkv' } });
    return new Response(new ReadableStream({ start(c) { c.enqueue(mkv); c.close(); }, cancel() { cancelled = true; } }), { status: 206 });
  } });
  assert.equal(result.state, 'media-prefix-verified'); assert.equal(result.format, 'matroska/webm');
  assert.equal(result.redirects.length, 1); assert.equal(calls, 2);
  // Also test an upstream that ignores Range and never closes its response.
  await probePlaybackMedia(source, { fetchImpl: async () => new Response(new ReadableStream({ start(c) { c.enqueue(Buffer.concat([mkv, Buffer.alloc(5000)])); }, cancel() { cancelled = true; } })) });
  assert.equal(cancelled, true);
});

test('a redirect alone, an HTML login and a timeout are not healthy media', async () => {
  assert.equal((await probePlaybackMedia(source, { fetchImpl: async () => new Response('<html>Login</html>') })).state, 'not-media');
  assert.equal((await probePlaybackMedia(source, { fetchImpl: async () => new Response(null, { status: 404 }) })).state, 'missing-sample');
  assert.equal((await probePlaybackMedia(source, { fetchImpl: async () => new Response(null, { status: 403 }) })).state, 'http-unverified');
  assert.equal((await probePlaybackMedia(source, { fetchImpl: async () => { throw new Error('timeout'); } })).state, 'network-unverified');
  assert.equal((await probePlaybackMedia(source, { fetchImpl: async () => new Response(null, { status: 302, headers: { location: source } }) })).state, 'redirect-limit');
});

test('audit never contacts private addresses, non-media services or lookalike hosts', async () => {
  for (const url of ['http://127.0.0.1/a', 'http://[::1]/a', 'http://10.0.0.1/a', 'file:///a', 'https://cdn.ir.attacker.test/a', 'https://user:password@source.abrtech.top/a', 'https://source.abrtech.top:8080/a', 'https://stream1009.hashureplus.com/a', 'https://moviesho1.deemano.ir.attacker.test/a', 'https://karban.my/login']) assert.equal(approvedMediaAuditUrl(url), false);
  assert.equal(approvedMediaAuditUrl('https://stream1007.hashureplus.com/a'), true);
  let calls = 0;
  const result = await probePlaybackMedia(source, { fetchImpl: async () => { calls++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } }); } });
  assert.equal(result.state, 'unapproved-host'); assert.equal(calls, 1);
});

test('sampling is bounded, deterministic and prefers different title identities', () => {
  const rows = [];
  for (const url of ['a', 'b', 'c', 'd']) addPlaybackSample(rows, { itemId: 'one', url }, 3);
  addPlaybackSample(rows, { itemId: 'two', url: 'e' }, 3);
  assert.equal(rows.length, 3); assert.equal(new Set(rows.map(row => row.itemId)).size, 2);
  addPlaybackSample(rows, { itemId: 'two', url: 'e' }, 3); assert.equal(rows.length, 3);
});

test('nightly verifiers recognize the newly observed provider edges but reject lookalikes', async () => {
  for (const [probe, url, host] of [
    [probeAlternativeMedia, 'https://sr1moviesho.musitraf.com/Film.mkv', 'moviesho1.deemano.ir'],
    [probeDonyayeMedia, 'https://dls4.aparatchi-dlcenter.top/DonyayeSerial/Film.mkv', 'stream1008.hashureplus.com'],
  ]) {
    let calls = 0;
    const result = await probe(url, { fetchImpl: async () => {
      if (++calls === 1) return new Response(null, { status: 302, headers: { location: `https://${host}/Film.mkv` } });
      return new Response(mkv, { status: 206 });
    } });
    assert.equal(result.state, 'verified'); assert.equal(calls, 2);
    calls = 0;
    const rejected = await probe(url, { fetchImpl: async () => {
      calls++; return new Response(null, { status: 302, headers: { location: `https://${host}.attacker.test/Film.mkv` } });
    } });
    assert.notEqual(rejected.state, 'verified'); assert.equal(calls, 1);
  }
});
