"use client";

import { useState } from "react";
import type { AvatarSpec, Trainer } from "@/lib/marketplace";
import { cn } from "./ui";

/**
 * Trainer avatar. If the persona has a real photo file (public/trainers/<id>.jpg)
 * it's used; otherwise we render a clean, professional *illustrated portrait*
 * (a distinct flat headshot per coach) — far more realistic and personal than an
 * initial, and fully self-contained (no external images, CSP-safe).
 */
export default function TrainerAvatar({
  trainer,
  size = "size-9",
  className,
  ring = true,
}: {
  trainer: Trainer;
  size?: string;
  className?: string;
  ring?: boolean;
}) {
  const [imgOk, setImgOk] = useState(true);
  const showPhoto = Boolean(trainer.photo) && imgOk;
  return (
    <span
      className={cn(
        "relative flex-shrink-0 overflow-hidden rounded-full",
        ring && "ring-2 ring-white/15",
        size,
        className
      )}
      style={{
        background: `radial-gradient(circle at 50% 32%, ${trainer.color}dd, ${trainer.color}66 62%, ${trainer.color}33)`,
      }}
      aria-hidden
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trainer.photo}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setImgOk(false)}
        />
      ) : (
        <Portrait spec={trainer.avatar} />
      )}
    </span>
  );
}

/** Parametric flat-illustration headshot. */
function Portrait({ spec }: { spec: AvatarSpec }) {
  const { skin, hair, hairStyle, beard = "none", top } = spec;
  const skinDark = shade(skin, -18);
  const hairDark = shade(hair, -14);
  const long = hairStyle === "wavy" || hairStyle === "bob" || hairStyle === "pony";

  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
      {/* shoulders / athletic top */}
      <path d="M14 100 V92 C14 78 30 70 50 70 C70 70 86 78 86 92 V100 Z" fill={top} />
      <path d="M50 70 C60 70 68 72 74 76 L50 84 L26 76 C32 72 40 70 50 70 Z" fill={shade(top, 12)} opacity="0.6" />

      {/* behind-hair for long styles */}
      {hairStyle === "wavy" && (
        <path d="M24 40 C24 20 76 20 76 40 L78 74 C70 66 66 60 66 52 L34 52 C34 60 30 66 22 74 Z" fill={hair} />
      )}
      {hairStyle === "bob" && (
        <path d="M25 40 C25 20 75 20 75 40 L76 66 C70 62 66 58 66 50 L34 50 C34 58 30 62 24 66 Z" fill={hair} />
      )}
      {hairStyle === "pony" && (
        <>
          <path d="M64 40 C74 42 80 54 76 70 C74 60 70 56 64 54 Z" fill={hairDark} />
        </>
      )}

      {/* neck */}
      <path d="M43 60 h14 v10 c0 4 -14 4 -14 0 Z" fill={skinDark} />

      {/* ears */}
      <circle cx="30.5" cy="45" r="4.2" fill={skin} />
      <circle cx="69.5" cy="45" r="4.2" fill={skin} />

      {/* head */}
      <path
        d="M31 42 C31 27 69 27 69 42 C69 55 62 64 50 64 C38 64 31 55 31 42 Z"
        fill={skin}
      />

      {/* beard / stubble */}
      {beard === "beard" && (
        <path d="M33 44 C34 58 42 66 50 66 C58 66 66 58 67 44 C64 52 58 56 50 56 C42 56 36 52 33 44 Z" fill={hairDark} />
      )}
      {beard === "stubble" && (
        <path d="M34 46 C36 57 43 64 50 64 C57 64 64 57 66 46 C63 53 57 56 50 56 C43 56 37 53 34 46 Z" fill={hair} opacity="0.28" />
      )}

      {/* eyebrows */}
      <path d="M37 41 q4 -2.5 8 0" stroke={hairDark} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M55 41 q4 -2.5 8 0" stroke={hairDark} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* eyes */}
      <circle cx="41" cy="45.5" r="2" fill="#2a2320" />
      <circle cx="59" cy="45.5" r="2" fill="#2a2320" />
      {/* nose + mouth */}
      <path d="M50 47 v4 q-2 1.5 -3.5 1.2" stroke={skinDark} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M45 55.5 q5 3 10 0" stroke={shade(skin, -30)} strokeWidth="1.7" fill="none" strokeLinecap="round" />

      {/* front hair by style */}
      {hairStyle === "short" && (
        <path d="M30 43 C29 25 71 25 70 43 C70 38 66 33 62 32 C58 28 42 28 38 32 C34 33 30 38 30 43 Z" fill={hair} />
      )}
      {hairStyle === "buzz" && (
        <path d="M31 42 C31 28 69 28 69 42 C66 35 60 32 50 32 C40 32 34 35 31 42 Z" fill={hair} opacity="0.92" />
      )}
      {hairStyle === "quiff" && (
        <path d="M31 42 C30 30 40 22 52 24 C46 26 44 29 44 32 C56 27 68 30 69 43 C67 35 60 33 52 34 C44 34 34 35 31 42 Z" fill={hair} />
      )}
      {hairStyle === "bun" && (
        <>
          <circle cx="50" cy="22" r="6" fill={hair} />
          <path d="M32 43 C31 28 69 28 68 43 C66 34 60 31 50 31 C40 31 34 34 32 43 Z" fill={hair} />
        </>
      )}
      {hairStyle === "pony" && (
        <path d="M32 43 C31 27 69 27 68 43 C66 33 60 30 50 30 C40 30 34 33 32 43 Z" fill={hair} />
      )}
      {(hairStyle === "wavy" || hairStyle === "bob") && (
        <path d="M31 43 C30 26 70 26 69 43 C66 33 60 30 50 30 C40 30 34 33 31 43 Z" fill={hairDark} opacity="0.55" />
      )}

      {/* hijab (headscarf) — drawn over hair + neck */}
      {hairStyle === "hijab" && (
        <>
          <path d="M27 46 C24 24 76 24 73 46 C73 40 68 34 50 34 C32 34 27 40 27 46 Z" fill={hair} />
          <path d="M27 46 C27 60 30 70 34 78 L22 82 C18 66 20 52 27 46 Z" fill={hair} />
          <path d="M73 46 C73 60 70 70 66 78 L78 82 C82 66 80 52 73 46 Z" fill={hair} />
          <path d="M31 44 C33 33 44 30 50 30 C56 30 67 33 69 44 C64 40 58 39 50 39 C42 39 36 40 31 44 Z" fill={shade(hair, 10)} />
        </>
      )}
      {long && !["hijab"].includes(hairStyle) && (
        <circle cx="30.5" cy="45" r="4.2" fill="none" />
      )}
    </svg>
  );
}

/** Lighten/darken a #rrggbb hex by pct (−100..100). */
function shade(hex: string, pct: number): string {
  const h = hex.replace("#", "");
  const num = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const amt = Math.round(2.55 * pct);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
