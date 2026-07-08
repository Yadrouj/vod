"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { VodCard } from "@/lib/types";

export function BannerCarousel({ items }: { items: VodCard[] }) {
  const [active, setActive] = useState(0);
  const current = items[active] ?? items[0];

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
              backgroundImage: `linear-gradient(90deg, rgba(5,5,5,0.98), rgba(5,5,5,0.55), rgba(5,5,5,0.24)), url(${current.backdropUrl})`,
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
          <span>{current.type}</span>
          <i className="dot" />
          <span>{current.year ?? "-"}</span>
          <i className="dot" />
          <span>IMDb {(current.imdbRating ?? 0).toFixed(1)}</span>
        </div>
        <h1>{current.title}</h1>
        {current.overview && <p>{current.overview}</p>}
        <div className="chips">
          <Link className="play-glow" href={`/watch/${current.imdbCode}`}>
            <span className="play-dot" /> Play online
          </Link>
          <Link className="chip" href={`/${current.imdbCode}`}>
            Details
          </Link>
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
                  backgroundImage: `linear-gradient(90deg, rgba(5,5,5,0.88), rgba(5,5,5,0.2)), url(${item.backdropUrl})`,
                }
              : undefined
          }
        >
          <span className="rating">IMDb {(item.imdbRating ?? 0).toFixed(1)}</span>
          <strong>{item.title}</strong>
        </Link>
      ))}
    </section>
  );
}
