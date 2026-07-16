"use client";

import { useEffect, useState } from "react";

export function PosterRailControls({ railId }: { railId: string }) {
  const [position, setPosition] = useState(0);
  const [maxPosition, setMaxPosition] = useState(0);

  useEffect(() => {
    const rail = document.getElementById(railId);
    if (!rail) return;
    const update = () => {
      const card = rail.querySelector<HTMLElement>(".poster");
      const step = (card?.getBoundingClientRect().width ?? 150) + 12;
      setMaxPosition(Math.max(0, Math.ceil((rail.scrollWidth - rail.clientWidth) / step)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [railId]);

  const move = (direction: number) => {
    const rail = document.getElementById(railId);
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>(".poster");
    const step = (card?.getBoundingClientRect().width ?? 150) + 12;
    const next = Math.min(maxPosition, Math.max(0, position + direction));
    rail.scrollTo({ left: next * step, behavior: "smooth" });
    setPosition(next);
  };

  return (
    <>
      {position > 0 && (
        <button className="poster-rail-arrow poster-rail-arrow-left" type="button" onClick={() => move(-1)} aria-label="Previous films">‹</button>
      )}
      {position < maxPosition && (
        <button className="poster-rail-arrow poster-rail-arrow-right" type="button" onClick={() => move(1)} aria-label="Next films">›</button>
      )}
    </>
  );
}
