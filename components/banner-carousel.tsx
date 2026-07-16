"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WatchTogetherLauncher } from "@/components/watch-together-launcher";
import { DEFAULT_LOCALE, getDictionary, type Locale, typeLabel } from "@/lib/i18n";
import { sizedImageUrl } from "@/lib/image-url";
import type { VodCard } from "@/lib/types";

export function BannerCarousel({ items, locale = DEFAULT_LOCALE }: { items: VodCard[]; locale?: Locale }) {
  const [active, setActive] = useState(() => {
    if (!items.length) return 0;
    const day = Math.floor(Date.now() / 86400000);
    return day % items.length;
  });
  const current = items[active] ?? items[0];
  const t = getDictionary(locale);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % items.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [items.length]);

  if (!current) return null;

  return (
    <div
      className="banner-carousel"
      style={
        current.backdropUrl
          ? {
              backgroundImage: `linear-gradient(90deg, rgba(5,5,5,0.72), rgba(5,5,5,0.35), rgba(5,5,5,0.12)), url(${sizedImageUrl(current.backdropUrl, 1600)})`,
            }
          : undefined
      }
    >
      <button
        className="banner-arrow left"
        type="button"
        aria-label="Previous banner"
        onClick={() => setActive((value) => (value - 1 + items.length) % items.length)}
      >
        &lsaquo;
      </button>
      <div className="banner-copy">
        <div className="meta">
          <span>{typeLabel(current.type, locale)}</span>
          <i className="dot" />
          <span>{current.year ?? "-"}</span>
          {current.imdbRating && (
            <>
              <i className="dot" />
              <span>IMDb {current.imdbRating.toFixed(1)}</span>
            </>
          )}
        </div>
        <h1>{current.title}</h1>
        {current.overview && <p>{current.overview}</p>}
        <div className="chips">
          <Link className="play-glow" href={`/watch/${current.imdbCode}`}>
            <span className="play-dot" /> {t.common.playOnline}
          </Link>
          <Link className="chip" href={`/${current.imdbCode}`}>
            {t.common.details}
          </Link>
          <WatchTogetherLauncher
            locale={locale}
            placement="inline"
            preset={{ itemId: current.imdbCode, title: current.title, posterUrl: current.backdropUrl ?? current.posterUrl }}
          />
        </div>
      </div>
      <button
        className="banner-arrow right"
        type="button"
        aria-label="Next banner"
        onClick={() => setActive((value) => (value + 1) % items.length)}
      >
        &rsaquo;
      </button>
      <div className="banner-dots">
        {items.map((item, index) => (
          <button
            key={item.imdbCode}
            type="button"
            className={index === active ? "active" : ""}
            aria-label={`Show ${item.title}`}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </div>
  );
}

export function BannerStrip({ items }: { items: VodCard[] }) {
  if (!items.length) return null;

  return (
    <section className="banner-strip">
      {items.map((item) => (
        <Link
          key={`banner-${item.imdbCode}`}
          href={`/${item.imdbCode}`}
          className="mini-banner"
          style={
            item.backdropUrl
              ? {
                  backgroundImage: `linear-gradient(90deg, rgba(5,5,5,0.88), rgba(5,5,5,0.2)), url(${sizedImageUrl(item.backdropUrl, 720)})`,
                }
              : undefined
          }
        >
          <span className="rating">{item.imdbRating ? `IMDb ${item.imdbRating.toFixed(1)}` : item.year ?? "Movie"}</span>
          <strong>{item.title}</strong>
        </Link>
      ))}
    </section>
  );
}
