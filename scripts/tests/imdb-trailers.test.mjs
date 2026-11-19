import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { hasPlayableTrailer, imdbTrailerPage, normalizeImdbVideos, parseImdbTitleTrailers, parseImdbVideoPlayback, selectTrailerTargets } from '../../lib/imdb-trailer-data.mjs';
import { refreshImdbTrailers } from '../refresh-imdb-trailers.mjs';

const now = Date.parse('2026-11-19T08:00:00Z');
const card = (n, extra = {}) => ({ imdbCode: `tt${String(n).padStart(7, '0')}`, type: 'movie', title: `Film ${n}`, year: 2026, imdbVotes: 10000 + n, ...extra });
const video = (url = 'https://imdb-video.media-imdb.com/trailer.mp4') => ({ video_id: 'vi123456', name: 'Official Trailer', playback_urls: [{ url }] });
const html = pageProps => `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps } })}</script>`;

test('100 unique recent movies are selected; series, fake IDs and future years excluded', () => {
  const cards = Array.from({ length: 150 }, (_, i) => card(i + 1));
  cards.push(card(1), card(900, { type: 'series' }), card(901, { imdbCode: 'f2my-test' }), card(902, { year: 2027 }));
  const targets = selectTrailerTargets(cards, {}, now);
  assert.equal(targets.length, 100); assert.equal(new Set(targets.map(x => x.imdbCode)).size, 100);
  assert.equal(targets[0].imdbCode, card(150).imdbCode);
  assert.ok(targets.every(x => x.selection === 'recent-catalog-vote-count'));
});
test('only recent IMDb observations supply ranks; old cache is not called a current trend', () => {
  const movie = { sourceUrl: 'https://www.imdb.com/chart/moviemeter/', observedAt: new Date(now).toISOString(), items: [{ rank: 1, card: card(1) }] };
  assert.equal(selectTrailerTargets([card(1), card(2)], { movie }, now)[0].rank, 1);
  movie.observedAt = '2026-09-07T00:00:00Z';
  assert.equal(selectTrailerTargets([card(1), card(2)], { movie }, now)[0].rank, undefined);
});
test('normalize official trailers only, reject foreign assets and unsupported/expired playback', () => {
  assert.equal(normalizeImdbVideos([video(), { ...video(), name: 'Interview' }, { ...video(), video_id: 'bad' }]).length, 1);
  assert.deepEqual(normalizeImdbVideos([video('https://evil.example/t.mp4')])[0].playback_urls, []);
  assert.equal(hasPlayableTrailer(video(), now), true);
  assert.equal(hasPlayableTrailer(video('https://imdb-video.media-imdb.com/t.mp4?Expires=1'), now), false);
  assert.equal(hasPlayableTrailer(video('https://imdb-video.media-imdb.com/t.m3u8'), now), false);
});
test('parse only the requested title and video, not recommendations', () => {
  const id = card(1).imdbCode;
  const node = { id: 'vi123456', name: { value: 'Official Trailer' } };
  assert.equal(parseImdbTitleTrailers(html({ aboveTheFoldData: { id, primaryVideos: { edges: [{ node }] } } }), id)[0].video_id, 'vi123456');
  assert.throws(() => parseImdbTitleTrailers(html({ aboveTheFoldData: { id: card(2).imdbCode } }), id), /different title/);
  const page = html({ videoPlaybackData: { video: { ...node, primaryTitle: { id }, playbackURLs: [{ url: video().playback_urls[0].url }] } } });
  assert.equal(hasPlayableTrailer(parseImdbVideoPlayback(page, video(), id), now), true);
  assert.throws(() => parseImdbVideoPlayback(page, { ...video(), video_id: 'vi999' }, id), /mismatch/);
});
test('stable external fallback survives URL expiry and never accepts arbitrary IDs', () => {
  assert.equal(imdbTrailerPage({ imdbCode: card(1).imdbCode, imdbVideos: [video()] }), 'https://www.imdb.com/video/vi123456/');
  assert.equal(imdbTrailerPage({ imdbCode: card(1).imdbCode }), `https://www.imdb.com/title/${card(1).imdbCode}/videogallery/`);
  assert.equal(imdbTrailerPage({ imdbCode: '../../elsewhere' }), null);
});
test('202 challenge stops requests, preserves existing metadata, reports all 100 targets honestly', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'sarvnema-trailers-'));
  try {
    await mkdir(path.join(dataDir, 'titles'));
    await writeFile(path.join(dataDir, 'vod-index.json'), JSON.stringify({ items: Array.from({ length: 100 }, (_, n) => card(n + 1)) }));
    await writeFile(path.join(dataDir, 'imdb-trailers.json'), JSON.stringify({ version: 1, items: { [card(1).imdbCode]: { videos: [video('https://imdb-video.media-imdb.com/t.mp4?Expires=1')] } } }));
    let requests = 0;
    const result = await refreshImdbTrailers({ dataDir, now: () => now, apiBase: '', fetcher: async () => { requests++; return new Response('', { status: 202 }); } });
    assert.equal(requests, 1); assert.equal(result.selected, 100); assert.equal(result.playable, 0);
    assert.equal(result.state, 'blocked'); assert.equal(result.results.filter(x => x.state === 'not-attempted').length, 99);
    const saved = JSON.parse(await readFile(path.join(dataDir, 'imdb-trailers.json'), 'utf8'));
    assert.equal(saved.items[card(1).imdbCode].videos[0].video_id, 'vi123456');
    assert.equal(saved.report.playable, 0);
  } finally { await rm(dataDir, { recursive: true, force: true }); }
});
test('API health failure falls back once; a failed run does not stamp old trailers fresh', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'sarvnema-trailers-'));
  try {
    await mkdir(path.join(dataDir, 'titles'));
    await writeFile(path.join(dataDir, 'vod-index.json'), JSON.stringify({ items: [card(1)] }));
    const calls = [];
    const result = await refreshImdbTrailers({ dataDir, limit: 1, now: () => now, apiBase: 'https://metadata.example', fetcher: async url => {
      calls.push(url); if (url.endsWith('/health')) throw new Error('offline'); return new Response('', { status: 403 });
    } });
    assert.equal(result.apiAvailable, false); assert.equal(calls.length, 2); assert.equal(result.state, 'blocked');
  } finally { await rm(dataDir, { recursive: true, force: true }); }
});
