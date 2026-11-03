import { mkdir, readFile, open, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SAMFAA_SITE, SAMFAA_FRONTEND, TEHRAN_ZONE, completedTehranDays, fetchSamfaaReport, buildDailyComparison } from './lib/iran-box-office.mjs';
import { fetchCinemaTicketPrices, cinemaTitleKey } from './lib/cinematicket.mjs';
import { acquireWorkerLock, runWorkerCli } from './lib/worker-lock.mjs';

async function readJson(file) { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; } }
async function atomicJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`; const handle = await open(temporary, 'wx');
  try {
    try { await handle.writeFile(`${JSON.stringify(value)}\n`); await handle.sync(); } finally { await handle.close(); }
    await rename(temporary, file);
  } finally { await unlink(temporary).catch(() => {}); }
}

export async function refreshIranBoxOffice({ root = process.cwd(), dataDir = process.env.VOD_DATA_DIR || path.join(root, 'public/data'),
  now = Date.now, fetchReport = fetchSamfaaReport, fetchTickets = fetchCinemaTicketPrices, dryRun = false, screeningId, tickets = true } = {}) {
  const periods = completedTehranDays(now());
  const season = String(screeningId ?? new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { timeZone: TEHRAN_ZONE, year: 'numeric' }).formatToParts(now()).find(part => part.type === 'year')?.value);
  const file = path.join(dataDir, 'iran-box-office.json'); const lockFile = path.join(dataDir, 'iran-box-office.lock');
  const lock = await acquireWorkerLock(lockFile);
  if (!lock) return { state: 'skipped', reason: 'Box-office refresh already running or unverifiable lock' };
  try {
    const prior = await readJson(file); let cumulative;
    try {
      cumulative = await fetchReport({ screeningId: season, now });
      if (Date.parse(cumulative.observedAt) > now() || !Number.isFinite(Date.parse(cumulative.observedAt))) throw new Error('Invalid source observation');
      if (prior?.source?.screeningId === season && Date.parse(cumulative.observedAt) < Date.parse(prior.observedAt)) throw new Error('Older source observation; last-good report retained');
    } catch (error) { return { state: prior ? 'retained' : 'unavailable', attemptedAt: new Date(now()).toISOString(), error: error.message }; }
    let comparison = prior?.source?.screeningId === season ? prior.comparison ?? null : null;
    let daily;
    try {
      // The public frontend uses Jalali YYYY/MM/DD values for custom periods.
      // Never use `today` against a completed day or infer growth from two
      // cumulative snapshots taken at arbitrary hours.
      const current = await fetchReport({ screeningId: season, day: periods[0].jalaliDate, now });
      const previous = await fetchReport({ screeningId: season, day: periods[1].jalaliDate, now });
      comparison = buildDailyComparison(current, previous, cumulative, periods, now());
      daily = { state: 'updated' };
    } catch (error) { daily = { state: comparison ? 'retained' : 'unavailable', reason: error.message }; }
    let prices = new Map(); let ticketStatus = { state: 'disabled', failures: [] };
    if (tickets) {
      try {
        const result = await fetchTickets(cumulative.films.map(film => film.title), { now: now() });
        prices = result.prices;
        ticketStatus = { state: result.failures?.length ? 'partial' : 'updated', failures: result.failures ?? [], checkedAt: result.checkedAt, sourceUrl: result.sourceUrl };
      } catch (error) { ticketStatus = { state: 'unavailable', failures: [{ error: error.message }] }; }
    }
    const titleCounts = new Map();
    for (const film of cumulative.films) { const key = cinemaTitleKey(film.title); titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1); }
    // Ticket samples are independent observations. Never carry yesterday's
    // samples forward, nor match a remake / namesake by fuzzy title similarity.
    const films = cumulative.films.map(({ revenueRial, revenueToman, ...film }, index) => ({ ...film, rank: index + 1, cumulativeRial: revenueRial, cumulativeToman: revenueToman,
      ...(titleCounts.get(cinemaTitleKey(film.title)) === 1 && prices.get(cinemaTitleKey(film.title)) ? { ticketPrice: prices.get(cinemaTitleKey(film.title)) } : {}),
    }));
    const payload = { version: 1, observedAt: cumulative.observedAt, fetchedAt: new Date(now()).toISOString(),
      source: { name: 'سمفا', url: SAMFAA_SITE, reportUrl: cumulative.sourceUrl, frontendUrl: SAMFAA_FRONTEND, screeningId: season, timezone: TEHRAN_ZONE, currency: 'IRR', displayCurrency: 'IRT', scope: 'all-provinces' },
      totals: { cumulativeToman: cumulative.totals.revenueToman, admissions: cumulative.totals.admissions, films: films.length }, films, comparison, dailyStatus: daily, ticketStatus };
    if (!dryRun) await atomicJson(file, payload);
    return { state: dryRun ? 'dry-run' : 'updated', observedAt: payload.observedAt, films: films.length, totalToman: payload.totals.cumulativeToman, daily, tickets: { ...ticketStatus, matchedFilms: films.filter(film => film.ticketPrice).length }, comparedFilms: comparison?.films?.length ?? 0, periods: comparison ? [comparison.period, comparison.previousPeriod] : [] };
  } finally { await lock.release(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runWorkerCli(path.join(process.env.VOD_DATA_DIR || 'public/data', 'iran-box-office.lock'), () => refreshIranBoxOffice({ dryRun: process.argv.includes('--dry-run'), tickets: !process.argv.includes('--no-tickets') })).then(status => {
    if (!status) return; // Parent process already mirrored its kernel-locked child.
    console.log(JSON.stringify(status, null, 2));
    if (['retained', 'unavailable', 'skipped'].includes(status.state)) process.exitCode = 1;
  })
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
