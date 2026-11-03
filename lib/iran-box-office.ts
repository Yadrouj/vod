import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type CinemaTicketPrice = { minToman: number; maxToman: number | null; sampleSessions: number; sampleCinemas: number; forDay: string; sourceUrl: string; observedAt: string };
export type IranBoxOfficeFilm = { id: string; rank: number; title: string; posterUrl: string | null; directors: string[];
  cumulativeRial: number; cumulativeToman: number; admissions: number; venueCount: number; scheduleCount: number; ticketPrice?: CinemaTicketPrice };
export type DailyBoxOfficeMetric = { revenueToman: number; previousRevenueToman: number; admissions: number; previousAdmissions: number; deltaToman: number; changePercent: number | null };
export type IranBoxOfficeComparison = { observedAt: string; period: { date: string; jalaliDate: string }; previousPeriod: { date: string; jalaliDate: string };
  sourceUrls: string[]; verification: { method: string; frontendUrl: string; timezone: string }; totals: DailyBoxOfficeMetric; films: (DailyBoxOfficeMetric & { id: string })[] };
export type IranBoxOfficeSnapshot = { version: 1; observedAt: string; fetchedAt: string;
  source: { name: string; url: string; reportUrl: string; frontendUrl: string; screeningId: string; timezone: string; currency: 'IRR'; displayCurrency: 'IRT'; scope: 'all-provinces' };
  totals: { cumulativeToman: number; admissions: number; films: number }; films: IranBoxOfficeFilm[];
  comparison: IranBoxOfficeComparison | null; dailyStatus: { state: string; reason?: string }; ticketStatus?: { state: string; failures: { title?: string; error: string }[]; checkedAt?: string; sourceUrl?: string } };
export type IranBoxOfficeView = IranBoxOfficeSnapshot & { freshness: 'fresh' | 'stale' | 'expired'; ageDays: number };
const DAY = 86400_000;
const priorSnapshots = new Map<string, IranBoxOfficeSnapshot>();
const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const integer = (value: unknown): value is number => nonnegative(value) && Number.isSafeInteger(value);

function officialReport(value: string, season: string, day?: string) {
  try {
    const url = new URL(value);
    return url.origin + url.pathname === 'https://api.samfaa.ir/admin/report/recent_shows' && !url.username && !url.password &&
      url.searchParams.get('province_id') === '' && url.searchParams.get('screening_id') === season &&
      url.searchParams.get('recently') === (day ? 'custom' : 'all') && url.searchParams.get('from') === (day ?? '') && url.searchParams.get('to') === (day ?? '');
  } catch { return false; }
}

function safePoster(value: string | null) {
  if (value === null) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      ['samfaa-static.s3.ir-thr-at1.arvanstorage.ir', 'samfaa.ir'].includes(url.hostname) ? value : null;
  } catch { return null; }
}

export function validTicketPrice(value: CinemaTicketPrice | undefined, now = Date.now()): value is CinemaTicketPrice {
  if (!value || !nonnegative(value.minToman) || value.minToman === 0 || (value.maxToman !== null && (!nonnegative(value.maxToman) || value.maxToman < value.minToman)) || !integer(value.sampleSessions) || value.sampleSessions < 1 || !integer(value.sampleCinemas) || value.sampleCinemas < 1) return false;
  const age = now - Date.parse(value.observedAt);
  if (!Number.isFinite(age) || age < 0 || age >= DAY) return false;
  const calendar = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' });
  if (value.forDay !== calendar.format(now) || value.forDay !== calendar.format(Date.parse(value.observedAt))) return false;
  try {
    const url = new URL(value.sourceUrl);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && ['cinematicket.org', 'www.cinematicket.org'].includes(url.hostname);
  } catch { return false; }
}

function validMetric(value: DailyBoxOfficeMetric) {
  if (!value || !nonnegative(value.revenueToman) || !nonnegative(value.previousRevenueToman) || !integer(value.admissions) || !integer(value.previousAdmissions) || !Number.isFinite(value.deltaToman)) return false;
  if (Math.abs(value.deltaToman - (value.revenueToman - value.previousRevenueToman)) > .01) return false;
  const expected = value.previousRevenueToman > 0 ? (value.revenueToman - value.previousRevenueToman) / value.previousRevenueToman * 100 : null;
  return expected === null ? value.changePercent === null : typeof value.changePercent === 'number' && Number.isFinite(value.changePercent) && Math.abs(value.changePercent - expected) < .00001;
}

