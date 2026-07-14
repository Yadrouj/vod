"use client";

import { useRef, useState } from "react";
import { PosterCard } from "@/components/poster-card";
import type { Locale } from "@/lib/i18n";
import type { VodCard } from "@/lib/types";

export function PosterRail({ items, locale, href }: { items: VodCard[]; locale: Locale; href: string }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  const move = (direction: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>(".poster");
    const step = (card?.getBoundingClientRect().width ?? 150) + 12;
    const maxPosition = Math.max(0, Math.min(items.length, 15) - 6);
    const next = Math.min(maxPosition, Math.max(0, position + direction));
    rail.scrollTo({ left: next * step, behavior: "smooth" });
    setPosition(next);
  };

  return (
    <>
      <div className="poster-rail-viewport">
        <div className="poster-rail" ref={railRef}>
          {items.slice(0, 15).map((item) => <PosterCard key={item.imdbCode || item.id} item={item} locale={locale} />)}
        </div>
        {position > 0 && <button className="poster-rail-arrow poster-rail-arrow-left" type="button" onClick={() => move(-1)} aria-label="Previous films">‹</button>}
        {position < Math.max(0, Math.min(items.length, 15) - 6) && <button className="poster-rail-arrow poster-rail-arrow-right" type="button" onClick={() => move(1)} aria-label="Next films">›</button>}
      </div>
    </>
  );
}
