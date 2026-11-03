import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { selectIranBoxOffice, loadIranBoxOffice, validTicketPrice, type IranBoxOfficeSnapshot, type CinemaTicketPrice } from '../../lib/iran-box-office';

const now = Date.parse('2026-11-03T10:00:00Z');
const reportUrl = 'https://api.samfaa.ir/admin/report/recent_shows?recently=all&province_id=&screening_id=1405&from=&to=';
const dayUrl = (day: string) => reportUrl.replace('recently=all', 'recently=custom').replace('from=&to=', `from=1405%2F08%2F${day}&to=1405%2F08%2F${day}`);
const price: CinemaTicketPrice = { minToman: 90000, maxToman: 180000, sampleSessions: 4, sampleCinemas: 2, forDay: '2026-11-03', observedAt: '2026-11-03T09:00:00Z', sourceUrl: 'https://cinematicket.org/movie/detail/9499' };
function fixture(): IranBoxOfficeSnapshot {
  return { version: 1, observedAt: '2026-11-03T09:00:00Z', fetchedAt: '2026-11-03T09:00:00Z',
    source: { name: 'سمفا', url: 'https://samfaa.ir/', reportUrl, frontendUrl: 'https://samfaa.ir/js/app.4c7a653c.js', screeningId: '1405', timezone: 'Asia/Tehran', currency: 'IRR', displayCurrency: 'IRT', scope: 'all-provinces' },
    totals: { cumulativeToman: 1000, admissions: 100, films: 1 }, films: [{ id: '1', title: 'فیلم', rank: 1, posterUrl: 'https://samfaa.ir/poster.jpg', directors: ['کارگردان'], cumulativeRial: 10000, cumulativeToman: 1000, admissions: 100, venueCount: 2, scheduleCount: 20, ticketPrice: price }],
    dailyStatus: { state: 'updated' }, comparison: { observedAt: '2026-11-03T09:00:00Z', period: { date: '2026-11-02', jalaliDate: '1405/08/11' }, previousPeriod: { date: '2026-11-01', jalaliDate: '1405/08/10' },
      sourceUrls: [dayUrl('11'), dayUrl('10')], verification: { method: 'distinct-explicit-jalali-single-day-requests', timezone: 'Asia/Tehran', frontendUrl: 'https://samfaa.ir/js/app.4c7a653c.js' },
      totals: { revenueToman: 150, previousRevenueToman: 100, deltaToman: 50, changePercent: 50, admissions: 15, previousAdmissions: 10 },
      films: [{ id: '1', revenueToman: 150, previousRevenueToman: 100, deltaToman: 50, changePercent: 50, admissions: 15, previousAdmissions: 10 }] } };
}

test('fresh, stale and 14-day-expired states use source observation, never file mtime or fetchedAt', () => {
  const data = fixture(); assert.equal(selectIranBoxOffice(data, now)?.freshness, 'fresh');
  data.observedAt = '2026-11-01T00:00:00Z'; assert.equal(selectIranBoxOffice(data, now)?.freshness, 'stale');
  data.observedAt = '2026-10-01T00:00:00Z'; assert.equal(selectIranBoxOffice(data, now)?.freshness, 'expired');
  data.fetchedAt = new Date(now).toISOString(); assert.equal(selectIranBoxOffice(data, now)?.freshness, 'expired');
});

test('unsafe snapshots, unit mismatches, duplicate film identities and future observations are rejected', () => {
  for (const mutate of [(data: IranBoxOfficeSnapshot) => { data.observedAt = '2027-01-01T00:00:00Z'; },
    (data: IranBoxOfficeSnapshot) => { data.films[0].cumulativeToman = 10000; },
    (data: IranBoxOfficeSnapshot) => { data.films.push({ ...data.films[0] }); },
    (data: IranBoxOfficeSnapshot) => { data.source.reportUrl = 'https://evil.example'; }]) {
    const data = fixture(); mutate(data); assert.equal(selectIranBoxOffice(data, now), null);
  }
  assert.equal(selectIranBoxOffice(null, now), null);
});

test('tampered growth or partial-today comparisons do not hide the valid cumulative chart', () => {
  const data = fixture(); data.comparison!.films[0].changePercent = 999;
  assert.equal(selectIranBoxOffice(data, now)?.comparison, null); assert.equal(selectIranBoxOffice(data, now)?.films.length, 1);
  const partial = fixture(); partial.comparison!.period.date = '2026-11-03';
  assert.equal(selectIranBoxOffice(partial, now)?.comparison, null);
});

test('ticket samples are same-day only, source-attributed, bounded and never inferred from box-office averages', () => {
  assert.equal(validTicketPrice(price, now), true);
  assert.equal(validTicketPrice(price, Date.parse('2026-11-03T20:30:00Z')), false, 'Tehran midnight expires yesterday\'s sample');
  for (const extra of [{ sampleSessions: 0 }, { minToman: 200000 }, { sourceUrl: 'https://evil.example' }, { forDay: '2026-11-02' }]) assert.equal(validTicketPrice({ ...price, ...extra }, now), false);
  const data = selectIranBoxOffice(fixture(), Date.parse('2026-11-03T20:30:00Z'));
  assert.equal(data?.films[0].ticketPrice, undefined); assert.equal(data?.films[0].admissions, 100);
});

test('runtime VOD_DATA_DIR is honored and read failures keep a valid prior snapshot without re-dating it', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'box-office-loader-')); t.after(() => rm(root, { recursive: true, force: true }));
  const original = process.env.VOD_DATA_DIR; process.env.VOD_DATA_DIR = root;
  t.after(() => { if (original === undefined) delete process.env.VOD_DATA_DIR; else process.env.VOD_DATA_DIR = original; });
  const file = path.join(root, 'iran-box-office.json'); await writeFile(file, JSON.stringify(fixture()));
  assert.equal((await loadIranBoxOffice({ now }))?.films[0].title, 'فیلم');
  await writeFile(file, '{broken');
  assert.equal((await loadIranBoxOffice({ now }))?.observedAt, fixture().observedAt);
  assert.equal((await loadIranBoxOffice({ now: now + 20 * 86400_000 }))?.freshness, 'expired');
});

test('magazine box-office slot precedes editorial articles and is independent from the news slot', async () => {
  const source = await readFile(path.join(process.cwd(), 'components/magazine-collection.tsx'), 'utf8');
  assert.ok(source.indexOf('{boxOffice}') < source.indexOf('{featured ?'));
  assert.ok(source.indexOf('{boxOffice}') < source.indexOf('{news}'));
  const component = await readFile(path.join(process.cwd(), 'components/iran-box-office.tsx'), 'utf8');
  assert.equal(/from ['"][^'"]*news/.test(component), false);
});
