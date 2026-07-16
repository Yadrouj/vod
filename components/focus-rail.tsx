"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";
import { sizedImageUrl } from "@/lib/image-url";
import type { VodCard } from "@/lib/types";

export function FocusRail({ items, locale = DEFAULT_LOCALE }: { items: VodCard[]; locale?: Locale }) {
  const [active, setActive] = useState(0);
  const current = items[active] ?? items[0];
  const t = getDictionary(locale);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % items.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [items.length]);

  if (!current) return null;

  return (
    <section className="focus-rail">
      <div className="focus-panel">
        <div>
          <p className="label">{t.home.spotlight}</p>
          <h2>{current.title}</h2>
          <p className="muted">{current.overview ?? current.genres.slice(0, 3).join(" / ")}</p>
        </div>
        <div className="chips">
          <Link className="play-glow" href={`/watch/${current.imdbCode}`}>
            <span className="play-dot" /> {t.common.play}
          </Link>
          <Link className="hover-button" href={`/${current.imdbCode}`}>
            {t.common.details}
          </Link>
        </div>
      </div>

      <div
        className="focus-track"
        aria-label="Featured focus rail"
        style={current.backdropUrl || current.posterUrl ? {
          backgroundImage: `linear-gradient(90deg, rgba(5,5,7,0.04), rgba(5,5,7,0.32)), url(${sizedImageUrl(current.backdropUrl ?? current.posterUrl, 1280)})`,
        } : undefined}
      >
        <div className="focus-gallery-copy">{current.title}</div>
        <div className="focus-gallery-thumbs">
        {items.map((item, index) => {
          const depth = (index - active + items.length) % items.length;
          const visibleDepth = Math.min(depth, 7);
          const isActive = depth === 0;
          const angle = (index / items.length) * 360 - 90;
          return (
            <button
              key={item.imdbCode}
              type="button"
              className={`focus-card ${isActive ? "active" : ""}`}
              style={{
                background: "linear-gradient(135deg, #303038, #09090b)",
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(clamp(-210px, -14vw, -130px)) rotate(${-angle}deg) scale(${isActive ? 1.18 : 0.82})`,
                opacity: isActive ? 1 : 0.72,
                filter: isActive ? "none" : "saturate(0.72)",
                zIndex: items.length - visibleDepth,
              }}
              onClick={() => setActive(index)}
              aria-label={`Focus ${item.title}`}
            >
              <img
                className="focus-card-art"
                src={sizedImageUrl(item.backdropUrl ?? item.posterUrl, 260) ?? undefined}
                alt=""
                loading="lazy"
                decoding="async"
              />
              <span className="focus-card-title">{item.title}</span>
              <span className="rating">{item.imdbRating ? `IMDb ${item.imdbRating.toFixed(1)}` : item.year ?? t.common.movie}</span>
            </button>
          );
        })}
        </div>
        <div className="focus-controls">
          <button type="button" className="chip" onClick={() => setActive((value) => (value - 1 + items.length) % items.length)} aria-label="Previous">‹</button>
          <button type="button" className="chip active" onClick={() => setActive((value) => (value + 1) % items.length)} aria-label="Next">›</button>
        </div>
      </div>
    </section>
  );
}
