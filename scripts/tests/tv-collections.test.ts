import assert from 'node:assert/strict';
import test from 'node:test';
import type { VodCard } from '../../lib/types';
import { TV_COLLECTIONS, selectTVCollection, tvCollectionPage } from '../../lib/tv-collections';

const card = (id: string, extra: Partial<VodCard> = {}): VodCard => ({
  id, imdbCode: id, title: id, type: 'movie', year: 2026, imdbRating: 7, imdbVotes: 100,
  genres: [], countries: [], languages: [], posterUrl: null, backdropUrl: null, runtimeMinutes: 100,
  overview: null, qualities: ['1080p'], groups: ['SoftSub'], linksCount: 1, ...extra,
});

test('TV includes latest films/series, new dubs and separate country collections', () => {
  for (const id of ['latest-series', 'latest-films', 'new-dubbed', 'turkish-films', 'turkish-series', 'indian-films', 'iranian-films', 'iranian-series', 'korean-series', 'animation', 'anime', 'documentaries']) assert.ok(TV_COLLECTIONS.some(c => c.id === id));
  assert.equal(new Set(TV_COLLECTIONS.map(c => c.id)).size, TV_COLLECTIONS.length);
});

test('country collections accept canonical aliases but never infer a country from a title or dubbing', () => {
  const items = [card('tr', { countries: ['Türkiye'] }), card('tr-series', { countries: ['Turkey'], type: 'series' }), card('ir', { countries: ['ایران'] }), card('in', { countries: ['India'] }), card('not-tr', { title: 'Turkey Shoot', countries: ['Australia'] }), card('not-ir', { languages: ['Persian'], groups: ['Dubbed'], countries: ['United States'] })];
  assert.deepEqual(selectTVCollection(items, 'turkish-films').map(x => x.id), ['tr']);
  assert.deepEqual(selectTVCollection(items, 'turkish-series').map(x => x.id), ['tr-series']);
  assert.deepEqual(selectTVCollection(items, 'iranian-films').map(x => x.id), ['ir']);
  assert.deepEqual(selectTVCollection(items, 'indian-films').map(x => x.id), ['in']);
});

test('latest releases sort by release year, whereas IMDb collections sort by rating; source data is not mutated', () => {
  const items = [card('old', { year: 1994, imdbRating: 9.5 }), card('new', { year: 2026, imdbRating: 6.5 }), card('series', { type: 'series' })];
  assert.deepEqual(selectTVCollection(items, 'latest-films').map(x => x.id), ['new', 'old']);
  assert.deepEqual(selectTVCollection(items, 'best-films').map(x => x.id), ['old', 'new']);
  assert.deepEqual(items.map(x => x.id), ['old', 'new', 'series']);
});

test('dubbed rail excludes trailers, zero-link releases and copyrighted takedowns', () => {
  const items = [card('dub', { groups: ['Farsi.Dubbed'] }), card('soft'), card('preview', { groups: ['Dubbed'], fullLengthLinksCount: 0 }), card('tt33184638', { groups: ['Dubbed'] })];
  assert.deepEqual(selectTVCollection(items, 'new-dubbed').map(x => x.id), ['dub']);
});

test('anime does not mislabel all animation and unique provider IDs do not collapse', () => {
  const items = [card('jp', { countries: ['Japan'], genres: ['Animation'] }), card('anime', { genres: ['Anime'] }), card('us', { genres: ['Animation'], countries: ['United States'] }), card('a', { imdbCode: '' }), card('b', { imdbCode: '' })];
  assert.deepEqual(new Set(selectTVCollection(items, 'anime').map(x => x.id)), new Set(['jp', 'anime']));
  assert.equal(selectTVCollection(items, 'latest-films').length, 5);
});

test('view all traverses the full collection with bounded stable 24-title pages', () => {
  const items = Array.from({ length: 70 }, (_, i) => card(`id-${i}`));
  const first = tvCollectionPage(items, 'latest-films'), second = tvCollectionPage(items, 'latest-films', '2');
  assert.equal(first.total, 70); assert.equal(first.items.length, 24); assert.equal(first.totalPages, 3);
  assert.ok(second.items.every(x => !first.items.some(y => x.id === y.id)));
  assert.equal(tvCollectionPage(items, 'latest-films', '999999').page, 3);
  for (const value of ['-1', 'NaN', '<script>', '1e99']) assert.equal(tvCollectionPage(items, 'latest-films', value).page, 1);
  assert.deepEqual(selectTVCollection(items, '../arbitrary'), []);
});
