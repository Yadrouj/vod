import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { isLandscape, originalImageUrl, validateHeroImage, tmdbBackdrops, catalogHeroCandidates, refreshHeroArt } from '../lib/imdb-hero-art.mjs';

const now = () => Date.parse('2026-11-03T01:00:00Z');
const url = 'https://image.tmdb.org/t/p/original/landscape.jpg';
const previous = { url, width: 3840, height: 2160, provider: 'tmdb', sourceUrl: 'https://www.themoviedb.org/movie/1', validatedAt: '2026-11-01T00:00:00Z' };
const card = (id, extra = {}) => ({ imdbCode: id, type: 'movie', backdropUrl: url, ...extra });
const charts = (...cards) => ({ movie: { items: cards.map((card, i) => ({ rank: i + 1, card })) } });
const pixels = Buffer.alloc(1920 * 1080 * 3);
for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 37 + Math.floor(i / 117)) % 256;
const landscape = await sharp(pixels, { raw: { width: 1920, height: 1080, channels: 3 } }).jpeg().toBuffer();

test('landscape thresholds reject posters, low resolution and extreme crops', () => {
  assert.equal(isLandscape({ width: 1920, height: 1080 }), true);
  for (const [width, height] of [[1280, 720], [1080, 1920], [3840, 1000], [1920, 800.5]]) assert.equal(isLandscape({ width, height }), false);
});

test('official image originals remove transforms, not by upscaling raster data', () => {
  assert.equal(originalImageUrl('https://image.tmdb.org/t/p/w1280/landscape.jpg'), url);
  assert.equal(originalImageUrl('https://m.media-amazon.com/images/M/example._V1_QL75_UX300_.jpg'), 'https://m.media-amazon.com/images/M/example._V1_.jpg');
  for (const value of ['http://image.tmdb.org/t/p/original/a.jpg', 'https://evil.example/a.jpg', 'https://image.tmdb.org.evil.example/a.jpg', 'https://user:pass@image.tmdb.org/a.jpg', 'https://image.tmdb.org:8443/a.jpg']) assert.equal(originalImageUrl(value), null);
});

test('native raster is fully decoded and receives an independent validation timestamp', async () => {
  const result = await validateHeroImage(url, { now, fetcher: async (requested, options) => {
    assert.equal(requested, url); assert.equal(options.redirect, 'error');
    return new Response(landscape, { headers: { 'content-type': 'image/jpeg' } });
  } });
  assert.deepEqual(result, { url, width: 1920, height: 1080, validatedAt: '2026-11-03T01:00:00.000Z' });
});

test('rejects denial, HTML challenges, byte-budget violations, truncated files and blank placeholders', async () => {
  for (const response of [new Response('', { status: 403 }), new Response('<html>challenge</html>', { headers: { 'content-type': 'text/html' } }),
    new Response(landscape, { headers: { 'content-type': 'image/jpeg', 'content-length': '12000001' } }),
    new Response(landscape.subarray(0, 200), { headers: { 'content-type': 'image/jpeg' } })]) {
    await assert.rejects(validateHeroImage(url, { fetcher: async () => response }));
  }
  const blank = await sharp({ create: { width: 1920, height: 1080, channels: 3, background: '#333' } }).png().toBuffer();
  await assert.rejects(validateHeroImage(url, { fetcher: async () => new Response(blank, { headers: { 'content-type': 'image/png' } }) }), /placeholder/);
});

test('actual dimensions override optimistic upstream metadata', async () => {
  const small = await sharp(landscape).resize(1280).toBuffer();
  await assert.rejects(validateHeroImage(url, { fetcher: async () => new Response(small, { headers: { 'content-type': 'image/jpeg' } }) }), /native high-resolution/);
});

test('local artwork is validated without network access and cannot escape public', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imdb-art-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'public/media'), { recursive: true });
  await writeFile(path.join(root, 'public/media/landscape.jpg'), landscape);
  await writeFile(path.join(root, 'secret.jpg'), landscape);
  const options = { root, now, fetcher: () => { throw new Error('Network should not be used'); } };
  assert.equal((await validateHeroImage('/media/landscape.jpg', options)).width, 1920);
  await assert.rejects(validateHeroImage('/media/../../secret.jpg', options), /outside public/);
});

test('TMDB is optional, IMDb-identity based, media-kind specific and prefers textless high-res backdrops', async () => {
  assert.deepEqual(await tmdbBackdrops(card('tt1234567'), { credentials: {} }), []);
  const requests = [];
  const result = await tmdbBackdrops(card('tt1234567', { type: 'series' }), { credentials: { token: 'test-token' }, fetcher: async (request, options) => {
    requests.push(request.pathname);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.equal(request.searchParams.has('api_key'), false);
    return Response.json(request.pathname.includes('/find/') ? { movie_results: [{ id: 99 }], tv_results: [{ id: 42 }] } : { backdrops: [
      { file_path: '/small.jpg', width: 1280, height: 720 }, { file_path: '/poster.jpg', width: 2160, height: 3840 },
      { file_path: '/english.jpg', width: 3840, height: 2160, iso_639_1: 'en' }, { file_path: '/plain.jpg', width: 1920, height: 1080, iso_639_1: null },
    ] });
  } });
  assert.deepEqual(requests, ['/3/find/tt1234567', '/3/tv/42/images']);
  assert.equal(result.length, 2); assert.equal(result[0].url, 'https://image.tmdb.org/t/p/original/plain.jpg');
  assert.equal(result[0].sourceUrl, 'https://www.themoviedb.org/tv/42');
});

