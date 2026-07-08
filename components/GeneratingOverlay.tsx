"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "./icons";

/**
 * A staged "designing your plan…" overlay. Cycles through steps with a progress
 * bar and pulsing icon so generation feels deliberate, then calls onDone.
 */
export default function GeneratingOverlay({
  steps,
  title,
  icon = "sparkles",
  onDone,
  stepMs = 700,
}: {
  steps: string[];
  title: string;
  icon?: IconName;
  onDone: () => void;
  stepMs?: number;
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (i >= steps.length) {
      const t = setTimeout(onDone, 320);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setI((v) => v + 1), stepMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, steps.length]);

  const pct = Math.min(100, Math.round((i / steps.length) * 100));

  return (
    <div className="fixed inset-x-0 inset-y-0 z-[80] mx-auto flex max-w-md flex-col items-center justify-center gap-6 bg-base/95 px-8 backdrop-blur-sm">
      {/* pulsing emblem */}
      <div className="relative flex size-24 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand/30" />
        <span className="absolute inset-2 animate-pulse rounded-full bg-brand/20" />
        <span className="relative flex size-16 items-center justify-center rounded-full bg-brand text-brandink shadow-[0_0_40px_-4px_rgb(184_242_74/0.7)]">
          <Icon name={icon} className="size-8" />
        </span>
      </div>

      <p className="text-lg font-extrabold text-ink">{title}</p>

      {/* steps */}
      <div className="w-full space-y-2">
        {steps.map((s, idx) => {
          const done = idx < i;
          const active = idx === i;
          return (
            <div
              key={idx}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                active ? "bg-card text-ink ring-1 ring-brand/40" : done ? "text-muted" : "text-faint opacity-50"
              }`}
            >
              <span className={`flex size-5 flex-shrink-0 items-center justify-center rounded-full ${done ? "bg-brand text-brandink" : active ? "bg-brand/20 text-brand" : "bg-card2 text-faint"}`}>
                {done ? <Icon name="check" className="size-3.5" /> : active ? <span className="size-2 animate-pulse rounded-full bg-brand" /> : <span className="size-1.5 rounded-full bg-faint" />}
              </span>
              {s}
            </div>
          );
        })}
      </div>

      {/* progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-card2">
        <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand2 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
