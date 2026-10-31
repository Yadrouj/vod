import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createRemoteChannelStore } from '../lib/telegram-channel-remote.mjs';

async function harness(handler, t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'channel-remote-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const call = { path: `${url.pathname}${url.search}`, method: init.method ?? 'GET', headers: init.headers ?? {}, body: init.body };
    calls.push(call);
    return handler(call);
  };
  const logs = [];
  const store = createRemoteChannelStore({ api: 'https://site.example', token: 'secret', directory, fetchImpl, retryDelayMs: 0, log: message => logs.push(message) });
  return { store, calls, directory, logs, journal: path.join(directory, 'state.journal.json') };
}
const json = (value, init) => new Response(JSON.stringify(value), init);
const missing = file => stat(file).then(() => false, () => true);

test('every request carries the bot token and an empty state is an explicit null', async t => {
  const { store, calls } = await harness(() => json({ document: null }), t);
  assert.equal(await store.loadState(), null);
  assert.equal(calls[0].headers['x-bot-token'], 'secret');
});

test('an outage or wrong route is never mistaken for a first run', async t => {
  for (const response of [() => json({}, { status: 404 }), () => json({}, { status: 502 }), () => new Response('<!DOCTYPE html>')]) {
    const { store } = await harness(response, t);
    await assert.rejects(store.loadState());
  }
});

test('a saved state uploads gzip and clears the journal', async t => {
  const { store, calls, journal } = await harness(() => json({ ok: true }), t);
  await store.saveState({ posts: { a: { status: 'sent' } } });
  assert.deepEqual(JSON.parse(gunzipSync(calls[0].body)), { posts: { a: { status: 'sent' } } });
  assert.equal(calls[0].path, '/api/bot/channel/state?document=state');
  assert.ok(await missing(journal));
});

test('an unchanged state is not uploaded again', async t => {
  const { store, calls } = await harness(() => json({ ok: true }), t);
  await store.saveState({ a: 1 });
  await store.saveState({ a: 1 });
  assert.equal(calls.length, 1);
});

test('a failed upload keeps the sent record, and the journal wins and syncs on the next cycle', async t => {
  let healthy = false;
  const { store, calls, journal, logs } = await harness(call => {
    if (!healthy) return json({}, { status: 502 });
    return json(call.method === 'PUT' ? { ok: true } : { document: { stale: true } });
  }, t);
  await store.saveState({ posts: { a: { status: 'sent', messageId: 7 } } });
  assert.equal(calls.length, 3);
  assert.match(logs[0], /local journal/);
  assert.equal(JSON.parse(await readFile(journal, 'utf8')).posts.a.messageId, 7);

  healthy = true;
  assert.equal((await store.loadState()).posts.a.messageId, 7);
  assert.equal(calls.at(-1).method, 'PUT');
  assert.ok(await missing(journal));
});

test('catalogue data is cached by ETag and a failed refresh throws', async t => {
  let mode = 'fresh';
  const { store, calls } = await harness(() => {
    if (mode === 'fresh') return json({ items: [1] }, { headers: { ETag: '"v1"' } });
    if (mode === 'same') return new Response(null, { status: 304 });
    return json({}, { status: 503 });
  }, t);
  assert.deepEqual(await store.readData('vod-updates'), { items: [1] });
  mode = 'same';
  assert.deepEqual(await store.readData('vod-updates'), { items: [1] });
  assert.equal(calls[1].headers['If-None-Match'], '"v1"');
  mode = 'down';
  await assert.rejects(store.readData('vod-updates'), /503/);
});
