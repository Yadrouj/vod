import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertPublicMedia,
  buildContainer,
  createClient,
  getAccount,
  publishMedia,
  readToken,
  refreshToken,
  validateCaption,
} from '../marketing/instagram.mjs';

const TOKEN = 'secret-token';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

// Answers each request with the next queued body and records what was sent.
function fakeFetch(...replies) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ method: init.method ?? 'GET', url: String(url), headers: init.headers, body: init.body && JSON.parse(init.body) });
    const reply = replies.shift();
    assert.ok(reply, `unexpected request: ${url}`);
    return reply instanceof Response ? reply : json(reply);
  };
  return { calls, fetchImpl };
}

test('publishes a reel: container, wait for processing, publish, permalink', async () => {
  const { calls, fetchImpl } = fakeFetch(
    { id: 'container-1' },
    { status_code: 'IN_PROGRESS' },
    { status_code: 'FINISHED' },
    { id: 'media-9' },
    { permalink: 'https://www.instagram.com/reel/abc/' },
  );
  const client = createClient({ token: TOKEN, fetchImpl });
  const container = buildContainer('reel', {
    videoUrl: 'https://example.com/reel.mp4',
    coverUrl: 'https://example.com/cover.jpg',
    caption: 'سلام #سرونما',
    aiGenerated: true,
  });
  const waits = [];

  const result = await publishMedia(client, '1784', container, { pollMs: 5, sleep: async (ms) => waits.push(ms) });

  assert.deepEqual(result, { mediaId: 'media-9', permalink: 'https://www.instagram.com/reel/abc/' });
  assert.deepEqual(waits, [5]);
  assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), [
    'POST https://graph.instagram.com/v27.0/1784/media',
    'GET https://graph.instagram.com/v27.0/container-1?fields=status_code%2Cstatus',
    'GET https://graph.instagram.com/v27.0/container-1?fields=status_code%2Cstatus',
    'POST https://graph.instagram.com/v27.0/1784/media_publish',
    'GET https://graph.instagram.com/v27.0/media-9?fields=permalink',
  ]);
  assert.deepEqual(calls[0].body, {
    media_type: 'REELS',
    video_url: 'https://example.com/reel.mp4',
    share_to_feed: true,
    cover_url: 'https://example.com/cover.jpg',
    caption: 'سلام #سرونما',
    is_ai_generated: true,
  });
  assert.deepEqual(calls[3].body, { creation_id: 'container-1' });
  assert.ok(calls.every((call) => call.headers.Authorization === `Bearer ${TOKEN}` && !call.url.includes(TOKEN)));
});

test('an image container carries only the image link and caption', () => {
  assert.deepEqual(buildContainer('image', { imageUrl: 'https://example.com/a.jpg', caption: 'x' }), {
    image_url: 'https://example.com/a.jpg',
    caption: 'x',
  });
});

test('never publishes media that Instagram rejected or is still processing', async () => {
  const rejected = fakeFetch({ id: 'c' }, { status_code: 'ERROR', status: 'Error: unsupported video format' });
  await assert.rejects(
    publishMedia(createClient({ token: TOKEN, fetchImpl: rejected.fetchImpl }), '1', {}),
    /rejected the media \(ERROR\): Error: unsupported video format/,
  );
  assert.equal(rejected.calls.length, 2);

  const slow = fakeFetch({ id: 'c' }, { status_code: 'IN_PROGRESS' });
  await assert.rejects(
    publishMedia(createClient({ token: TOKEN, fetchImpl: slow.fetchImpl }), '1', {}, { timeoutMs: 0 }),
    /still processing container c .* nothing was published/,
  );
  assert.equal(slow.calls.length, 2);
});

test('surfaces Instagram error messages without leaking the token', async () => {
  const { fetchImpl } = fakeFetch(json({ error: { message: 'Invalid OAuth access token', code: 190 } }, 400));
  await assert.rejects(getAccount(createClient({ token: TOKEN, fetchImpl })), (error) => {
    assert.match(error.message, /GET \/me failed: Invalid OAuth access token/);
    assert.equal(error.code, 190);
    assert.ok(!error.message.includes(TOKEN));
    return true;
  });
});

test('reads the account from either response shape', async () => {
  const account = { user_id: '1784', username: 'sarvnema' };
  for (const reply of [{ data: [account] }, account]) {
    const { fetchImpl } = fakeFetch(reply);
    assert.deepEqual(await getAccount(createClient({ token: TOKEN, fetchImpl })), account);
  }
});

test('refreshes a long-lived token', async () => {
  const { calls, fetchImpl } = fakeFetch({ access_token: 'new-token', token_type: 'bearer', expires_in: 5_183_944 });
  assert.deepEqual(await refreshToken(TOKEN, fetchImpl), { token: 'new-token', expiresInDays: 59 });
  assert.equal(calls[0].url, `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${TOKEN}`);
});

test('enforces Instagram caption limits', () => {
  assert.deepEqual(validateCaption('فیلم ببینیم #سرونما #آخر_هفته @sarvnema.ir'), { characters: 42, hashtags: 2, mentions: 1 });
  assert.throws(() => validateCaption('x'.repeat(2201)), /2201 characters/);
  assert.throws(() => validateCaption(Array.from({ length: 31 }, (_, index) => `#t${index}`).join(' ')), /31 hashtags/);
});

test('rejects media links Instagram could not download', async () => {
  await assert.rejects(assertPublicMedia('http://example.com/a.mp4'), /public https:\/\/ link/);
  await assert.rejects(assertPublicMedia('C:\\reel.mp4'), /public https:\/\/ link/);
  const missing = fakeFetch(new Response(null, { status: 404 }));
  await assert.rejects(assertPublicMedia('https://example.com/a.mp4', missing.fetchImpl), /not reachable \(HTTP 404\)/);
  const found = fakeFetch(new Response(null, { headers: { 'content-type': 'video/mp4', 'content-length': '10367742' } }));
  assert.deepEqual(await assertPublicMedia('https://example.com/a.mp4', found.fetchImpl), { type: 'video/mp4', bytes: 10_367_742 });
  assert.equal(found.calls[0].method, 'HEAD');
});

test('explains a missing token file', async () => {
  await assert.rejects(readToken('Z:\\does-not-exist\\instagram-token.txt'), /No Instagram token file at .*Save the access token there/);
});
