"use client";
import Link from "next/link";
import { useState } from "react";
import { Star } from "lucide-react";
import type { TVCard } from "@/lib/tv-types";
import type { Locale } from "@/lib/i18n";

export function TVPoster({ item, locale, focusId, initial }: { item: TVCard; locale: Locale; focusId?: string; initial?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <Link href={`/tv/title/${encodeURIComponent(item.id)}`} prefetch={false} className="tv-card" data-tv-initial={initial || undefined} data-tv-focus={focusId || item.id} aria-label={`${item.title} · ${item.rating ? `IMDb ${item.rating}` : ""}`}>
    <div className="tv-card-art">{item.poster && !failed ? <img src={item.poster} alt="" loading="lazy" decoding="async" width="240" height="360" onError={() => setFailed(true)} /> : <span>{item.title}</span>}
      {item.rating != null && <span className="tv-rating"><Star size={14} fill="currentColor" />{item.rating.toFixed(1)}</span>}
      {!item.available && <small className="tv-card-soon">{locale === "fa" ? "منتظر لینک" : "Awaiting links"}</small>}
    </div>
    <strong>{item.title}</strong><small>{[item.year, item.series ? locale === "fa" ? "سریال" : "Series" : locale === "fa" ? "فیلم" : "Film"].filter(Boolean).join(" · ")}</small>
  </Link>;
}

export function TVRail({ title, id, items, locale, href, total }: { title: string; id: string; items: TVCard[]; locale: Locale; href?: string; total?: number }) {
  return <section className="tv-rail" data-tv-collection={id} aria-labelledby={`rail-${id}`}><div className="tv-rail-heading"><h2 id={`rail-${id}`}>{title}</h2>{href && <Link href={href} data-tv-focus={`all-${id}`} prefetch={false}>{locale === 'fa' ? 'مشاهدهٔ همه' : 'View all'}{total != null && <small>{total.toLocaleString(locale)}</small>}</Link>}</div><div className="tv-rail-track">{items.map(item => <TVPoster key={item.id} item={item} locale={locale} focusId={`${id}-${item.id}`} />)}</div></section>;
}
