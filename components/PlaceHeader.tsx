"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Icon, type IconName } from "./icons";

const KIND_ICON: Record<string, IconName> = {
  gym: "dumbbell",
  pool: "diet",
  sports: "store",
  pharmacy: "pill",
  supplement: "pill",
  medical: "pill",
};

const PALETTES = [
  ["#2e7d32", "#0b3d1a"],
  ["#1e6fa8", "#0a2c44"],
  ["#7a4dd1", "#2a1550"],
  ["#c0416b", "#450f24"],
  ["#b7861f", "#3d2a06"],
  ["#1f8a7a", "#062e29"],
];

function seed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Decorative header banner for a gym/store profile. Uses a real photo when the
 * dataset has an `image` URL; otherwise a seeded gradient + faint kind icon
 * (no fake per-place photos — OSM rarely carries images and stock photos of a
 * specific business can't be licensed reliably).
 */
export default function PlaceHeader({
  name,
  kind,
  image,
  subtitle,
  meta,
  top,
  children,
}: {
  name: string;
  kind: string;
  image?: string | null;
  subtitle?: string | null;
  meta?: ReactNode;
  top?: ReactNode;
  children?: ReactNode;
}) {
  const [imgOk, setImgOk] = useState(true);
  const [a, b] = PALETTES[seed(name) % PALETTES.length];
  const icon = KIND_ICON[kind] ?? "pin";

  return (
    <section className="relative -mx-4 -mt-6 overflow-hidden bg-black px-4 pb-7 pt-6">
      {image && imgOk ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover" onError={() => setImgOk(false)} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
          <Icon name={icon} className="absolute -right-4 -top-3 size-32 text-white/10" />
          <Icon name={icon} className="absolute bottom-8 left-4 size-20 text-white/15" />
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.86)_0%,rgba(0,0,0,0.62)_18%,rgba(0,0,0,0.2)_42%,rgba(0,0,0,0.9)_72%,rgba(0,0,0,0.98)_100%),linear-gradient(90deg,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.2)_50%,rgba(0,0,0,0.72)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[58%] bg-[radial-gradient(ellipse_at_bottom,rgba(0,0,0,0.98)_0%,rgba(0,0,0,0.76)_42%,rgba(0,0,0,0)_76%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(0,0,0,0.98)_0%,rgba(0,0,0,0)_100%)]" />
      <div className="relative z-10 text-white">
        {top && <div className="mb-10 flex items-center justify-end">{top}</div>}
        <div className="flex min-h-[410px] flex-col justify-end pb-5">
          <div className="max-w-[92%] pb-1">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand">
              {kind}
            </p>
            <h1 className="mt-1 line-clamp-2 text-4xl font-black leading-tight drop-shadow-[0_10px_24px_rgba(0,0,0,0.98)]">
              {name}
            </h1>
            {subtitle && <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-white/72">{subtitle}</p>}
            {meta && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-white/80">{meta}</div>}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}
