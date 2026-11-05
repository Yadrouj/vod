import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { applyDonyayeLinkUpdates, donyayeLinkKey, mergeDonyayeUpdateSets, resolveDonyayeDownloadUrl } from '../../lib/donyaye-link-updates.mjs';
import { probeDonyayeMedia } from '../donyaye-link-health.mjs';
import { refreshDonyayeLinks } from '../refresh-donyaye-links.mjs';
import { mergeItem } from '../merge-vod-source-stream.mjs';

const id = 'tt1155056';
const makeUrl = host => `https://${host}/DonyayeSerial/movies/2009/${id}/SoftSub/Film.1080p.mkv`;
const oldUrl = makeUrl('dls3.aparatchi-dlcenter.top');
const goodUrl = makeUrl('dls4.varzeshha3-uploader.top');
const checkedAt = new Date().toISOString();
const link = { url: goodUrl, label: '1080p', quality: '1080p', group: 'SoftSub', size: null, release: 'BluRay', verifiedAt: checkedAt };
const item = { id, imdbCode: id, title: 'Fixture film', type: 'movie', links: [{ ...link, url: oldUrl }], groups: ['SoftSub'], qualities: ['1080p'] };
const manifest = patch => ({ version: 1, items: { [id]: patch } });

test('verified patches repair only the observed URL and preserve metadata and unrelated providers', () => {
  const original = { ...item, links: [{ ...item.links[0], season: 2, episode: 3 }, { url: 'https://other.example/film.mp4' }] };
  const snapshot = structuredClone(original);
  const result = applyDonyayeLinkUpdates(original, manifest({ replacements: [{ fromUrl: oldUrl, link }] }));
  assert.equal(result.links[0].url, goodUrl);
  assert.equal(result.links[0].season, 2);
  assert.equal(result.links[0].episode, 3);
  assert.equal(result.links[1].url, original.links[1].url);
  assert.deepEqual(original, snapshot);
});

test('previously shared five-second download URLs resolve exact verified repairs, never a guessed quality', () => {
  const repair = manifest({ replacements: [{ fromUrl: oldUrl, link }] });
  assert.equal(resolveDonyayeDownloadUrl(oldUrl, repair), goodUrl);
  assert.equal(resolveDonyayeDownloadUrl(oldUrl.replace('1080p', '720p'), repair), oldUrl.replace('1080p', '720p'));
  assert.equal(resolveDonyayeDownloadUrl('https://other.example/movie.mp4', repair), 'https://other.example/movie.mp4');
  assert.equal(resolveDonyayeDownloadUrl(oldUrl, manifest({ checks: [{ url: oldUrl, state: 'missing', checkedAt }] }), Date.parse(checkedAt) + 1), null);
});

test('new verified qualities are idempotent and never overwrite a later catalog refresh', () => {
  const current = { ...item, links: [{ ...link, url: makeUrl('dls9.varzeshha3-uploader.top') }] };
  const updates = manifest({ links: [link] });
  assert.equal(applyDonyayeLinkUpdates(current, updates).links[0].url, current.links[0].url);
  const added = { ...link, url: goodUrl.replace('1080p', '720p'), quality: '720p' };
  const once = applyDonyayeLinkUpdates(current, manifest({ links: [added] }));
  assert.equal(once.links.length, 2);
  assert.deepEqual(applyDonyayeLinkUpdates(once, manifest({ links: [added] })), once);
});

test('unverified, wrong-title, non-provider and different-file substitutions cannot enter downloads', () => {
  for (const bad of [{ ...link, verifiedAt: null }, { ...link, url: goodUrl.replace(id, 'tt0903747') },
    { ...link, url: 'https://evil.example/DonyayeSerial/movie.mkv' }, { ...link, url: goodUrl.replace('1080p', '720p') }]) {
    const result = applyDonyayeLinkUpdates(item, manifest({ replacements: [{ fromUrl: oldUrl, link: bad }] }));
    assert.equal(result.links[0].url, oldUrl);
  }
  assert.notEqual(donyayeLinkKey(goodUrl), donyayeLinkKey(goodUrl.replace('Film.', 'film.')));
});

test('confirmed 404 quarantine is temporary, reversible and cannot affect other providers', () => {
  const missing = manifest({ checks: [{ url: oldUrl, state: 'missing', checkedAt }] });
  const now = Date.parse(checkedAt) + 1000;
  assert.equal(applyDonyayeLinkUpdates(item, missing, now).links.length, 0);
  assert.equal(item.links.length, 1, 'original catalog retains the source');
  assert.equal(applyDonyayeLinkUpdates(item, missing, now + 8 * 86400000).links.length, 1);
  const restored = mergeDonyayeUpdateSets(missing, manifest({ checks: [{ url: oldUrl, state: 'verified', checkedAt: new Date(now).toISOString() }] }));
  assert.equal(applyDonyayeLinkUpdates(item, restored, now + 1).links.length, 1);
  const foreign = { ...item, links: [{ url: 'https://other.example/file.mp4' }] };
  assert.equal(applyDonyayeLinkUpdates(foreign, manifest({ checks: [{ url: foreign.links[0].url, state: 'missing', checkedAt }] }), now).links.length, 1);
});

test('the archive merger cannot undo a verified host with an unverified historical host', () => {
  const source = { ...item, links: [{ ...link, verifiedAt: undefined }] };
  assert.equal(mergeItem(item, source).links[0].url, oldUrl);
  assert.equal(mergeItem(item, { ...source, links: [link] }).links[0].url, goodUrl);
});

