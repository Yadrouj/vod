"use client";

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
}: {
  name: string;
  kind: string;
  image?: string | null;
}) {
  const [imgOk, setImgOk] = useState(true);
  const [a, b] = PALETTES[seed(name) % PALETTES.length];
  const icon = KIND_ICON[kind] ?? "pin";

  return (
    <div className="relative h-28 w-full overflow-hidden rounded-3xl ring-1 ring-line">
      {image && imgOk ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="h-full w-full object-cover" onError={() => setImgOk(false)} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </>
      ) : (
        <div className="relative h-full w-full" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
          <Icon name={icon} className="absolute -right-4 -top-3 size-32 text-white/10" />
          <Icon name={icon} className="absolute bottom-2 left-4 size-10 text-white/25" />
        </div>
      )}
      <p className="absolute bottom-2 right-3 max-w-[80%] truncate text-lg font-extrabold text-white drop-shadow">
        {name}
      </p>
    </div>
  );
}
