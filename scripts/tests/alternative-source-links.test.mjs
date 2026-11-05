import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { alternativeMediaKey, applyAlternativeSourceUpdates, mergeAlternativeSourceUpdates } from '../../lib/alternative-source-links.mjs';
import { probeAlternativeMedia, refreshAlternativeSources } from '../refresh-alternative-sources.mjs';

const now = Date.now(), expires = Math.floor(now / 1000) + 86400;
const fresh = { url: `https://sn1.yserver675mufdv.top/Film.1080p.mkv?md5=fresh&expires=${expires}`, sourceProvider: 'familymovie',
  sourceUrl: 'https://familymovie.tr/?movie=fixture', quality: '1080p', group: 'SoftSub', label: '1080p', verifiedAt: new Date(now).toISOString() };
const old = { ...fresh, url: fresh.url.replace('fresh', 'old').replace(String(expires), '1'), verifiedAt: undefined };
const ds = { url: 'https://dls3.aparatchi-dlcenter.top/DonyayeSerial/Film.mkv' };

test('signed refresh replaces only its matching file, preserves metadata and never mutates raw data', () => {
  const raw = { id: 'tt9999001', links: [ds, old], posterUrl: 'poster', groups: [] };
  const updates = { version: 1, items: { tt9999001: { links: [fresh] } } };
  assert.equal(alternativeMediaKey(old), alternativeMediaKey(fresh));
  const result = applyAlternativeSourceUpdates(raw, updates, now);
  assert.deepEqual(result.links, [ds, fresh]); assert.equal(result.posterUrl, 'poster');
  assert.equal(raw.links[1].url, old.url);
  assert.deepEqual(applyAlternativeSourceUpdates(raw, updates, now + 86400001).links, [ds]);
  assert.deepEqual(applyAlternativeSourceUpdates({ ...raw, id: 'tt9999002' }, updates, now).links, [ds]);
});

test('newer tokens win, unrelated queries and filename case remain distinct', () => {
  const newer = { ...fresh, url: fresh.url.replace(String(expires), String(expires + 1000)) };
  assert.equal(applyAlternativeSourceUpdates({ id: 'tt9999001', links: [newer] }, { version: 1, items: { tt9999001: { links: [fresh] } } }, now).links[0].url, newer.url);
  const plain = { ...fresh, sourceProvider: 'moviesho' };
  assert.notEqual(alternativeMediaKey(plain), alternativeMediaKey({ ...plain, url: plain.url.replace('fresh', 'other') }));
  assert.notEqual(alternativeMediaKey(fresh), alternativeMediaKey({ ...fresh, url: fresh.url.replace('Film', 'film') }));
  assert.equal(alternativeMediaKey(ds), null);
  const first = { version: 1, items: { tt9999001: { links: [fresh] } } };
  const merged = mergeAlternativeSourceUpdates(first, { version: 1, items: { tt9999001: { links: [old] } } });
  assert.equal(merged.items.tt9999001.links[0].url, fresh.url);
});

test('range verifier recognizes real headers, rejects HTML/private redirects and cancels the response', async () => {
  let cancelled = false;
  const result = await probeAlternativeMedia(fresh.url, { fetchImpl: async (_, options) => {
    assert.equal(options.headers.Range, 'bytes=0-1023');
    return new Response(new ReadableStream({ start(controller) { controller.enqueue(Buffer.from('1a45dfa3a34286810142f7810142f281', 'hex')); }, cancel() { cancelled = true; } }), { status: 206 });
  } });
  assert.equal(result.state, 'verified'); assert.equal(cancelled, true);
  assert.equal((await probeAlternativeMedia(fresh.url, { fetchImpl: async () => new Response('<html>login</html>') })).state, 'unverified');
  let calls = 0;
  assert.equal((await probeAlternativeMedia(fresh.url, { fetchImpl: async () => { calls++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } }); } })).state, 'unapproved-host');
  assert.equal(calls, 1);
});

test('worker matches exact IMDb and episode, excludes restrictions/expired links, and preserves failures', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sarvnema-alternatives-'));
  try {
    await mkdir(path.join(root, 'titles'));
    const id = 'tt9999001';
    await writeFile(path.join(root, 'titles', id + '.json'), JSON.stringify({ id, imdbCode: id, type: 'tvSeries', links: [ds] }));
    const good = { ...fresh, url: fresh.url.replace('Film.1080p', 'Film.S01E02.1080p'), fileName: 'Film.S01E02.1080p.mkv', season: 1, episode: 2 };
    const source = { items: [{ id, links: [good, { ...good, episode: 3 }, old] }, { id: 'tt33184638', links: [good] }] };
    const result = await refreshAlternativeSources([source], { titleDir: path.join(root, 'titles'), probe: async () => ({ state: 'verified' }) });
    assert.equal(result.report.verified, 1); assert.equal(result.report.restrictedSkipped, 1);
    assert.equal(result.updates.items[id].links[0].episode, 2);
    const failed = await refreshAlternativeSources([source], { titleDir: path.join(root, 'titles'), initial: result.updates, probe: async () => { throw new Error('Must skip current link'); } });
    assert.equal(failed.report.probes, 0);
    const bounded = await refreshAlternativeSources([source], { titleDir: path.join(root, 'titles'), limit: 0 });
    assert.equal(bounded.report.budgetExhausted, true); assert.equal(bounded.report.verified, 0);
    assert.deepEqual(JSON.parse(await readFile(path.join(root, 'titles', id + '.json'), 'utf8')).links, [ds]);
  } finally { assert.ok(path.resolve(root).startsWith(path.join(path.resolve(os.tmpdir()), 'sarvnema-alternatives-'))); await rm(root, { recursive: true, force: true }); }
});

test('bundled additions are media-verified, non-regional and do not restore restricted content', async () => {
  const data = JSON.parse(await readFile('lib/data/alternative-source-links.json', 'utf8'));
  assert.equal(data.version, 1); assert.equal(Object.keys(data.items).length, 16);
  assert.equal(Object.values(data.items).reduce((n, item) => n + item.links.length, 0), 1307);
  assert.equal(data.items.tt33184638, undefined);
  for (const item of Object.values(data.items)) for (const link of item.links) {
    assert.ok(alternativeMediaKey(link)); assert.ok(Number.isFinite(Date.parse(link.verifiedAt))); assert.ok(link.sourceUrl);
  }
});
