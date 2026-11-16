import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveVodDownload, rotatingDownloadKey } from '../../lib/vod-download-resolution';
import { downloadGateUrl, decodeCompact } from '../../lib/download-gate';
import { downloadResponseHeaders, downloadResponseLifetime } from '../../lib/download-cache';
import type { VodCard, VodItem, VodLink } from '../../lib/types';

const now = Date.parse('2026-11-16T13:00:00Z');
const path = 'https://sn2.zxupload6137hgv.fun/dl5/Series5/1404/m01/MobLand/S02/Farsi.Dubbed/720p/MobLand.S02E07.720p.WEB-DL.x264-Pahe.Farsi.Dubbed.AvaMovie.mkv';
const old = `${path}?md5=old&u=270572&expires=1794825945`;
const fresh = `${path}?md5=new&u=270572&expires=${Math.floor(now / 1000) + 4 * 3600}`;
const card = { id: 'tt31510819', imdbCode: 'tt31510819', title: 'MobLand', year: 2025, type: 'series' } as VodCard;
const link = (url = fresh, changes = {}) => ({ url, sourceProvider: 'familymovie', mediaKind: 'video', season: 2, episode: 7, quality: '720p', group: 'Dubbed', ...changes }) as VodLink;
const item = (links = [link()]) => ({ ...card, imdbUrl: null, type: 'tvSeries', links }) as VodItem;

test('the old compact MobLand bot link resolves to the exact fresh dubbed 720p S02E07 file', async () => {
  let lookups = 0;
  const gate = new URL(downloadGateUrl({ url: old, title: 'MobLand · S02E07', quality: '720p', compact: true }), 'https://sarvnema.ir');
  assert.equal(decodeCompact(gate.searchParams.get('u')!), old);
  const result = await resolveVodDownload({ url: old, title: gate.searchParams.get('title')! }, {
    now, loadCards: async () => [card], findItem: async id => { lookups++; assert.equal(id, card.imdbCode); return item(); },
  });
  assert.deepEqual(result, { status: 'ready', url: fresh, refreshed: true, itemId: card.imdbCode });
  assert.equal(lookups, 1);
  assert.equal(new URL(fresh).searchParams.get('md5'), 'new');
});

test('future site/bot/history gates carry stable title context, without needing a catalogue search', async () => {
  const gate = new URL(downloadGateUrl({ url: old, itemId: card.imdbCode, compact: true }), 'https://sarvnema.ir');
  assert.equal(gate.searchParams.get('itemId'), card.imdbCode);
  const result = await resolveVodDownload({ url: old, itemId: gate.searchParams.get('itemId')! }, {
    now, loadCards: async () => { throw Error('unnecessary index load'); }, findItem: async () => item(),
  });
  assert.equal(result.status, 'ready');
});

test('exact file matching never substitutes another episode, quality, language, host, user or provider', async () => {
  for (const replacement of [
    link(fresh.replace('S02E07', 'S02E08')), link(fresh.replaceAll('720p', '1080p')),
    link(fresh.replaceAll('Farsi.Dubbed', 'SoftSub')), link(fresh.replace('sn2.', 'sn3.')),
    link(fresh.replace('u=270572', 'u=9')), link(fresh, { sourceProvider: 'other' }),
    link(fresh, { mediaKind: 'trailer' }), link(old),
  ]) {
    const result = await resolveVodDownload({ url: old, itemId: card.imdbCode }, {
      now, loadCards: async () => [card], findItem: async () => item([replacement]),
    });
    assert.deepEqual(result, { status: 'unavailable', itemId: card.imdbCode });
  }
  assert.notEqual(rotatingDownloadKey(`${old}&opaque=one`), rotatingDownloadKey(`${fresh}&opaque=two`));
  assert.equal(rotatingDownloadKey(old), rotatingDownloadKey(fresh));
});

test('unsigned music and fresh files stay untouched and never trigger catalogue or arbitrary media fetches', async () => {
  for (const url of [fresh, 'https://music.sarvnema.ir/ABBA/Song.mp3']) {
    const result = await resolveVodDownload({ url }, { now,
      loadCards: async () => { throw Error('unexpected cards'); }, findItem: async () => { throw Error('unexpected publisher'); },
    });
    assert.deepEqual(result, { status: 'ready', url, refreshed: false });
  }
});

test('missing or ambiguous legacy titles cannot become a guessed movie download', async () => {
  for (const cards of [[], [card, { ...card, imdbCode: 'another-series', id: 'another-series' }]]) {
    const result = await resolveVodDownload({ url: old, title: 'MobLand · S02E07' }, {
      now, loadCards: async () => cards, findItem: async () => { throw Error('ambiguous request must not refresh'); },
    });
    assert.deepEqual(result, { status: 'unavailable' });
  }
});

test('remakes use the exact filename year, and legacy downloads without a title can use an exact filename', async () => {
  const filmUrl = `https://cdn.example.org/East.of.Eden.1955.720p.mp4?expires=1&md5=old`;
  const film = { ...card, title: 'East of Eden', year: 1955, imdbCode: 'tt0048028', type: 'movie' } as VodCard;
  const result = await resolveVodDownload({ url: filmUrl }, { now,
    loadCards: async () => [film, { ...film, year: 2026, type: 'series', imdbCode: 'new-series' }],
    findItem: async id => { assert.equal(id, film.imdbCode); return { ...film, links: [link(filmUrl.replace('expires=1&md5=old', `expires=${Math.floor(now / 1000) + 7200}&md5=new`))] } as unknown as VodItem; },
  });
  assert.equal(result.status, 'ready');
});

test('takedowns remain enforced even when the caller hides the title in an opaque media filename', async () => {
  const restricted = { ...card, title: 'Paris Has Fallen', imdbCode: 'tt33184638' } as VodCard;
  const result = await resolveVodDownload({ url: old, title: restricted.title }, {
    now, loadCards: async () => [restricted], findItem: async () => { throw Error('no publisher access'); },
  });
  assert.deepEqual(result, { status: 'restricted' });
  const hidden = await resolveVodDownload({ url: old, title: 'MobLand' }, {
    now, loadCards: async () => [card], findItem: async () => ({ ...item(), title: restricted.title }),
  });
  assert.equal(hidden.status, 'restricted');
});

test('signed download API caches expire ahead of source tokens and never serve stale links for a day', () => {
  const policy = downloadResponseLifetime([link(fresh)], now);
  assert.deepEqual(policy, { signed: true, ttlMs: 300_000 });
  const short = downloadResponseLifetime([link(`${path}?expires=${Math.floor(now / 1000) + 100}`)], now);
  assert.deepEqual(short, { signed: true, ttlMs: 40_000 });
  const headers = downloadResponseHeaders({ signed: true, expiresAt: now + short.ttlMs }, now + 10_000);
  assert.match(headers['Cache-Control'], /s-maxage=30, stale-while-revalidate=0/);
  assert.deepEqual(downloadResponseLifetime([link(path)], now), { signed: false, ttlMs: 900_000 });
});