test('media validation follows approved redirects, requests 1KB and rejects HTML or private redirects', async () => {
  const calls = [];
  const result = await probeDonyayeMedia(goodUrl, { fetchImpl: async (url, options) => {
    calls.push(url); assert.equal(options.headers.Range, 'bytes=0-1023');
    if (calls.length === 1) return new Response(null, { status: 302, headers: { location: 'https://st012.cartoonet.ir/srv38ta/file.mkv' } });
    return new Response(Buffer.from('1a45dfa3000000000000000000000000', 'hex'), { status: 206 });
  } });
  assert.equal(result.state, 'verified'); assert.equal(calls.length, 2);
  assert.equal((await probeDonyayeMedia(goodUrl, { fetchImpl: async () => new Response('<html>blocked</html>') })).state, 'unverified');
  let requested = 0;
  assert.equal((await probeDonyayeMedia(goodUrl, { fetchImpl: async () => {
    requested++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } });
  } })).state, 'unapproved-redirect');
  assert.equal(requested, 1);
});

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'sarvnema-donyaye-refresh-'));
  await mkdir(path.join(root, 'titles'));
  await writeFile(path.join(root, 'titles', `${id}.json`), JSON.stringify(item));
  t.after(async () => { assert.ok(path.resolve(root).startsWith(path.join(path.resolve(tmpdir()), 'sarvnema-donyaye-refresh-'))); await rm(root, { recursive: true, force: true }); });
  return { titleDir: path.join(root, 'titles') };
}

test('refresh keeps working hosts and only replaces proven missing files with verified equivalents', async t => {
  const opts = await fixture(t);
  const source = { sourceUrl: 'https://archive.example/index', items: [{ ...item, links: [link] }] };
  let calls = 0;
  const healthy = await refreshDonyayeLinks(source, { ...opts, probe: async () => { calls++; return { state: 'verified', checkedAt }; } });
  assert.equal(healthy.report.keptHealthy, 1); assert.equal(calls, 1);
  const fixed = await refreshDonyayeLinks(source, { ...opts, probe: async url => ({ state: url === oldUrl ? 'missing' : 'verified', checkedAt }) });
  assert.equal(fixed.report.replaced, 1);
  assert.equal(applyDonyayeLinkUpdates(item, fixed.updates).links[0].url, goodUrl);
});

test('observed failures are confirmed twice; 403/timeouts and exhausted budgets never quarantine', async t => {
  const opts = await fixture(t);
  const source = { sourceUrl: 'https://archive.example/index', items: [] };
  const observedFailures = [{ itemId: id, url: oldUrl }];
  let calls = 0;
  const absent = await refreshDonyayeLinks(source, { ...opts, observedFailures, probe: async () => { calls++; return { state: 'missing', checkedAt }; } });
  assert.equal(calls, 2); assert.equal(absent.report.quarantined, 1);
  for (const state of ['unverified', 'network-unverified']) {
    const untouched = await refreshDonyayeLinks(source, { ...opts, observedFailures, probe: async () => ({ state }) });
    assert.equal(untouched.report.quarantined, 0);
  }
  const limited = await refreshDonyayeLinks(source, { ...opts, observedFailures, limit: 1, probe: async () => ({ state: 'missing' }) });
  assert.equal(limited.report.quarantined, 0); assert.equal(limited.report.budgetExhausted, true);
});

test('new additions need media verification; restricted titles are never probed', async t => {
  const opts = await fixture(t);
  const source = { sourceUrl: 'https://archive.example/index', items: [{ ...item, links: [{ ...link, url: goodUrl.replace('1080p', '720p') }] },
    { ...item, id: 'tt33184638', imdbCode: 'tt33184638', title: 'Paris Has Fallen', links: [link] }] };
  const result = await refreshDonyayeLinks(source, { ...opts, probe: async () => ({ state: 'verified', checkedAt }) });
  assert.equal(result.report.added, 1); assert.equal(result.report.restrictedSkipped, 1); assert.equal(result.report.probes, 1);
});

test('legacy series URLs without IMDb folders can be quarantined and rechecked without losing source ownership', async t => {
  const opts = await fixture(t);
  const legacy = 'https://dls2.aparatchi-dlcenter.top/DonyayeSerial/series/24/Dubbed/S03/24.S03E08.720p.mkv';
  const value = { ...item, links: [{ ...link, url: legacy }] };
  await writeFile(path.join(opts.titleDir, `${id}.json`), JSON.stringify(value));
  const missing = await refreshDonyayeLinks({ items: [] }, { ...opts, observedFailures: [{ itemId: id, url: legacy }],
    probe: async () => ({ state: 'missing', checkedAt }) });
  assert.equal(missing.report.quarantined, 1);
  assert.equal(applyDonyayeLinkUpdates(value, missing.updates).links.length, 0);
  const healthyAt = new Date(Date.parse(checkedAt) + 1000).toISOString();
  const restored = await refreshDonyayeLinks({ items: [] }, { ...opts, initial: missing.updates,
    probe: async () => ({ state: 'verified', checkedAt: healthyAt }) });
  assert.equal(restored.report.restored, 1);
  assert.equal(applyDonyayeLinkUpdates(value, restored.updates).links.length, 1);
});
