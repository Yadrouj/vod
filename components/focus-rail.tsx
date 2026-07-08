"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { VodCard } from "@/lib/types";

export function FocusRail({ items }: { items: VodCard[] }) {
  const [active, setActive] = useState(0);
  const current = items[active] ?? items[0];

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
          <p className="label">Spotlight Rail</p>
          <h2>{current.title}</h2>
          <p className="muted">{current.overview ?? current.genres.slice(0, 3).join(" / ")}</p>
        </div>
        <div className="chips">
          <Link className="play-glow" href={`/watch/${current.imdbCode}`}>
            <span className="play-dot" /> Play
          </Link>
          <Link className="hover-button" href={`/${current.imdbCode}`}>
            Details
          </Link>
        </div>
      </div>

      <div className="focus-track" aria-label="Featured focus rail">
        {items.map((item, index) => {
          const offset = index - active;
          const abs = Math.abs(offset);
          const isActive = index === active;
          return (
            <button
              key={item.imdbCode}
              type="button"
              className={`focus-card ${isActive ? "active" : ""}`}
              style={{ "--offset": String(offset), "--abs": String(abs) } as CSSProperties}
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
          Prev
        </button>
        <button type="button" className="chip active" onClick={() => setActive((value) => (value + 1) % items.length)}>
          Next
        </button>
      </div>
    </section>
  );
}