test('saved primary gallery metadata supplies bounded landscape candidates with exact title provenance', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imdb-gallery-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'public/data/titles'), { recursive: true });
  const file = path.join(root, 'public/data/titles/tt1234567.json');
  const images = [{ url, width: 3840, height: 2160, image_id: 'rm1234' }, { url, width: 2000, height: 3000 },
    { url: 'https://mirror.example/a.jpg', width: 3840, height: 2160 }, { url, width: 20000, height: 12000 }];
  await writeFile(file, JSON.stringify({ imdbCode: 'tt1234567', imdbImages: images }));
  assert.deepEqual(await catalogHeroCandidates(card('tt1234567'), { root, dataDir: path.join(root, 'public/data') }), [{ url, provider: 'catalog', sourceUrl: 'https://www.imdb.com/title/tt1234567/mediaviewer/rm1234/' }]);
  await writeFile(file, JSON.stringify({ imdbCode: 'tt9999999', imdbImages: images }));
  assert.deepEqual(await catalogHeroCandidates(card('tt1234567'), { root, dataDir: path.join(root, 'public/data') }), []);
});

test('gallery candidates honor runtime VOD_DATA_DIR instead of the repository public/data tree', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imdb-runtime-gallery-')); const dataDir = path.join(root, 'runtime');
  t.after(() => rm(root, { recursive: true, force: true }));
  const original = process.env.VOD_DATA_DIR; process.env.VOD_DATA_DIR = dataDir;
  t.after(() => { if (original === undefined) delete process.env.VOD_DATA_DIR; else process.env.VOD_DATA_DIR = original; });
  await mkdir(path.join(dataDir, 'titles'), { recursive: true });
  await writeFile(path.join(dataDir, 'titles/tt1234567.json'), JSON.stringify({ imdbCode: 'tt1234567', imdbImages: [{ url, width: 3840, height: 2160, image_id: 'rm1234' }] }));
  assert.equal((await catalogHeroCandidates(card('tt1234567'), { root }))[0].url, url);
  let passedDir;
  await refreshHeroArt(charts(card('tt1234567', { backdropUrl: null })), {}, { root, now, credentials: {},
    gallery: async (_, options) => { passedDir = options.dataDir; return []; } });
  assert.equal(passedDir, dataDir);
});

test('ambiguous TMDB matches are not selected, and authentication errors do not leak keys', async () => {
  assert.deepEqual(await tmdbBackdrops(card('tt1234567'), { credentials: { apiKey: 'test-secret' }, fetcher: async () => Response.json({ movie_results: [{ id: 1 }, { id: 2 }] }) }), []);
  await assert.rejects(tmdbBackdrops(card('tt1234567'), { credentials: { apiKey: 'test-secret' }, fetcher: async () => new Response('test-secret', { status: 401 }) }), error => /HTTP 401/.test(error.message) && !error.message.includes('test-secret'));
  await assert.rejects(tmdbBackdrops(card('tt1234567'), { credentials: { apiKey: 'test-secret' }, fetcher: async () => new Response('test-secret') }), error => !error.message.includes('test-secret'));
});

test('failed revalidation preserves last-good artwork and its true validation date', async () => {
  const result = await refreshHeroArt(charts(card('tt1234567')), { tt1234567: previous }, { now,
    validate: async () => { throw new Error('HTTP 403'); }, lookup: async () => [] });
  assert.deepEqual(result.artwork.tt1234567, previous);
  assert.equal(result.outcomes.tt1234567.state, 'retained');
});

test('a recent validated image is cached without forging a new validation date', async () => {
  const prior = { ...previous, validatedAt: '2026-11-03T00:00:00Z' };
  const result = await refreshHeroArt(charts(card('tt1234567')), { tt1234567: prior }, { now, validate: () => { throw new Error('Unexpected validation'); } });
  assert.deepEqual(result.artwork.tt1234567, prior); assert.equal(result.outcomes.tt1234567.state, 'cached');
});

test('TMDB denial stops further API requests in this run, retaining any prior artwork', async () => {
  let calls = 0;
  const result = await refreshHeroArt(charts(card('tt1234567'), card('tt1234568')), {}, { now,
    validate: async () => { throw new Error('No catalog art'); },
    lookup: async () => { calls++; const error = new Error('TMDB HTTP 429'); error.status = 429; throw error; } });
  assert.equal(calls, 1); assert.deepEqual(result.artwork, {});
});

test('artwork attempt budget alternates chart kinds instead of starving television', async () => {
  const selected = [];
  const snapshot = { ...charts(card('tt1234567'), card('tt1234568')), series: { items: [{ rank: 1, card: card('tt1234569', { type: 'series' }) }] } };
  const result = await refreshHeroArt(snapshot, {}, { now, maxTitles: 2, validate: async value => { selected.push(value); return previous; } });
  assert.deepEqual(Object.keys(result.outcomes), ['tt1234567', 'tt1234569']);
  assert.equal(selected.length, 1, 'Identical image URLs are checked only once per run');
});

test('exhausted time budget defers work without deleting last-good artwork', async () => {
  const result = await refreshHeroArt(charts(card('tt1234567')), { tt1234567: previous }, { now, budgetMs: 0, validate: () => { throw new Error('Unexpected request'); } });
  assert.deepEqual(result.artwork.tt1234567, previous); assert.equal(result.outcomes.tt1234567.state, 'deferred');
});
