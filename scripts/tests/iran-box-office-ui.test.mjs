import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { selectIranBoxOffice } from '../../lib/iran-box-office.ts';
const require = createRequire(import.meta.url);
require.extensions['.css'] = module => { module.exports = {}; };
const { IranBoxOffice } = await import('../../components/iran-box-office.tsx');
const snapshot = JSON.parse(await readFile(new URL('../../public/data/iran-box-office.json', import.meta.url), 'utf8'));
const now = Date.parse(snapshot.observedAt) + 60000;
const render = data => renderToStaticMarkup(createElement(IranBoxOffice, { data }));

test('real primary-source posters, cumulative admissions and dated growth render independently of news', () => {
  const view = selectIranBoxOffice(snapshot, now); assert.ok(view);
  const html = render(view);
  assert.match(html, /id="iran-box-office"/); assert.match(html, /data-iran-box-office/); assert.match(html, /سینمای ایران، به روایت گیشه/);
  assert.match(html, /فروش تجمیعی/); assert.match(html, /تعداد بلیت/); assert.match(html, /تغییر روزانه، نه تغییر فروش تجمیعی/);
  assert.ok(html.includes(snapshot.films[0].title)); assert.ok(html.includes(snapshot.films[0].posterUrl.replace(/&/g, '&amp;')));
  assert.match(html, /فروش امروزِ ناتمام/);
});

test('unavailable and expired views do not render fabricated or obsolete figures', () => {
  const unavailable = render(null); assert.match(unavailable, /هنوز در دسترس نیست/); assert.doesNotMatch(unavailable, /<table/);
  const expired = render(selectIranBoxOffice(snapshot, now + 15 * 86400_000));
  assert.match(expired, /بیش از ۱۴ روز/); assert.doesNotMatch(expired, /<table/); assert.doesNotMatch(expired, /<img/);
});

test('unverified daily periods show an explicit waiting state, never a fake 0% baseline', () => {
  const view = selectIranBoxOffice({ ...snapshot, comparison: null }, now);
  const html = render(view); assert.match(html, /در انتظار دادهٔ قابل مقایسه/); assert.match(html, /دادهٔ دو روز موجود نیست/);
});

test('today ticket samples are labeled as purchasable-session samples, not national audience evidence', () => {
  const view = selectIranBoxOffice(snapshot, now);
  if (!view.films.some(film => film.ticketPrice)) return;
  const html = render(view);
  assert.match(html, /نمونه سانس‌های قابل خرید امروز/); assert.match(html, /مبنای آمار سراسری مخاطبان نیستند/);
  const tomorrow = render(selectIranBoxOffice(snapshot, now + 86400_000));
  assert.doesNotMatch(tomorrow, /نمونه سانس‌های قابل خرید امروز/);
});

test('audience analysis computes ticket share, tickets/session and completed-day admission change only from reported counts', () => {
  const view = selectIranBoxOffice(snapshot, now);
  const html = render(view);
  const sessions = view.films.reduce((sum, film) => sum + film.scheduleCount, 0);
  const format = value => value.toLocaleString('fa-IR', { maximumFractionDigits: 1 });
  assert.match(html, /تحلیل مخاطب/); assert.match(html, /از تعداد بلیت‌های گزارش‌شده/); assert.match(html, /نه افراد یکتا یا نرخ پُرشدن سالن/);
  assert.ok(html.includes(format(view.films[0].admissions / view.totals.admissions * 100)));
  assert.ok(html.includes(format(view.totals.admissions / sessions)));
  assert.match(html, /تغییر تعداد بلیت روز کامل/);
  assert.ok(html.includes(format((view.comparison.totals.admissions - view.comparison.totals.previousAdmissions) / view.comparison.totals.previousAdmissions * 100)));
});

test('audience ratios are omitted when denominators are zero, with no NaN or invented percentage', () => {
  const view = selectIranBoxOffice(snapshot, now);
  view.films = view.films.map(film => ({ ...film, admissions: 0, scheduleCount: 0 })); view.totals.admissions = 0;
  view.comparison = null;
  const html = render(view);
  assert.doesNotMatch(html, /از تعداد بلیت‌های گزارش‌شده:/); assert.doesNotMatch(html, /میانگین بلیت به ازای هر سانس/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});
