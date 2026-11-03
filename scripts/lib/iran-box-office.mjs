export const SAMFAA_SITE = 'https://samfaa.ir/';
export const SAMFAA_API = 'https://api.samfaa.ir/admin/report/recent_shows';
export const SAMFAA_FRONTEND = 'https://samfaa.ir/js/app.4c7a653c.js';
export const TEHRAN_ZONE = 'Asia/Tehran';
const DAY = 86400_000;

function calendarDate(time, calendar = 'gregory', separator = '-') {
  const parts = Object.fromEntries(new Intl.DateTimeFormat(`en-US-u-ca-${calendar}-nu-latn`, {
    timeZone: TEHRAN_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(time).map(part => [part.type, part.value]));
  return [parts.year, parts.month, parts.day].join(separator);
}

export function completedTehranDays(now = Date.now()) {
  return [1, 2].map(offset => ({ date: calendarDate(now - offset * DAY), jalaliDate: calendarDate(now - offset * DAY, 'persian', '/') }));
}

export function samfaaReportUrl({ screeningId, day = null }) {
  if (!/^14\d{2}$/.test(String(screeningId))) throw new Error('Invalid SAMFAA screening season');
  if (day !== null && !/^14\d{2}\/\d{2}\/\d{2}$/.test(day)) throw new Error('Custom period requires a Jalali calendar date');
  const url = new URL(SAMFAA_API);
  url.search = new URLSearchParams({ recently: day ? 'custom' : 'all', province_id: '', screening_id: String(screeningId), from: day ?? '', to: day ?? '' }).toString();
  return url.toString();
}

export function safeSamfaaPoster(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      ['samfaa-static.s3.ir-thr-at1.arvanstorage.ir', 'samfaa.ir'].includes(url.hostname) ? url.toString() : null;
  } catch { return null; }
}

function integer(value, label) {
  if (typeof value !== 'number' && !(typeof value === 'string' && /^\d+$/.test(value.trim()))) throw new Error(`Invalid SAMFAA ${label}`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`Invalid SAMFAA ${label}`);
  return number;
}

export function parseSamfaaReport(payload, { allowEmpty = false } = {}) {
  if (payload?.success !== true || !Array.isArray(payload.data) || payload.data.length > 1000 || (!allowEmpty && !payload.data.length)) throw new Error('Invalid or empty SAMFAA report');
  const seen = new Set();
  return payload.data.map(row => {
    if (!row || typeof row !== 'object') throw new Error('Invalid SAMFAA film');
    const id = String(integer(row.id, 'film ID'));
    if (id === '0' || seen.has(id) || typeof row.title !== 'string' || !row.title.trim() || row.title.length > 300) throw new Error('Duplicate or invalid SAMFAA film identity');
    seen.add(id);
    const revenueRial = integer(row.final_price, 'rial revenue');
    return { id, title: row.title.trim(), posterUrl: safeSamfaaPoster(row.image_url),
      directors: Array.isArray(row.director) ? row.director.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()) : [],
      revenueRial, revenueToman: revenueRial / 10, admissions: integer(row.tickets_count, 'admissions'),
      venueCount: integer(row.venue_count, 'venue count'), scheduleCount: integer(row.schedule_count, 'schedule count') };
  }).sort((a, b) => b.revenueRial - a.revenueRial || b.admissions - a.admissions || a.id.localeCompare(b.id));
}

function sum(rows, key) {
  const result = rows.reduce((total, row) => total + row[key], 0);
  if (!Number.isSafeInteger(result)) throw new Error('SAMFAA report aggregate exceeds safe integer range');
  return result;
}

export function reportTotals(rows) {
  const revenueRial = sum(rows, 'revenueRial');
  return { revenueRial, revenueToman: revenueRial / 10, admissions: sum(rows, 'admissions'), films: rows.length };
}

