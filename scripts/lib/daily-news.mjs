// Ten genuinely new links per Tehran calendar day. Publisher dates are never rewritten.
export const DAILY_NEWS_GOAL = 10;
export function newsDay(time = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(time);
}
export function newsKey(item) {
  // Google RSS and publisher feeds may expose the same headline through different URLs.
  return String(item.title || '').normalize('NFKC').replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}
export function buildDailyNews(fresh, previous = {}, now = Date.now()) {
  const day = newsDay(now);
  const oldest = newsDay(now - 30 * 86400_000);
  const history = (Array.isArray(previous.history) ? previous.history : [])
    .filter(batch => /^\d{4}-\d{2}-\d{2}$/.test(batch.day) && batch.day >= oldest && batch.day <= day && Array.isArray(batch.items));
  const priorToday = history.find(batch => batch.day === day);
  const selected = [...(priorToday?.items ?? [])].slice(0, DAILY_NEWS_GOAL);
  const used = history.flatMap(batch => batch.items);
  // The pre-migration landing headlines were already published, too.
  if (!history.length) used.push(...(previous.items ?? []));
  const urls = new Set([...used, ...selected].map(item => item.url));
  const keys = new Set([...used, ...selected].map(newsKey).filter(Boolean));
  const pool = fresh.filter(item => {
    const at = Date.parse(item.publishedAt);
    return /^https:\/\//i.test(item.url) && newsKey(item) && Number.isFinite(at)
      && at <= now + 300_000 && at >= now - 3 * 86400_000;
  }).sort((a, b) => Number(/[\u0600-\u06ff]/u.test(b.title)) - Number(/[\u0600-\u06ff]/u.test(a.title))
    || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  for (const item of pool) {
    if (selected.length >= DAILY_NEWS_GOAL) break;
    const key = newsKey(item);
    if (urls.has(item.url) || keys.has(key)) continue;
    selected.push(item); urls.add(item.url); keys.add(key);
  }
  const batch = { day, selectedAt: priorToday?.selectedAt ?? new Date(now).toISOString(), items: selected };
  const nextHistory = [...history.filter(item => item.day !== day), batch].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 31);
  const display = [...selected];
  const seen = new Set(display.map(item => item.url));
  for (const item of [...nextHistory.flatMap(batch => batch.items), ...(previous.items ?? [])]) {
    if (!seen.has(item.url) && Date.parse(item.publishedAt) >= now - 7 * 86400_000 && Date.parse(item.publishedAt) <= now + 300_000) {
      seen.add(item.url); display.push(item);
    }
  }
  return { daily: { day, goal: DAILY_NEWS_GOAL, count: selected.length, state: selected.length === DAILY_NEWS_GOAL ? 'complete' : 'partial', checkedAt: new Date(now).toISOString() },
    history: nextHistory, items: display.slice(0, 70) };
}
