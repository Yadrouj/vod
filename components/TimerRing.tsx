"use client";

import { formatTime } from "@/lib/timer";
import { useLang } from "./LangProvider";

export default function TimerRing({
  remainingSec,
  totalSec,
  size = 232,
  accent = "#b8f24a",
  caption,
}: {
  remainingSec: number;
  totalSec: number;
  size?: number;
  accent?: string;
  caption?: string;
}) {
  const { n } = useLang();
  const stroke = 14;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const frac = totalSec > 0 ? Math.min(1, Math.max(0, remainingSec / totalSec)) : 0;
  const offset = c * (1 - frac);

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      aria-label="timer"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#29324b"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.25s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-extrabold tabular-nums text-ink">
          {n(formatTime(remainingSec))}
        </span>
        {caption && (
          <span className="mt-1 text-sm font-medium text-muted">{caption}</span>
        )}
      </div>
    </div>
  );
}
