"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  label: string;
};

export function MusicHorizontalRail({ children, className = "", label }: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canMoveBack, setCanMoveBack] = useState(false);
  const [canMoveForward, setCanMoveForward] = useState(false);

  const updateControls = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    setCanMoveBack(rail.scrollLeft > 3);
    setCanMoveForward(rail.scrollLeft < maxScroll - 3);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const frame = window.requestAnimationFrame(updateControls);
    const observer = new ResizeObserver(updateControls);
    observer.observe(rail);
    rail.addEventListener("scroll", updateControls, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      rail.removeEventListener("scroll", updateControls);
    };
  }, [children, updateControls]);

  function move(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.firstElementChild as HTMLElement | null;
    const styles = window.getComputedStyle(rail);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 12;
    const step = (card?.getBoundingClientRect().width ?? Math.min(190, rail.clientWidth * 0.44)) + gap;
    rail.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  return (
    <div className="music-horizontal-viewport">
      <div ref={railRef} className={`music-horizontal-track ${className}`} aria-label={label} dir="ltr">
        {children}
      </div>
      {canMoveBack && (
        <button className="music-horizontal-arrow is-left" type="button" onClick={() => move(-1)} aria-label="نمایش موارد قبلی">
          <ChevronLeft aria-hidden="true" />
        </button>
      )}
      {canMoveForward && (
        <button className="music-horizontal-arrow is-right" type="button" onClick={() => move(1)} aria-label="نمایش موارد بعدی">
          <ChevronRight aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
