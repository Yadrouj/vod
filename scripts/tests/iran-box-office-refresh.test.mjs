import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { refreshIranBoxOffice } from '../refresh-iran-box-office.mjs';
import { completedTehranDays, samfaaReportUrl, reportTotals } from '../lib/iran-box-office.mjs';
import { cinemaTitleKey } from '../lib/cinematicket.mjs';
const now = () => Date.parse('2026-11-03T02:00:00Z');
const periods = completedTehranDays(now());
const film = (id, revenueRial) => ({ id, title: `فیلم ${id}`, posterUrl: null, directors: [], revenueRial, revenueToman: revenueRial / 10, admissions: 1, venueCount: 1, scheduleCount: 1 });
const fetchReport = async ({ day = null, screeningId }) => {
  assert.equal(screeningId, '1405');
  const films = [film('1', day === periods[0].jalaliDate ? 1500 : day ? 1000 : 10000)];
  return { films, totals: reportTotals(films), sourceUrl: samfaaReportUrl({ screeningId, day }), observedAt: new Date(now()).toISOString() };
};
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'iran-box-office-')); const dataDir = path.join(root, 'runtime-data');
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(dataDir, { recursive: true });
  return { root, dataDir, now, file: path.join(dataDir, 'iran-box-office.json'), fetchTickets: async () => ({ prices: new Map(), failures: [] }) };
}

test('first refresh writes real cumulative data and dated comparison in the configured runtime data directory', async t => {
  const options = await fixture(t); const status = await refreshIranBoxOffice({ ...options, fetchReport });
  assert.equal(status.state, 'updated'); assert.equal(status.comparedFilms, 1);
  const data = JSON.parse(await readFile(options.file, 'utf8'));
  assert.equal(data.source.screeningId, '1405'); assert.equal(data.films[0].cumulativeToman, 1000);
  assert.equal(data.comparison.films[0].deltaToman, 50); assert.equal(data.comparison.period.date, '2026-11-02');
  assert.equal(data.films[0].ticketPrice, undefined);
  await assert.rejects(access(path.join(options.dataDir, 'iran-box-office.lock')));
});

test('source failure retains the entire last-good file byte-for-byte and never re-dates it', async t => {
  const options = await fixture(t); await refreshIranBoxOffice({ ...options, fetchReport });
  const before = await readFile(options.file, 'utf8');
  const status = await refreshIranBoxOffice({ ...options, now: () => now() + 86400_000, fetchReport: async () => { throw new Error('HTTP 503'); } });
  assert.equal(status.state, 'retained'); assert.equal(await readFile(options.file, 'utf8'), before);
});

test('daily failure keeps earlier comparison with original dates while cumulative data can refresh', async t => {
  const options = await fixture(t); await refreshIranBoxOffice({ ...options, fetchReport });
  const before = JSON.parse(await readFile(options.file, 'utf8'));
  const status = await refreshIranBoxOffice({ ...options, fetchReport: async args => { if (args.day) throw new Error('Daily blocked'); return fetchReport(args); } });
  const data = JSON.parse(await readFile(options.file, 'utf8'));
  assert.equal(status.daily.state, 'retained'); assert.deepEqual(data.comparison, before.comparison);
});

test('first snapshot and failed exact dates never invent a daily baseline or price', async t => {
  const options = await fixture(t);
  const status = await refreshIranBoxOffice({ ...options, fetchReport: async args => { if (args.day) throw new Error('Unknown period'); return fetchReport(args); } });
  assert.equal(status.daily.state, 'unavailable');
  const data = JSON.parse(await readFile(options.file, 'utf8')); assert.equal(data.comparison, null); assert.equal(data.films[0].ticketPrice, undefined);
});

test('without any prior data, an upstream failure produces no public fake-zero snapshot', async t => {
  const options = await fixture(t);
  const status = await refreshIranBoxOffice({ ...options, fetchReport: async () => { throw new Error('HTTP 403'); } });
  assert.equal(status.state, 'unavailable'); await assert.rejects(access(options.file));
});

test('older observations cannot replace a newer last-good cumulative report', async t => {
  const options = await fixture(t); await refreshIranBoxOffice({ ...options, fetchReport }); const before = await readFile(options.file, 'utf8');
  const status = await refreshIranBoxOffice({ ...options, fetchReport: async args => ({ ...await fetchReport(args), observedAt: '2026-10-01T00:00:00Z' }) });
  assert.equal(status.state, 'retained'); assert.equal(await readFile(options.file, 'utf8'), before);
});

test('dry run does not write a snapshot, and a held lock prevents overlapping refreshes', async t => {
  const options = await fixture(t); await refreshIranBoxOffice({ ...options, fetchReport, dryRun: true });
  await assert.rejects(access(options.file));
  await writeFile(path.join(options.dataDir, 'iran-box-office.lock'), 'existing lock');
  assert.equal((await refreshIranBoxOffice({ ...options, fetchReport })).state, 'skipped');
});

test('box-office jobs record a recoverable PID owner, rather than leaving an anonymous lock after interruption', async t => {
  const options = await fixture(t);
  const status = await refreshIranBoxOffice({ ...options, fetchReport: async args => {
    const owner = JSON.parse(await readFile(path.join(options.dataDir, 'iran-box-office.lock'), 'utf8'));
    assert.equal(owner.pid, process.pid); assert.ok(owner.token);
    return fetchReport(args);
  } });
  assert.equal(status.state, 'updated');
  await assert.rejects(access(path.join(options.dataDir, 'iran-box-office.lock')));
});

test('optional CinemaTicket samples match exact normalized titles and are not preserved after a failed lookup', async t => {
  const options = await fixture(t);
  const price = { minToman: 90000, maxToman: 180000, sampleSessions: 2, sampleCinemas: 1, forDay: '2026-11-03', observedAt: new Date(now()).toISOString(), sourceUrl: 'https://cinematicket.org/movie/detail/9' };
  await refreshIranBoxOffice({ ...options, fetchReport, fetchTickets: async titles => {
    assert.deepEqual(titles, ['فیلم 1']); return { prices: new Map([[cinemaTitleKey('فیلم 1'), price]]), failures: [], checkedAt: price.observedAt };
  } });
  assert.deepEqual(JSON.parse(await readFile(options.file, 'utf8')).films[0].ticketPrice, price);
  const status = await refreshIranBoxOffice({ ...options, fetchReport, fetchTickets: async () => { throw new Error('CinemaTicket HTTP 503'); } });
  assert.equal(status.tickets.state, 'unavailable'); assert.equal(status.tickets.matchedFilms, 0);
  assert.equal(JSON.parse(await readFile(options.file, 'utf8')).films[0].ticketPrice, undefined);
});
