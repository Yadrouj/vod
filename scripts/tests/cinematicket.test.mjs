import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCinemaTicketPrices, fetchCinemaTicketPrices, cinemaTitleKey } from '../lib/cinematicket.mjs';
const now = Date.parse('2026-11-03T07:00:00Z');
function fixture() { return { movie: { id: 9 }, cinemas: [{ date: '2026-11-03', cinemas: [{ cinema: { id: 1 }, halls: { a: { sessions: [
  { id: 1, start_at: '2026-11-03T15:00:00+03:30', can_order: true, min_price: 600000, max_price: 1800000 },
  { id: 2, start_at: '2026-11-03T06:00:00+03:30', can_order: true, min_price: 100000, max_price: 100000 },
  { id: 3, start_at: '2026-11-03T20:00:00+03:30', can_order: false, min_price: 1000, max_price: 1000 },
] } } }] }] }; }
test('prices are future purchasable same-day session samples, converted from rial to toman', () => {
  const result = parseCinemaTicketPrices(fixture(), 9, now);
  assert.equal(result.minToman, 60000); assert.equal(result.maxToman, 180000);
  assert.equal(result.sampleSessions, 1); assert.equal(result.sampleCinemas, 1);
  assert.equal(result.forDay, '2026-11-03'); assert.match(result.sourceUrl, /movie\/detail\/9$/);
  assert.equal(parseCinemaTicketPrices(fixture(), 99, now), null);
  assert.equal(parseCinemaTicketPrices(fixture(), 9, now + 86400000), null);
});
test('invalid or duplicate session prices do not contaminate the range', () => {
  const data = fixture(); const sessions = data.cinemas[0].cinemas[0].halls.a.sessions;
  sessions.push({ ...sessions[0], min_price: 1, max_price: 1 });
  sessions.push({ ...sessions[0], id: 7, min_price: '600000' });
  sessions.push({ ...sessions[0], id: 8, max_price: -1 });
  assert.equal(parseCinemaTicketPrices(data, 9, now).minToman, 60000);
});
test('title normalization and exact-only attribution; endpoints use current Persian release year', async () => {
  assert.equal(cinemaTitleKey('زنده‌شور'), cinemaTitleKey('زنده شور'));
  const urls = [];
  const result = await fetchCinemaTicketPrices(['فیلم', 'فیلم دیگر'], { now, fetcher: async url => {
    urls.push(url); return new Response(JSON.stringify(url.includes('new-boxoffice') ? { results: [{ id: 9, name: 'فیلم' }] } : fixture()), { headers: { 'content-type': 'application/json' } });
  } });
  assert.match(urls[0], /release_year=1405/); assert.equal(urls.length, 2);
  assert.equal(result.prices.size, 1);
});