export async function fetchSamfaaReport({ screeningId, day = null, fetcher = fetch, now = Date.now }) {
  const sourceUrl = samfaaReportUrl({ screeningId, day });
  const response = await fetcher(sourceUrl, { redirect: 'error', signal: AbortSignal.timeout(20_000), headers: { Accept: 'application/json', 'User-Agent': 'SarvNema/1.0 (public cinema statistics)' } });
  if (response.status !== 200 || !/application\/json/i.test(response.headers.get('content-type') ?? '')) {
    await response.body?.cancel(); throw new Error(`SAMFAA HTTP ${response.status} or non-JSON response`);
  }
  if (Number(response.headers.get('content-length')) > 2_000_000) { await response.body?.cancel(); throw new Error('SAMFAA response exceeds byte budget'); }
  if (!response.body) throw new Error('Empty SAMFAA response');
  const reader = response.body.getReader(); const chunks = []; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > 2_000_000) throw new Error('SAMFAA response exceeds byte budget');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  let payload;
  try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('Invalid SAMFAA JSON'); }
  const films = parseSamfaaReport(payload, { allowEmpty: day !== null });
  const receivedAt = now(); const date = Date.parse(response.headers.get('date') ?? ''); const age = Number(response.headers.get('age') ?? 0);
  if (!Number.isFinite(age) || age < 0) throw new Error('Invalid SAMFAA cache age');
  const observed = Math.min(receivedAt - age * 1000, Number.isFinite(date) ? date : receivedAt);
  if (!Number.isFinite(observed) || observed <= 0) throw new Error('Invalid SAMFAA observation timestamp');
  return { films, totals: reportTotals(films), sourceUrl, observedAt: new Date(observed).toISOString() };
}

function change(currentRial, previousRial) {
  return { deltaToman: (currentRial - previousRial) / 10, changePercent: previousRial > 0 ? (currentRial - previousRial) / previousRial * 100 : null };
}

function fingerprint(films) {
  return JSON.stringify([...films].sort((a, b) => a.id.localeCompare(b.id)).map(film => [film.id, film.revenueRial, film.admissions]));
}

export function buildDailyComparison(current, previous, cumulative, periods, now = Date.now()) {
  const expected = completedTehranDays(now);
  if (!Array.isArray(periods) || periods.length !== 2 || periods.some((period, i) => period.date !== expected[i].date || period.jalaliDate !== expected[i].jalaliDate)) throw new Error('Daily comparison requires the two completed Tehran days');
  const season = new URL(cumulative.sourceUrl).searchParams.get('screening_id');
  for (const [index, report] of [current, previous].entries()) {
    const url = new URL(report.sourceUrl);
    if (url.origin + url.pathname !== SAMFAA_API || url.searchParams.get('screening_id') !== season || url.searchParams.get('province_id') !== '' ||
      url.searchParams.get('recently') !== 'custom' || url.searchParams.get('from') !== periods[index].jalaliDate || url.searchParams.get('to') !== periods[index].jalaliDate) throw new Error('Non-comparable SAMFAA request periods');
    const observed = Date.parse(report.observedAt);
    if (!Number.isFinite(observed) || observed > now || calendarDate(observed) <= periods[index].date) throw new Error('SAMFAA daily observation predates the completed period');
    if (!report.films.length || report.totals.revenueRial > cumulative.totals.revenueRial || report.totals.admissions > cumulative.totals.admissions) throw new Error('Unverified SAMFAA daily period totals');
  }
  // Guard against an upstream ignoring custom date parameters. Identical
  // responses cannot establish daily semantics, even if equality is legitimate.
  if (fingerprint(current.films) === fingerprint(previous.films) || fingerprint(current.films) === fingerprint(cumulative.films) || fingerprint(previous.films) === fingerprint(cumulative.films)) throw new Error('Custom date responses are indistinguishable; daily growth not verified');
  const previousById = new Map(previous.films.map(film => [film.id, film]));
  const cumulativeById = new Map(cumulative.films.map(film => [film.id, film]));
  const films = current.films.flatMap(film => {
    const before = previousById.get(film.id); const all = cumulativeById.get(film.id);
    // An omitted row is not proof of zero sales; never manufacture a baseline.
    if (!before || !all || film.revenueRial > all.revenueRial || before.revenueRial > all.revenueRial || film.admissions > all.admissions || before.admissions > all.admissions) return [];
    return [{ id: film.id, revenueToman: film.revenueToman, previousRevenueToman: before.revenueToman,
      admissions: film.admissions, previousAdmissions: before.admissions, ...change(film.revenueRial, before.revenueRial) }];
  });
  return { observedAt: [current.observedAt, previous.observedAt].sort()[0], period: periods[0], previousPeriod: periods[1],
    sourceUrls: [current.sourceUrl, previous.sourceUrl], verification: { method: 'distinct-explicit-jalali-single-day-requests', frontendUrl: SAMFAA_FRONTEND, timezone: TEHRAN_ZONE },
    totals: { revenueToman: current.totals.revenueToman, previousRevenueToman: previous.totals.revenueToman,
      admissions: current.totals.admissions, previousAdmissions: previous.totals.admissions, ...change(current.totals.revenueRial, previous.totals.revenueRial) }, films };
}
