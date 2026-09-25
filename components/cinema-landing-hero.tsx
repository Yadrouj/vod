"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Info, Pause, Play, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SearchSuggest } from "@/components/search-suggest";
import { WatchTogetherLauncher } from "@/components/watch-together-launcher";
import { getDictionary, type Locale, typeLabel } from "@/lib/i18n";
import { sizedImageUrl } from "@/lib/image-url";
import { heroImageSrc } from "@/lib/hero-art";
import type { VodCard } from "@/lib/types";
import type { TrendingTitle } from "@/lib/imdb-trending";
import styles from "./cinema-landing-hero.module.css";

export function FilmLandingHero({ items, locale }: { items: (VodCard & { popularity?: TrendingTitle["popularity"] })[]; locale: Locale }) {
  const [index, setIndex] = useState(0);
  const [rotating, setRotating] = useState(true);
  const [engaged, setEngaged] = useState(false);
  const touch = useRef<number | null>(null);
  const fa = locale === "fa";
  const t = getDictionary(locale);
  const total = items.length;
  const active = total ? index % total : 0;
  const item = items[active];
  useEffect(() => {
    if (!rotating || engaged || total < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden && !matchMedia("(prefers-reduced-motion: reduce)").matches) setIndex(value => (value + 1) % total);
    }, 8000);
    return () => clearInterval(timer);
  }, [rotating, engaged, total]);
  if (!item) return null;
  const select = (next: number) => { setIndex((next + total) % total); setRotating(false); };
  const displayTitle = fa ? item.persianTitle || item.title : item.title;
  const trend = item.popularity;
  return <section className={styles.hero} data-cinema-hero dir={fa ? "rtl" : "ltr"} aria-roledescription="carousel" aria-label={fa ? "پیشنهادهای فیلم و سریال" : "Featured films and series"}
    onMouseEnter={() => setEngaged(true)} onMouseLeave={() => setEngaged(false)}
    onFocusCapture={() => setEngaged(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setEngaged(false); }}
    onTouchStart={e => { touch.current = e.touches[0].clientX; }} onTouchEnd={e => {
      if ((e.target as HTMLElement).closest("a, button, input")) return;
      const delta = e.changedTouches[0].clientX - (touch.current ?? e.changedTouches[0].clientX);
      if (Math.abs(delta) > 60) select(active + (delta > 0 ? -1 : 1) * (fa ? -1 : 1));
      touch.current = null;
    }}>
    <div className={styles.art} aria-hidden="true">
      {items.map((entry, position) => <div key={entry.imdbCode} className={`${styles.slide} ${position === active ? styles.active : ""}`}>
        {(position === active || position === (active + 1) % total) && <picture>
          {entry.posterUrl && <source media="(max-width: 600px)" srcSet={sizedImageUrl(entry.posterUrl, 780) ?? entry.posterUrl} />}
          <img src={entry.backdropUrl ? heroImageSrc(entry.backdropUrl, 1920) : undefined} alt="" loading={position === active ? "eager" : "lazy"} fetchPriority={position === active ? "high" : "low"} decoding="async" />
        </picture>}
      </div>)}
    </div>
    <div className={styles.content}>
      <div className={styles.copy} aria-live={rotating ? "off" : "polite"} aria-atomic="true">
        <span className={styles.eyebrow}><TrendingUp size={16} />{trend ? (trend.current ? (fa ? "ترند روز IMDb" : "Trending today on IMDb") : (fa ? "آخرین ترند ثبت‌شدهٔ IMDb" : "Latest recorded IMDb trend")) : (fa ? "برای تماشای بعدی شما" : "Your next great watch")}</span>
        <h1 dir="auto">{displayTitle}</h1>
        <div className={styles.meta}><b dir="ltr">IMDb {item.imdbRating?.toFixed(1) ?? "—"}</b><span>{item.year}</span><span>{typeLabel(item.type, locale)}</span><span>{item.genres.slice(0, 2).join(" · ")}</span></div>
        <p className={styles.overview} dir="auto">{(fa ? item.persianOverview || item.overview : item.overview) || item.genres.join(" · ")}</p>
        <div className={styles.actions}>
          <Link className={styles.play} href={item.linksCount > 0 ? `/watch/${item.imdbCode}` : `/${item.imdbCode}`}><Play size={22} fill="currentColor" />{item.linksCount > 0 ? t.common.playOnline : t.common.details}</Link>
          <Link className={styles.details} href={`/${item.imdbCode}`}><Info size={20} />{t.common.details}</Link>
          {item.linksCount > 0 && <WatchTogetherLauncher locale={locale} placement="inline" preset={{ itemId: item.imdbCode, title: displayTitle, posterUrl: item.posterUrl }} />}
        </div>
        {trend && <a className={styles.source} href={trend.sourceUrl} target="_blank" rel="noreferrer">{fa ? "رتبهٔ ترند IMDb" : "IMDb trend rank"} #{trend.rank} · {new Intl.DateTimeFormat(fa ? "fa-IR" : "en-US", { month: "short", day: "numeric", timeZone: "Asia/Tehran" }).format(new Date(trend.observedAt))}</a>}
      </div>
      <div className={styles.bottom}>
        <form className={styles.search} action="/browse" role="search"><SearchSuggest placeholder={t.home.searchPlaceholder} locale={locale} portal maxItems={14} /><button type="submit">{t.common.search}</button></form>
        {total > 1 && <div className={styles.navigation} dir="ltr">
          <button type="button" onClick={() => select(active - 1)} aria-label={fa ? "عنوان قبلی" : "Previous title"}><ChevronLeft size={20} /></button>
          <div className={styles.dots}>{items.map((entry, i) => <button key={entry.imdbCode} type="button" aria-current={i === active ? "true" : undefined} onClick={() => select(i)} aria-label={`${fa ? "نمایش" : "Show"} ${entry.title}`}><span /></button>)}</div>
          <button type="button" onClick={() => select(active + 1)} aria-label={fa ? "عنوان بعدی" : "Next title"}><ChevronRight size={20} /></button>
          <button type="button" onClick={() => setRotating(value => !value)} aria-pressed={rotating} aria-label={fa ? "چرخش خودکار" : "Automatic rotation"}>{rotating ? <Pause size={16} /> : <Play size={16} />}</button>
        </div>}
      </div>
    </div>
  </section>;
}
