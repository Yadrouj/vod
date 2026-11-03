// Public endpoints observed in CinemaTicket's own movie-detail page, November 2026.
// Session min_price/max_price are rial (900000 is displayed as 90000 toman).
export const CINEMATICKET_ORIGIN = 'https://cinematicket.org';
export const cinemaTitleKey = title => String(title || '').normalize('NFKC').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[^\p{L}\p{N}]/gu, '');
function tehranDay(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function parseCinemaTicketPrices(payload, movieId, now = Date.now()) {
  if (!Number.isSafeInteger(movieId) || movieId < 1 || payload?.movie?.id !== movieId || !Array.isArray(payload.cinemas)) return null;
  const day = tehranDay(now), prices = [], ids = new Set(), cinemas = new Set();
  for (const group of payload.cinemas) {
    if (group.date !== day || !Array.isArray(group.cinemas)) continue;
    for (const venue of group.cinemas) for (const hall of Object.values(venue.halls ?? {})) {
      if (!Array.isArray(hall.sessions)) continue;
      for (const session of hall.sessions) {
        const start = Date.parse(session.start_at);
        if (!session.can_order || !Number.isSafeInteger(session.id) || ids.has(session.id) || !Number.isFinite(start) || start < now || tehranDay(start) !== day) continue;
        const { min_price: min, max_price: max } = session;
        if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min <= 0 || max < min) continue;
        prices.push(min / 10, max / 10); ids.add(session.id); cinemas.add(venue.cinema?.id ?? venue.cinema?.name_fa);
      }
    }
  }
  return prices.length ? { minToman: Math.min(...prices), maxToman: Math.max(...prices), sampleSessions: ids.size, sampleCinemas: cinemas.size,
    forDay: day, observedAt: new Date(now).toISOString(), sourceUrl: `${CINEMATICKET_ORIGIN}/movie/detail/${movieId}` } : null;
}
async function publicJson(url, fetcher) {
  const response = await fetcher(url, { headers: { Accept: 'application/json', 'User-Agent': 'SarvNema/1.0 (cinema ticket price observations)' }, signal: AbortSignal.timeout(15000), redirect: 'error' });
  if (!response.ok) throw new Error(`CinemaTicket: HTTP ${response.status}`);
  const text = await response.text();
  if (text.length > 5_000_000) throw new Error('CinemaTicket response too large');
  return JSON.parse(text);
}
export async function fetchCinemaTicketPrices(filmTitles, { now = Date.now(), fetcher = fetch } = {}) {
  const year = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', timeZone: 'Asia/Tehran' }).format(now).match(/\d+/)?.[0];
  const url = `${CINEMATICKET_ORIGIN}/api/v1/movie/new-boxoffice/?release_year=${year}&page_size=100`;
  const listing = await publicJson(url, fetcher);
  if (!Array.isArray(listing.results) || !listing.results.length) throw new Error('CinemaTicket movie list unavailable');
  const prices = new Map(), failures = [];
  for (const title of filmTitles.slice(0, 10)) {
    const matches = listing.results.filter(movie => cinemaTitleKey(movie.name) === cinemaTitleKey(title));
    // No fuzzy attribution: a ticket price must belong to this exact movie.
    if (matches.length !== 1 || !Number.isSafeInteger(matches[0].id)) continue;
    const id = matches[0].id;
    try {
      const payload = await publicJson(`${CINEMATICKET_ORIGIN}/api/v1/cinematicket/home/movies/${id}/`, fetcher);
      const sample = parseCinemaTicketPrices(payload, id, now);
      if (sample) prices.set(cinemaTitleKey(title), sample);
    } catch (error) { failures.push({ title, error: error.message }); }
  }
  return { prices, failures, checkedAt: new Date(now).toISOString(), sourceUrl: CINEMATICKET_ORIGIN };
}
