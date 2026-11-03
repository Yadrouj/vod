import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { refreshImdbTrending, acquireImdbRefreshLock } from '../refresh-imdb-trending.mjs';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const now = () => Date.parse('2026-11-03T01:00:00Z');
const card = (kind, id = 'tt1234567') => ({ type: kind, imdbCode: id, title: 'Example', year: 2026, posterUrl: '/poster.jpg', backdropUrl: '/backdrop.jpg' });
const chart = kind => ({ sourceUrl: `https://www.imdb.com/chart/${kind === 'movie' ? 'moviemeter' : 'tvmeter'}/`, observedAt: '2026-11-01T01:00:00Z', capture: 'direct', items: [{ rank: 1, card: card(kind) }] });
const art = { url: 'https://image.tmdb.org/t/p/original/example.jpg', width: 3840, height: 2160, validatedAt: '2026-11-03T01:00:00Z', sourceUrl: 'https://www.themoviedb.org/movie/1', provider: 'tmdb' };
async function fixture(t) {
  const envDir = process.env.VOD_DATA_DIR;
  delete process.env.VOD_DATA_DIR;
  t.after(() => { if (envDir === undefined) delete process.env.VOD_DATA_DIR; else process.env.VOD_DATA_DIR = envDir; });
  const root = await mkdtemp(path.join(os.tmpdir(), 'imdb-refresh-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'public/data'), { recursive: true });
  await mkdir(path.join(root, 'data'), { recursive: true });
  const snapshot = { version: 1, charts: { movie: chart('movie'), series: chart('series') } };
  await writeFile(path.join(root, 'public/data/imdb-trending.json'), JSON.stringify(snapshot));
  await writeFile(path.join(root, 'public/data/vod-index.json'), JSON.stringify({ items: [card('movie'), card('series')] }));
  return { root, snapshot, file: path.join(root, 'public/data/imdb-trending.json') };
}
const noArt = async () => ({ artwork: {}, outcomes: {}, tmdbConfigured: false });

test('blocked IMDb retains chart bytes and original observations while independently refreshing art', async t => {
  const { root, snapshot, file } = await fixture(t); const before = await readFile(file, 'utf8');
  const status = await refreshImdbTrending({ root, now, force: true, fetchChart: async () => { throw new Error('IMDb HTTP 202'); },
    refreshArt: async charts => { assert.deepEqual(charts, snapshot.charts); return { artwork: { tt1234567: art }, outcomes: { tt1234567: { state: 'validated' } }, tmdbConfigured: false }; } });
  assert.equal(await readFile(file, 'utf8'), before);
  assert.equal(status.outcomes.movie.state, 'retained'); assert.equal(status.outcomes.series.state, 'retained');
  assert.deepEqual(JSON.parse(await readFile(path.join(root, 'public/data/imdb-hero-art.json'), 'utf8')).artwork.tt1234567, art);
  await assert.rejects(access(path.join(root, 'data/imdb-trending.lock')));
});

test('one fresh chart updates without re-dating the blocked other chart', async t => {
  const { root, snapshot, file } = await fixture(t);
  await refreshImdbTrending({ root, now, force: true, refreshArt: noArt, fetchChart: async kind => {
    if (kind === 'series') throw new Error('IMDb HTTP 403');
    return { entries: [{ imdbCode: 'tt1234567', kind, rank: 3 }], observedAt: '2026-11-03T00:00:00Z', capture: 'direct' };
  } });
  const result = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(result.charts.movie.items[0].rank, 3); assert.equal(result.charts.movie.observedAt, '2026-11-03T00:00:00Z');
  assert.deepEqual(result.charts.series, snapshot.charts.series);
});

test('older upstream observations cannot roll a newer chart back', async t => {
  const { root, file } = await fixture(t); const before = await readFile(file, 'utf8');
  const status = await refreshImdbTrending({ root, now, force: true, refreshArt: noArt, fetchChart: async kind => ({ entries: [{ imdbCode: 'tt1234567', kind, rank: 1 }], observedAt: '2026-10-01T00:00:00Z', capture: 'direct' }) });
  assert.match(status.outcomes.movie.error, /Older upstream/); assert.equal(await readFile(file, 'utf8'), before);
});

test('bootstrap without a genuine source observation cannot invent one', async t => {
  const { root, file } = await fixture(t); await rm(file);
  await writeFile(path.join(root, 'data/imdb-chart-bootstrap.json'), JSON.stringify({ charts: { movie: { entries: [{ title: 'Example', year: 2026, rank: 1 }] } } }));
  const status = await refreshImdbTrending({ root, now, bootstrap: true, refreshArt: noArt });
  assert.match(status.outcomes.movie.error, /source observation/); await assert.rejects(access(file));
});

test('dry-run leaves chart, artwork and status snapshots untouched', async t => {
  const { root, file } = await fixture(t); const before = await readFile(file, 'utf8');
  await refreshImdbTrending({ root, now, force: true, dryRun: true,
    fetchChart: async kind => ({ entries: [{ imdbCode: 'tt1234567', kind, rank: 2 }], observedAt: '2026-11-03T00:00:00Z', capture: 'direct' }),
    refreshArt: async () => ({ artwork: { tt1234567: art }, outcomes: {}, tmdbConfigured: false }) });
  assert.equal(await readFile(file, 'utf8'), before);
  for (const name of ['public/data/imdb-hero-art.json', 'data/imdb-trending-status.json']) await assert.rejects(access(path.join(root, name)));
});

test('art-only does not fetch charts or throttle a later daily source refresh', async t => {
  const { root, file } = await fixture(t); const before = await readFile(file, 'utf8');
  await refreshImdbTrending({ root, now, artOnly: true, refreshArt: noArt, fetchChart: () => { throw new Error('Unexpected chart request'); } });
  assert.equal(await readFile(file, 'utf8'), before); await assert.rejects(access(path.join(root, 'data/imdb-trending-status.json')));
});

test('VOD_DATA_DIR redirects chart, catalog, artwork, status and lock paths together', async t => {
  const { root, file, snapshot } = await fixture(t); const before = await readFile(file, 'utf8');
  const dir = path.join(root, 'deployment-data'); await mkdir(dir); process.env.VOD_DATA_DIR = dir;
  await writeFile(path.join(dir, 'imdb-trending.json'), JSON.stringify(snapshot));
  await writeFile(path.join(dir, 'vod-index.json'), JSON.stringify({ items: [card('movie'), card('series')] }));
  const status = await refreshImdbTrending({ root, now, force: true,
    fetchChart: async kind => ({ entries: [{ imdbCode: 'tt1234567', kind, rank: 2 }], observedAt: '2026-11-03T00:00:00Z', capture: 'direct' }),
    refreshArt: async (_, __, options) => { assert.equal(options.dataDir, dir); return { artwork: { tt1234567: art }, outcomes: {}, tmdbConfigured: false }; } });
  assert.equal(status.outcomes.movie.state, 'updated');
  for (const name of ['imdb-trending.json', 'imdb-hero-art.json', 'imdb-trending-status.json']) await access(path.join(dir, name));
  assert.equal(JSON.parse(await readFile(path.join(dir, 'imdb-trending.json'), 'utf8')).charts.movie.items[0].rank, 2);
  assert.equal(await readFile(file, 'utf8'), before); await assert.rejects(access(path.join(dir, 'imdb-trending.lock')));
});

test('six-hour attempt throttling skips recent checks but never turns retained outcomes into updates', async t => {
  const { root } = await fixture(t);
  const file = path.join(root, 'data/imdb-trending-status.json');
  const original = JSON.stringify({ attemptedAt: new Date(now() - 5 * 3600_000).toISOString(), outcomes: { movie: { state: 'retained', error: 'HTTP 202' } } });
  await writeFile(file, original);
  const status = await refreshImdbTrending({ root, now, refreshArt: noArt, fetchChart: () => { throw new Error('Unexpected retry'); } });
  assert.match(status.skipped, /recently/); assert.equal(await readFile(file, 'utf8'), original);
  await writeFile(file, JSON.stringify({ attemptedAt: new Date(now() + 86400_000).toISOString() }));
  const future = await refreshImdbTrending({ root, now, refreshArt: noArt, fetchChart: async () => { throw new Error('HTTP 202'); } });
  assert.equal(future.outcomes.movie.state, 'retained');
});

test('a real exited process leaves a recoverable PID lock; only proven ESRCH permits recovery', async t => {
  const { root } = await fixture(t); const file = path.join(root, 'data/crashed.lock');
  const moduleUrl = new URL('../refresh-imdb-trending.mjs', import.meta.url).href;
  const code = `import {acquireImdbRefreshLock} from ${JSON.stringify(moduleUrl)}; const lock=await acquireImdbRefreshLock(${JSON.stringify(file)}); process.exit(lock?0:2);`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', code], { windowsHide: true, stdio: 'ignore' });
  await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', status => status === 0 ? resolve() : reject(new Error(`Child exited ${status}`))); });
  const before = JSON.parse(await readFile(file, 'utf8')); assert.equal(before.pid, child.pid);
  const lock = await acquireImdbRefreshLock(file); assert.ok(lock); assert.equal(lock.recovered, true);
  assert.equal(JSON.parse(await readFile(file, 'utf8')).pid, process.pid);
  await lock.release(); await assert.rejects(access(file));
});

test('live, malformed and permission-uncertain PID locks are never stolen', async t => {
  const { root } = await fixture(t); const file = path.join(root, 'data/guarded.lock');
  const live = await acquireImdbRefreshLock(file); assert.ok(live);
  assert.equal(await acquireImdbRefreshLock(file), null); await live.release();
  for (const text of ['', '{invalid', 'null', '{}', '{"pid":"123"}', '{"pid":0}', '{"pid":-1}']) {
    await writeFile(file, text);
    assert.equal(await acquireImdbRefreshLock(file), null); assert.equal(await readFile(file, 'utf8'), text);
  }
  const text = '{"pid":12345}'; await writeFile(file, text);
  for (const code of ['EPERM', 'EACCES', 'UNKNOWN']) {
    assert.equal(await acquireImdbRefreshLock(file, { probePid: () => { const error = new Error(code); error.code = code; throw error; } }), null);
    assert.equal(await readFile(file, 'utf8'), text);
  }
});

test('owner replacement during a PID probe or before release is never unlinked', async t => {
  const { root } = await fixture(t); const file = path.join(root, 'data/race.lock');
  await writeFile(file, '{"pid":12345}'); const replacement = JSON.stringify({ pid: process.pid, token: 'replacement-owner' });
  const lock = await acquireImdbRefreshLock(file, { probePid: () => { writeFileSync(file, replacement); const error = new Error('gone'); error.code = 'ESRCH'; throw error; } });
  assert.equal(lock, null); assert.equal(await readFile(file, 'utf8'), replacement);
  await rm(file); const owned = await acquireImdbRefreshLock(file); assert.ok(owned);
  await writeFile(file, replacement); await owned.release(); assert.equal(await readFile(file, 'utf8'), replacement);
});
