"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { VodCard } from "@/lib/types";

export function WideRail({ items, locale }: { items: VodCard[]; locale: Locale }) {
  const t = getDictionary(locale);
  const [order, setOrder] = useState(() => shuffle(items));
  const [seconds, setSeconds] = useState(10);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => {
      if (value <= 1) { setOrder((current) => shuffle(current)); return 10; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!order.length) return null;
  return <section className="section wide-rail-section">
    <div className="section-head"><div><h2>{t.home.wideTitle}</h2><p className="muted">{t.home.wideSubtitle}</p></div><div className="wide-rail-tools"><span className="wide-countdown" aria-label={`Next shuffle in ${seconds} seconds`}><span>{seconds}</span></span><Link className="view-all" href="/browse?minScore=7">{t.common.viewAll}</Link></div></div>
    <div className="wide-rail">{order.slice(0, 6).map((item, index) => <Link key={item.imdbCode} className={`wide-card wide-card-${index % 3}`} href={`/${item.imdbCode}`} style={item.backdropUrl ? { backgroundImage: `url(${item.backdropUrl})` } : undefined}><span className="rating">{item.imdbRating ? `IMDb ${item.imdbRating.toFixed(1)}` : item.year ?? t.common.movie}</span><span className="wide-copy"><strong>{item.title}</strong><small>{[item.year, item.genres.slice(0, 2).join(" / ")].filter(Boolean).join(" / ")}</small><em>{t.home.wideAction}</em></span></Link>)}</div>
  </section>;
}

function shuffle(items: VodCard[]) { return [...items].sort(() => Math.random() - 0.5); }
