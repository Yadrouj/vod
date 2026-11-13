"use client";
import { useEffect, useState } from 'react';
import type { WorldBoxOffice as Snapshot } from '@/lib/world-box-office';
import styles from './iran-box-office.module.css';

export function WorldBoxOffice({ initial, observedNow }: { initial: Snapshot | null; observedNow: number }) {
  const [data, setData] = useState(initial);
  const [now, setNow] = useState(observedNow);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setInterval(() => {
      if (document.hidden) return;
      setNow(Date.now());
      fetch('/api/box-office/world', { signal: controller.signal }).then(async r => { if (r.ok) { const result = await r.json(); if (!controller.signal.aborted && result.data) setData(result.data); } }).catch(() => {});
    }, 300_000);
    return () => { clearInterval(timer); controller.abort(); };
  }, []);
  const money = (value: number | null) => value === null ? 'گزارش نشده' : `$${value.toLocaleString('fa-IR')}`;
  return <section className={styles.panel} id="world-box-office" aria-labelledby="world-box-heading" dir="rtl">
    <header className={styles.header}><div><p className={styles.eyebrow}>Box Office Mojo · فروش جهانی به دلار آمریکا</p><h2 id="world-box-heading">گیشهٔ سینمای جهان {data?.year}</h2><p className={styles.subtitle}>فروش تجمعی گروه اکران‌های سال؛ رتبه‌بندی جهانی، نه فقط گیشهٔ آمریکا</p></div><a className={styles.source} href={data?.sourceUrl || 'https://www.boxofficemojo.com/year/world/'} target="_blank" rel="noopener noreferrer">مشاهدهٔ منبع ↗</a></header>
    {data ? <><div className={styles.asOf}><span>زمان دریافت آمار:</span><time dateTime={data.observedAt}>{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(data.observedAt))}</time></div>
      {now - Date.parse(data.observedAt) > 48 * 3600_000 && <p className={styles.stale}>دریافت گزارش تازه ممکن نشده؛ آخرین آمار ذخیره‌شده با تاریخ اصلی نمایش داده می‌شود.</p>}
      <p className={styles.notice}>منبع هر ساعت بررسی می‌شود. این گزارش با انتشار آمار ناشر به‌روز می‌شود و شمارندهٔ لحظه‌ای فروش نیست.</p>
      <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="جدول فروش جهانی؛ برای دیدن همهٔ ستون‌ها پیمایش کنید"><table className={styles.table}><caption>۳۰ فیلم پرفروشِ گزارش سال {data.year} · همهٔ ارقام دلار آمریکا</caption><thead><tr><th scope="col">رتبه / فیلم</th><th scope="col">فروش جهانی</th><th scope="col">آمریکا و کانادا</th><th scope="col">سایر بازارها</th></tr></thead><tbody>{data.films.map(film => <tr key={film.sourceUrl}><th scope="row"><a href={film.sourceUrl} target="_blank" rel="noopener noreferrer"><span className={styles.tableTitle}><b>{film.rank.toLocaleString('fa-IR')}</b><bdi>{film.title}</bdi></span></a></th><td><bdi dir="ltr">{money(film.worldwideUsd)}</bdi></td><td><bdi dir="ltr">{money(film.domesticUsd)}</bdi></td><td><bdi dir="ltr">{money(film.internationalUsd)}</bdi></td></tr>)}</tbody></table></div>
      <footer className={styles.notes}><p>تاریخ بالا زمان دریافت ماست، نه الزاماً زمان آخرین تغییر ناشر. آمار ممکن است شامل برآوردها و اصلاحات ناشر باشد؛ رشد روزانه از فروش تجمعی استنباط نمی‌شود.</p></footer></> : <p className={styles.notice}>منبع فروش جهانی فعلاً در دسترس نیست؛ تا دریافت گزارش معتبر رقمی نمایش نمی‌دهیم.</p>}
  </section>;
}
