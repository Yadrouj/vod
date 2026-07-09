"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";
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

      <div className="focus-track" aria-label="Featured focus rail">
        {items.map((item, index) => {
          const depth = (index - active + items.length) % items.length;
          const visibleDepth = Math.min(depth, 7);
          const isActive = depth === 0;
          return (
            <button
              key={item.imdbCode}
              type="button"
              className={`focus-card ${isActive ? "active" : ""}`}
              style={{
                transform: `translate(-50%, -50%) translateX(${isActive ? "clamp(-42px, -3vw, 0px)" : `${visibleDepth * 96}px`}) translateY(${visibleDepth * 9}px) scale(${isActive ? 1.24 : Math.max(0.38, 0.88 - visibleDepth * 0.08)})`,
                opacity: isActive ? 1 : Math.max(0.1, 0.55 - visibleDepth * 0.08),
                filter: isActive ? "none" : `blur(${Math.min(50, visibleDepth * 8)}px) saturate(${Math.max(0.18, 0.76 - visibleDepth * 0.08)})`,
                zIndex: items.length - visibleDepth,
              }}
              onClick={() => setActive(index)}
              aria-label={`Focus ${item.title}`}
            >
              <span
                className="focus-card-art"
                style={item.backdropUrl ? { backgroundImage: `url(${item.backdropUrl})` } : undefined}
              />
              <span className="focus-card-title">{item.title}</span>
              <span className="rating">IMDb {(item.imdbRating ?? 0).toFixed(1)}</span>
            </button>
          );
        })}
      </div>

      <div className="focus-controls">
        <button type="button" className="chip" onClick={() => setActive((value) => (value - 1 + items.length) % items.length)}>
          {t.common.previous}
        </button>
        <button type="button" className="chip active" onClick={() => setActive((value) => (value + 1) % items.length)}>
          {t.common.next}
        </button>
      </div>
    </section>
  );
}
