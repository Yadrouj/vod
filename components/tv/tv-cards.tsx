"use client";
import Link from "next/link";
import { useState } from "react";
import { Star } from "lucide-react";
import type { TVCard } from "@/lib/tv-types";
import type { Locale } from "@/lib/i18n";

export function TVPoster({ item, locale, focusId }: { item: TVCard; locale: Locale; focusId?: string }) {
  const [failed, setFailed] = useState(false);
  return <Link href={`/tv/title/${encodeURIComponent(item.id)}`} prefetch={false} className="tv-card" data-tv-focus={focusId || item.id} aria-label={`${item.title} · ${item.rating ? `IMDb ${item.rating}` : ""}`}>
    <div className="tv-card-art">{item.poster && !failed ? <img src={item.poster} alt="" loading="lazy" decoding="async" width="240" height="360" onError={() => setFailed(true)} /> : <span>{item.title}</span>}
      {item.rating != null && <span className="tv-rating"><Star size={14} fill="currentColor" />{item.rating.toFixed(1)}</span>}
      {!item.available && <small className="tv-card-soon">{locale === "fa" ? "منتظر لینک" : "Awaiting links"}</small>}
    </div>
    <strong>{item.title}</strong><small>{[item.year, item.series ? locale === "fa" ? "سریال" : "Series" : locale === "fa" ? "فیلم" : "Film"].filter(Boolean).join(" · ")}</small>
  </Link>;
}

export function TVRail({ title, id, items, locale }: { title: string; id: string; items: TVCard[]; locale: Locale }) {
  return <section className="tv-rail" aria-labelledby={`rail-${id}`}><h2 id={`rail-${id}`}>{title}</h2><div className="tv-rail-track">{items.map(item => <TVPoster key={item.id} item={item} locale={locale} focusId={`${id}-${item.id}`} />)}</div></section>;
}