function validComparison(value: IranBoxOfficeComparison | null, season: string, now: number): value is IranBoxOfficeComparison {
  if (!value || value.verification?.method !== 'distinct-explicit-jalali-single-day-requests' || value.verification.timezone !== 'Asia/Tehran' || !Array.isArray(value.films)) return false;
  const age = now - Date.parse(value.observedAt);
  if (!Number.isFinite(age) || age < 0 || age > 14 * DAY) return false;
  const calendar = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' });
  const current = Date.parse(`${value.period?.date}T00:00:00Z`); const previous = Date.parse(`${value.previousPeriod?.date}T00:00:00Z`);
  if (!Number.isFinite(current) || !Number.isFinite(previous) || current - previous !== DAY || value.period.date >= calendar.format(now) || calendar.format(Date.parse(value.observedAt)) <= value.period.date) return false;
  const jalali = (time: number) => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(time).map(part => [part.type, part.value]));
    return `${parts.year}/${parts.month}/${parts.day}`;
  };
  if (value.period.jalaliDate !== jalali(current + DAY / 2) || value.previousPeriod.jalaliDate !== jalali(previous + DAY / 2)) return false;
  const ids = new Set();
  return value.sourceUrls?.length === 2 && officialReport(value.sourceUrls[0], season, value.period.jalaliDate) && officialReport(value.sourceUrls[1], season, value.previousPeriod.jalaliDate) &&
    validMetric(value.totals) && value.films.every(film => {
      if (!film || typeof film.id !== 'string' || ids.has(film.id) || !validMetric(film)) return false;
      ids.add(film.id); return true;
    });
}

export function selectIranBoxOffice(payload: unknown, now = Date.now()): IranBoxOfficeView | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as IranBoxOfficeSnapshot;
  const age = now - Date.parse(data.observedAt);
  if (data.version !== 1 || !Number.isFinite(age) || age < 0 || !Array.isArray(data.films) || !data.films.length || data.films.length > 1000 ||
    data.source?.currency !== 'IRR' || data.source.displayCurrency !== 'IRT' || data.source.scope !== 'all-provinces' || data.source.timezone !== 'Asia/Tehran' ||
    !/^14\d{2}$/.test(data.source.screeningId) || !officialReport(data.source.reportUrl, data.source.screeningId)) return null;
  const seen = new Set<string>();
  for (const film of data.films) {
    if (!film || typeof film.id !== 'string' || !/^\d+$/.test(film.id) || seen.has(film.id) || typeof film.title !== 'string' || !film.title.trim() || !integer(film.rank) || film.rank < 1 ||
      !integer(film.cumulativeRial) || film.cumulativeToman !== film.cumulativeRial / 10 || !integer(film.admissions) || !integer(film.venueCount) || !integer(film.scheduleCount)) return null;
    seen.add(film.id);
  }
  const films = [...data.films].sort((a, b) => b.cumulativeRial - a.cumulativeRial || b.admissions - a.admissions || a.id.localeCompare(b.id))
    .map((film, index) => ({ ...film, rank: index + 1, posterUrl: safePoster(film.posterUrl), directors: Array.isArray(film.directors) ? film.directors.filter(value => typeof value === 'string') : [],
      ticketPrice: validTicketPrice(film.ticketPrice, now) ? film.ticketPrice : undefined }));
  const totalRial = films.reduce((sum, film) => sum + film.cumulativeRial, 0);
  if (!Number.isSafeInteger(totalRial)) return null;
  return { ...data, films, totals: { cumulativeToman: totalRial / 10, admissions: films.reduce((sum, film) => sum + film.admissions, 0), films: films.length },
    comparison: validComparison(data.comparison, data.source.screeningId, now) ? data.comparison : null,
    freshness: age > 14 * DAY ? 'expired' : age > 36 * 3600_000 ? 'stale' : 'fresh', ageDays: Math.floor(age / DAY) };
}

export async function loadIranBoxOffice({ dataDir = process.env.VOD_DATA_DIR || path.join(process.cwd(), 'public/data'), now = Date.now() } = {}): Promise<IranBoxOfficeView | null> {
  const file = path.resolve(dataDir, 'iran-box-office.json');
  try {
    const payload = JSON.parse(await readFile(file, 'utf8'));
    const view = selectIranBoxOffice(payload, now);
    if (!view) throw new Error('Invalid box-office snapshot');
    priorSnapshots.set(file, payload);
    if (priorSnapshots.size > 8) priorSnapshots.delete(priorSnapshots.keys().next().value as string);
    return view;
  } catch { return selectIranBoxOffice(priorSnapshots.get(file), now); }
}
