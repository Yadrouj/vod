import test from 'node:test';
import assert from 'node:assert/strict';
import { completedTehranDays, samfaaReportUrl, parseSamfaaReport, reportTotals, fetchSamfaaReport, buildDailyComparison, safeSamfaaPoster } from '../lib/iran-box-office.mjs';
const now = () => Date.parse('2026-11-03T02:00:00Z');
const periods = completedTehranDays(now());
const raw = (id = 1, extra = {}) => ({ id, title: `فیلم ${id}`, final_price: 1000, tickets_count: 10, venue_count: 2, schedule_count: 3,
  director: ['کارگردان'], image_url: 'https://samfaa-static.s3.ir-thr-at1.arvanstorage.ir/show/poster.jpg', ...extra });
const report = (rows, day = null) => {
  const films = parseSamfaaReport({ success: true, data: rows }, { allowEmpty: true });
  return { films, totals: reportTotals(films), sourceUrl: samfaaReportUrl({ screeningId: '1405', day }), observedAt: new Date(now()).toISOString() };
};
const cumulative = () => report([raw(1, { final_price: 10000, tickets_count: 100 }), raw(2, { final_price: 20000, tickets_count: 200 })]);
const current = () => report([raw(1, { final_price: 1500 })], periods[0].jalaliDate);
const previous = () => report([raw(1, { final_price: 1000 })], periods[1].jalaliDate);

test('two explicit completed days use Tehran midnight and real Jalali dates', () => {
  assert.deepEqual(periods, [{ date: '2026-11-02', jalaliDate: '1405/08/11' }, { date: '2026-11-01', jalaliDate: '1405/08/10' }]);
  assert.equal(completedTehranDays(Date.parse('2026-11-02T20:29:59Z'))[0].date, '2026-11-01');
  assert.equal(completedTehranDays(Date.parse('2026-11-02T20:30:00Z'))[0].date, '2026-11-02');
});

test('custom request is a same-date Jalali range, all-provinces, season-scoped, never today', () => {
  const url = new URL(samfaaReportUrl({ screeningId: '1405', day: periods[0].jalaliDate }));
  assert.equal(url.searchParams.get('recently'), 'custom');
  assert.equal(url.searchParams.get('from'), '1405/08/11'); assert.equal(url.searchParams.get('to'), '1405/08/11');
  assert.equal(url.searchParams.get('province_id'), ''); assert.equal(url.searchParams.get('screening_id'), '1405');
  assert.throws(() => samfaaReportUrl({ screeningId: '1405', day: '2026-11-02' }), /Jalali/);
});

test('source revenue is rial, converted exactly once without dropping fractional toman', () => {
  const rows = parseSamfaaReport({ success: true, data: [raw(1, { final_price: 105 }), raw(2, { final_price: '2000', tickets_count: '20' })] });
  assert.equal(rows[0].id, '2'); assert.equal(rows[0].revenueToman, 200);
  assert.equal(rows[1].revenueRial, 105); assert.equal(rows[1].revenueToman, 10.5);
  assert.deepEqual(reportTotals(rows), { revenueRial: 2105, revenueToman: 210.5, admissions: 30, films: 2 });
});

test('bad schema, failure flags, duplicates and unsafe or negative numbers reject the entire report', () => {
  for (const payload of [{ success: false, data: [raw()] }, { success: true, data: [] }, { success: true, data: [raw(), raw()] },
    ...[-1, Infinity, Number.MAX_SAFE_INTEGER + 1, null, '', 1.5].map(final_price => ({ success: true, data: [raw(1, { final_price })] })),
    { success: true, data: [raw(1, { tickets_count: 2.5 })] }]) assert.throws(() => parseSamfaaReport(payload));
});

test('poster URLs are primary-source HTTPS assets, not invented posters or arbitrary redirects', () => {
  assert.ok(safeSamfaaPoster(raw().image_url));
  for (const value of ['javascript:alert(1)', 'https://evil.example/poster.jpg', 'http://samfaa.ir/a.jpg', 'https://user:pass@samfaa.ir/a.jpg']) assert.equal(safeSamfaaPoster(value), null);
});

test('HTTP failure, challenge, response budget and malformed JSON never become fresh data', async () => {
  for (const response of [new Response('', { status: 403 }), new Response('challenge', { status: 202 }),
    new Response('<html>', { headers: { 'content-type': 'text/html' } }), new Response('invalid', { headers: { 'content-type': 'application/json' } }),
    new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': '2000001' } }), Response.json({ success: false, data: [] })]) {
    await assert.rejects(fetchSamfaaReport({ screeningId: '1405', now, fetcher: async () => response }));
  }
});

test('successful fetch carries the real request URL and cache-constrained source observation', async () => {
  const result = await fetchSamfaaReport({ screeningId: '1405', now, fetcher: async (_, options) => {
    assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, undefined);
    return Response.json({ success: true, data: [raw()] }, { headers: { age: '3600', date: 'Tue, 03 Nov 2026 01:00:00 GMT' } });
  } });
  assert.equal(result.observedAt, '2026-11-03T01:00:00.000Z'); assert.equal(result.films[0].revenueToman, 100);
});

test('daily delta and percent compare the same film ID over two completed periods, not cumulative totals', () => {
  const result = buildDailyComparison(current(), previous(), cumulative(), periods, now());
  assert.equal(result.films[0].deltaToman, 50); assert.equal(result.films[0].changePercent, 50);
  assert.equal(result.films[0].revenueToman, 150); assert.equal(result.period.date, '2026-11-02');
});

test('negative growth is real, not clamped to zero', () => {
  const down = buildDailyComparison({ ...previous(), sourceUrl: current().sourceUrl }, { ...current(), sourceUrl: previous().sourceUrl }, cumulative(), periods, now());
  assert.equal(down.films[0].deltaToman, -50);
  assert.ok(Math.abs(down.films[0].changePercent + 100 / 3) < .00001);
});

test('zero baseline retains the absolute change while its percentage stays null', () => {
  const before = report([raw(1, { final_price: 0, tickets_count: 0 })], periods[1].jalaliDate);
  const result = buildDailyComparison(current(), before, cumulative(), periods, now());
  assert.equal(result.films[0].deltaToman, 150); assert.equal(result.films[0].changePercent, null);
});

test('missing film in one period is not manufactured as zero, even with the same title', () => {
  const before = report([raw(2, { title: 'فیلم 1', final_price: 500 })], periods[1].jalaliDate);
  const result = buildDailyComparison(current(), before, cumulative(), periods, now());
  assert.deepEqual(result.films, []); assert.equal(result.totals.deltaToman, 100);
});

test('ignored date parameters, wrong dates, partial today and stale observations cannot claim daily growth', () => {
  const all = cumulative(); const first = current(); const before = previous();
  assert.throws(() => buildDailyComparison(first, { ...first, sourceUrl: before.sourceUrl }, all, periods, now()), /indistinguishable/);
  assert.throws(() => buildDailyComparison({ ...all, sourceUrl: first.sourceUrl }, before, all, periods, now()), /indistinguishable/);
  assert.throws(() => buildDailyComparison({ ...first, sourceUrl: first.sourceUrl.replace('custom', 'today') }, before, all, periods, now()), /Non-comparable/);
  assert.throws(() => buildDailyComparison(first, before, all, [{ date: '2026-11-03', jalaliDate: '1405/08/12' }, periods[0]], now()), /completed/);
  assert.throws(() => buildDailyComparison({ ...first, observedAt: '2026-11-02T10:00:00Z' }, before, all, periods, now()), /predates/);
});
