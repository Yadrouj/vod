import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchImdbChart, parseImdbChart, matchChartToCatalog } from '../lib/imdb-charts.mjs';
const entries = Array.from({ length: 5 }, (_, i) => ({ position: i + 1, item: { url: `https://www.imdb.com/title/tt123456${i}/`, name: `Title ${i}`, datePublished: '2026-01-01' } }));
const html = `<title>Most popular movies</title><script type="application/ld+json">${JSON.stringify({ '@type': 'ItemList', itemListElement: entries })}</script>`;
test('JSON-LD chart extracts IDs, explicit ranks, years, and media kind', () => {
  const result = parseImdbChart(html, 'movie');
  assert.equal(result.length, 5);
  assert.deepEqual(result[0], { imdbCode: 'tt1234560', title: 'Title 0', year: 2026, rank: 1, kind: 'movie' });
});
test('Next data reads only chart titles and their meter ranks, not related recommendations', () => {
  const chartTitles = { edges: entries.map((entry, i) => ({ node: { id: `tt123456${i}`, titleText: { text: `Title ${i}` }, meterRanking: { currentRank: 5 - i }, releaseYear: { year: 2026 } } })) };
  const result = parseImdbChart(`<title>Most popular TV shows</title><script id="__NEXT_DATA__">${JSON.stringify({ props: { pageProps: { pageData: { chartTitles, unrelated: { id: 'tt9999999' } } } } })}</script>`, 'series');
  assert.equal(result[0].imdbCode, 'tt1234564');
  assert.equal(result[0].rank, 1);
});
test('unrelated pages, incomplete responses, and invalid JSON are not charts', () => {
  assert.throws(() => parseImdbChart('<title>Top 250</title>', 'movie'));
  assert.throws(() => parseImdbChart('<title>Most popular movies</title><script id="__NEXT_DATA__">oops</script>', 'movie'));
  assert.throws(() => parseImdbChart(html.replace('"position":5', '"position":4'), 'movie'));
});
test('202 challenge, 403 denial and empty success cannot replace a last-good snapshot', async () => {
  for (const status of [202, 403]) await assert.rejects(fetchImdbChart('movie', async () => new Response('', { status, headers: { 'Content-Type': 'text/html' } })), new RegExp(`HTTP ${status}`));
  await assert.rejects(fetchImdbChart('movie', async () => new Response('', { headers: { 'Content-Type': 'text/html' } })));
});
test('valid response is bounded and parsed', async () => {
  assert.equal((await fetchImdbChart('movie', async () => new Response(html, { headers: { 'Content-Type': 'text/html' } }))).length, 5);
  await assert.rejects(fetchImdbChart('movie', async () => new Response('x'.repeat(4_000_001), { headers: { 'Content-Type': 'text/html' } })), /budget/);
});
test('catalog matching uses identity or exact title + year + type, never fuzzy remakes', () => {
  const base = { title: 'The Odyssey', year: 2026, type: 'movie', posterUrl: '/poster.jpg' };
  const cards = [{ ...base, imdbCode: 'tt1234567' }, { ...base, type: 'series', year: 1997, imdbCode: 'tt9999999' }];
  const ranked = [{ title: 'The Odyssey', year: 2026, kind: 'movie', rank: 2 }];
  assert.equal(matchChartToCatalog(ranked, cards)[0].card.imdbCode, 'tt1234567');
  assert.equal(matchChartToCatalog(ranked, [...cards, { ...base, imdbCode: 'tt3333333' }]).length, 0);
  assert.equal(matchChartToCatalog([{ ...ranked[0], title: 'Absent' }], cards).length, 0);
});
