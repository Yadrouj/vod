import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogFacets, facetLabel, facetOptions, facetValue, facetValues, matchesFacet, normalizeCardFacets } from '../../lib/catalog-facets.mjs';
import { browseVodIndex } from '../../lib/vod-index';
import { botFilterFacets, parseBotSearchParams, searchBotItems } from '../../lib/bot-catalog';
import { buildOldIranianVodIndex } from '../build-vod-old-iranian-index.mjs';
import type { VodCard, VodCatalogIndex } from '../../lib/types';

const card = (id: string, fields: Partial<VodCard> = {}): VodCard => ({
  id, imdbCode: id, title: id, type: 'movie', year: 2025, imdbRating: 8, imdbVotes: 100,
  genres: [], countries: [], languages: [], qualities: ['1080p'], groups: [], linksCount: 1,
  posterUrl: null, backdropUrl: null, runtimeMinutes: null, overview: null, ...fields,
});
const mixed = [
  card('english', { genres: ['Drama'], countries: ['United States'], languages: ['English'] }),
  card('persian', { genres: ['درام'], countries: ['آمریکا', '2024'], languages: ['انگلیسی'] }),
  card('both', { genres: ['Drama', 'درام'], countries: ['USA', 'آمریکا'], languages: ['English', 'انگلیسی'] }),
  card('local', { genres: ['Comedy'], countries: ['Iran'], languages: ['Persian'] }),
];

test('genre, country and language aliases have one canonical option and locale-specific label', () => {
  assert.deepEqual(facetOptions('genre', ['Drama', 'درام', 'درام', 'Comedy', 'طنز'], 'fa'), [
    { value: 'Drama', label: 'درام' }, { value: 'Comedy', label: 'کمدی' },
  ]);
  assert.deepEqual(facetOptions('country', ['آمریکا', 'USA', 'United States'], 'en'), [{ value: 'United States', label: 'United States' }]);
  assert.deepEqual(facetValues('language', ['English', 'انگلیسی', 'en']), ['English']);
  assert.equal(facetLabel('country', 'United States', 'fa'), 'آمریکا');
  assert.equal(facetValue('genre', 'هيجان‌انگيز'), 'Thriller');
});

test('country menus reject years, genre labels, URLs and placeholders rather than guessing', () => {
  assert.deepEqual(facetValues('country', ['2024', '۲۰۲۶', '2014', 'اجتماعی', 'Drama', 'Unknown', 'https://example.test', 'https://us', 'ایران']), ['Iran']);
  assert.deepEqual(facetValues('genre', ['فیلم', 'دانلود', 'فیلم ایرانی', 'بهترین فیلم و سریال های 2026', 'علی انصاریان', 'مستند']), ['Documentary']);
  assert.deepEqual(facetValues('language', ['کانادا', 'کانادایی', 'سوئیس', 'English']), ['English']);
});

test('common spelling variants merge but distinct countries/languages are preserved', () => {
  assert.deepEqual(facetValues('country', ['Turkey', 'Türkiye', 'ترکیه', 'TR']), ['Turkey']);
  assert.deepEqual(facetValues('country', ['جمهوری چک', 'Czech Republic', 'Czechia']), ['Czech Republic']);
  assert.deepEqual(facetValues('country', ['Soviet Union', 'Russia', 'West Germany', 'Germany']), ['Soviet Union', 'Russia', 'West Germany', 'Germany']);
  assert.deepEqual(facetValues('language', ['Chinese', 'Mandarin', 'Cantonese', 'Malay', 'Malayalam']), ['Chinese', 'Mandarin', 'Cantonese', 'Malay', 'Malayalam']);
  assert.deepEqual(facetValues('language', ['فیلیپینی', 'تاگالوگ']), ['Filipino', 'Tagalog']);
  assert.equal(new Set(facetOptions('language', ['Chinese', 'Mandarin', 'Filipino', 'Tagalog'], 'fa').map(o => o.label)).size, 4);
  assert.equal(facetValue('language', 'تامیل'), 'Tamil');
  assert.equal(facetValue('language', 'Bengali'), 'Bengali');
});

test('compound tags split without breaking a real language containing a comma', () => {
  assert.deepEqual(facetValues('genre', ['کمدی، خانوادگی', 'Action/Adventure', 'action comedy film']), ['Comedy', 'Family', 'Action', 'Adventure']);
  assert.deepEqual(facetValues('language', ['Greek, Ancient (to 1453)']), ['Greek, Ancient (to 1453)']);
  assert.equal(matchesFacet('genre', ['کمدی، خانوادگی'], 'Family'), true);
});

test('normalization includes Persian-only metadata, is idempotent, and leaves source records intact', () => {
  const source = card('source', { countries: ['2026', 'اجتماعی'], persianCountries: ['ایران'], persianGenres: ['درام'], persianLanguages: ['فارسی'] });
  const before = structuredClone(source);
  const normalized = normalizeCardFacets(source);
  assert.deepEqual(source, before);
  assert.deepEqual(normalized.countries, ['Iran']);
  assert.deepEqual(normalizeCardFacets(normalized), normalized);
  assert.deepEqual(catalogFacets(mixed.map(normalizeCardFacets)), { genres: ['Comedy', 'Drama'], countries: ['Iran', 'United States'], languages: ['English', 'Persian'] });
});

test('old Persian/English filter URLs both match all corresponding sources, not only one spelling', () => {
  const index = { items: mixed } as VodCatalogIndex;
  for (const params of [
    { genre: 'Drama', country: 'United States', language: 'English' },
    { genre: 'درام', country: 'آمریکا', language: 'انگلیسی' },
  ]) {
    assert.equal(browseVodIndex(index, params).total, 3);
    const bot = searchBotItems(mixed, parseBotSearchParams(new URLSearchParams(params)), 'https://sarvnema.ir');
    assert.equal(bot.pagination.total, 3);
  }
  assert.equal(browseVodIndex(index, { country: '2024' }).total, 0);
});

test('bot facets merge aliases, count a title only once, and do not list years as countries', () => {
  const facets = botFilterFacets(mixed, parseBotSearchParams(new URLSearchParams()));
  assert.deepEqual(facets.countries.map(o => [o.value, o.count]), [['United States', 3], ['Iran', 1]]);
  assert.deepEqual(facets.genres.map(o => [o.value, o.count]), [['Drama', 3], ['Comedy', 1]]);
  assert.deepEqual(facets.languages.map(o => [o.value, o.count]), [['English', 3], ['Persian', 1]]);
});

test('nightly classic-index builder uses the same canonical facets', () => {
  const items = mixed.map(item => ({ ...item, source: 'old-iranian-archive' }));
  const result = buildOldIranianVodIndex({ items });
  assert.deepEqual(result.filters.countries, ['Iran', 'United States']);
  assert.deepEqual(result.items.find((item: VodCard) => item.id === 'persian')?.countries, ['United States']);
});
