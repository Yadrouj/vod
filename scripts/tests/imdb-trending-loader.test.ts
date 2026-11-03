import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, utimes, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadImdbTrending, loadHeroArtwork } from '../../lib/imdb-trending';

test('IMDb chart/art loaders honor runtime VOD_DATA_DIR and never cross-contaminate caches between directories', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imdb-loader-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const original = process.env.VOD_DATA_DIR;
  t.after(() => { if (original === undefined) delete process.env.VOD_DATA_DIR; else process.env.VOD_DATA_DIR = original; });
  const stamp = new Date(Date.now() - 1000); const observedAt = stamp.toISOString();
  for (const name of ['first', 'second']) {
    const dir = path.join(root, name); await mkdir(dir);
    const card = { id: 'tt1234567', imdbCode: 'tt1234567', title: name, year: 2026, type: 'movie', posterUrl: '/poster.jpg', backdropUrl: '/backdrop.jpg' };
    const chart = { version: 1, charts: { movie: { observedAt, sourceUrl: 'https://www.imdb.com/chart/moviemeter/', capture: 'direct', items: [{ rank: 1, card }] } } };
    const artwork = { version: 1, artwork: { tt1234567: { url: `https://image.tmdb.org/t/p/original/${name}.jpg`, width: 3840, height: 2160, provider: 'catalog', sourceUrl: 'https://www.imdb.com/title/tt1234567/', validatedAt: observedAt } } };
    for (const [filename, payload] of [['imdb-trending.json', chart], ['imdb-hero-art.json', artwork]] as const) {
      const file = path.join(dir, filename); await writeFile(file, JSON.stringify(payload)); await utimes(file, stamp, stamp);
    }
    process.env.VOD_DATA_DIR = dir;
    const titles = await loadImdbTrending();
    assert.equal(titles.length, 1); assert.equal(titles[0].title, name);
    assert.equal(titles[0].heroArt?.url, `https://image.tmdb.org/t/p/original/${name}.jpg`);
  }
  process.env.VOD_DATA_DIR = path.join(root, 'missing');
  assert.deepEqual(await loadImdbTrending(), []);
  assert.deepEqual(await loadHeroArtwork(), {});
});

test('validated artwork loads independently when an old or absent chart cannot supply current trends', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'hero-art-loader-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const original = process.env.VOD_DATA_DIR;
  process.env.VOD_DATA_DIR = root;
  t.after(() => { if (original === undefined) delete process.env.VOD_DATA_DIR; else process.env.VOD_DATA_DIR = original; });
  const art = { url: 'https://image.tmdb.org/t/p/original/fallback.jpg', width: 3840, height: 2160, validatedAt: '2026-11-03T00:00:00Z', provider: 'catalog', sourceUrl: 'https://www.imdb.com/title/tt1234567/' };
  await writeFile(path.join(root, 'imdb-hero-art.json'), JSON.stringify({ version: 1, artwork: { tt1234567: art, bad: { ...art, width: 400 } } }));
  assert.deepEqual(await loadImdbTrending(), []);
  const artwork = await loadHeroArtwork();
  assert.deepEqual(Object.keys(artwork), ['tt1234567']);
  assert.equal(artwork.tt1234567.url, art.url);
  assert.equal('popularity' in artwork.tt1234567, false);
});
