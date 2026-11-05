import assert from 'node:assert/strict';
import test from 'node:test';
import { probeYouTubeMetadata, publicYouTubeAddress, youtubeNetworkState } from '../youtube-source-audit-lib.mjs';

test('filtered/private DNS never becomes evidence of deleted videos', async () => {
  for (const address of ['10.10.34.36', '127.0.0.1', '192.168.1.1', '172.16.0.1', '169.254.1.1', '::1', 'fc00::1', '::ffff:10.0.0.1']) assert.equal(publicYouTubeAddress(address), false);
  assert.equal(publicYouTubeAddress('142.250.0.1'), true);
  assert.equal((await youtubeNetworkState({ lookupImpl: async () => [{ address: '10.10.34.36' }] })).state, 'non-public-dns');
  assert.equal((await youtubeNetworkState({ lookupImpl: async () => { throw new Error('DNS failed'); } })).state, 'dns-unverified');
});

test('metadata only accepts a strict video ID, uses the fixed public endpoint and never follows redirects', async () => {
  let calls = 0;
  const options = { fetchImpl: async (url, init) => {
    calls++; assert.equal(url.hostname, 'www.youtube.com'); assert.equal(url.pathname, '/oembed');
    assert.equal(url.searchParams.get('url'), 'https://www.youtube.com/watch?v=mSzgo6SRnBs'); assert.equal(init.redirect, 'manual');
    return Response.json({ provider_name: 'YouTube', title: 'Fixture', author_name: 'Creator' });
  } };
  assert.equal((await probeYouTubeMetadata('mSzgo6SRnBs', options)).state, 'metadata-visible');
  for (const id of ['mSzgo6SRnBs\n', 'https://evil.test', 'short']) assert.equal((await probeYouTubeMetadata(id, options)).state, 'invalid-id');
  assert.equal(calls, 1);
  assert.equal((await probeYouTubeMetadata('mSzgo6SRnBs', { fetchImpl: async () => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/' } }) })).state, 'metadata-unverified');
  assert.equal((await probeYouTubeMetadata('mSzgo6SRnBs', { fetchImpl: async () => { throw new Error('Refused'); } })).state, 'network-unverified');
});
