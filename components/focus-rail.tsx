"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
          const depth = (index - active + items.length) % items.length;
          const visibleDepth = Math.min(depth, 7);
          const isActive = depth === 0;
          return (
            <button
              key={item.imdbCode}
              type="button"
              className={`focus-card ${isActive ? "active" : ""}`}
              style={{
                transform: `translate(-50%, -50%) translateX(${isActive ? "clamp(-80px, -6vw, -24px)" : `${-16 + visibleDepth * 88}px`}) translateY(${visibleDepth * 8}px) scale(${isActive ? 1.16 : Math.max(0.52, 0.94 - visibleDepth * 0.08)})`,
                opacity: isActive ? 1 : Math.max(0.1, 0.68 - visibleDepth * 0.1),
                filter: isActive ? "none" : `blur(${Math.min(50, visibleDepth * 7)}px) saturate(${Math.max(0.18, 0.82 - visibleDepth * 0.08)})`,
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
          Prev
        </button>
        <button type="button" className="chip active" onClick={() => setActive((value) => (value + 1) % items.length)}>
          Next
        </button>
      </div>
    </section>
  );
}
