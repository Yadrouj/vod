"use client";

import { avatarPreset } from "@/lib/avatars";
import { cn } from "./ui";

/**
 * Community user avatar — a muscular bodybuilder bust drawn from one of the 10
 * presets (5 men / 5 women, young→old), with a user-chosen skin tone. Pure SVG,
 * no external images.
 */
export default function UserAvatar({
  avatarId,
  skin,
  size = "size-9",
  className,
  ring = true,
}: {
  avatarId: number;
  skin?: string;
  size?: string;
  className?: string;
  ring?: boolean;
}) {
  const p = avatarPreset(avatarId);
  const sk = skin || p.skin;
  const skinD = shade(sk, -16);
  const skinL = shade(sk, 10);
  const hairD = shade(p.hair, -12);
  const bg = shade(p.top, 4);

  return (
    <span
      className={cn(
        "relative flex-shrink-0 overflow-hidden rounded-full",
        ring && "ring-2 ring-white/15",
        size,
        className
      )}
      style={{ background: `radial-gradient(circle at 50% 28%, ${bg}, ${shade(p.top, -34)})` }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {/* traps + broad shoulders (skin) */}
        <ellipse cx="21" cy="76" rx="17" ry="16" fill={sk} />
        <ellipse cx="79" cy="76" rx="17" ry="16" fill={sk} />
        <path d="M28 62 Q50 56 72 62 L78 100 L22 100 Z" fill={sk} />
        {/* deltoid/bicep shading */}
        <ellipse cx="16" cy="80" rx="7" ry="9" fill={skinD} opacity="0.35" />
        <ellipse cx="84" cy="80" rx="7" ry="9" fill={skinD} opacity="0.35" />

        {/* tank top with V-neck */}
        <path d="M33 64 L41 64 L50 77 L59 64 L67 64 L72 100 L28 100 Z" fill={p.top} />
        <path d="M41 64 L50 77 L59 64" fill="none" stroke={shade(p.top, -18)} strokeWidth="1.2" />
        {/* pec hint */}
        <path d="M35 84 Q43 90 49 84" fill="none" stroke={shade(p.top, -16)} strokeWidth="1.4" opacity="0.6" />
        <path d="M51 84 Q57 90 65 84" fill="none" stroke={shade(p.top, -16)} strokeWidth="1.4" opacity="0.6" />

        {/* neck */}
        <path d="M43 54 h14 v9 c0 4 -14 4 -14 0 Z" fill={skinD} />

        {/* ears */}
        <circle cx="31.5" cy="40" r="4" fill={sk} />
        <circle cx="68.5" cy="40" r="4" fill={sk} />

        {/* head */}
        <path d="M32 37 C32 22 68 22 68 37 C68 50 61 59 50 59 C39 59 32 50 32 37 Z" fill={sk} />
        <path d="M32 37 C32 30 36 25 40 24 C36 30 36 40 40 46 C36 44 32 42 32 37 Z" fill={skinL} opacity="0.4" />

        {/* beard */}
        {p.beard === "beard" && (
          <path d="M34 40 C35 54 42 60 50 60 C58 60 65 54 66 40 C63 48 57 51 50 51 C43 51 37 48 34 40 Z" fill={hairD} />
        )}
        {p.beard === "grayBeard" && (
          <path d="M34 40 C35 54 42 60 50 60 C58 60 65 54 66 40 C63 48 57 51 50 51 C43 51 37 48 34 40 Z" fill={p.hair} />
        )}
        {p.beard === "stubble" && (
          <path d="M35 42 C37 53 43 58 50 58 C57 58 63 53 65 42 C62 49 57 51 50 51 C43 51 38 49 35 42 Z" fill={p.hair} opacity="0.28" />
        )}

        {/* eyebrows + eyes */}
        <path d="M38 36 q4 -2.4 8 0" stroke={hairD} strokeWidth="1.7" fill="none" strokeLinecap="round" />
        <path d="M54 36 q4 -2.4 8 0" stroke={hairD} strokeWidth="1.7" fill="none" strokeLinecap="round" />
        <circle cx="42" cy="40" r="1.9" fill="#2a2320" />
        <circle cx="58" cy="40" r="1.9" fill="#2a2320" />
        {/* nose + mouth */}
        <path d="M50 41 v4 q-1.8 1.3 -3.2 1" stroke={skinD} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M45.5 50 q4.5 2.6 9 0" stroke={shade(sk, -28)} strokeWidth="1.6" fill="none" strokeLinecap="round" />

        {/* hair */}
        {p.hairStyle === "short" && (
          <path d="M31 38 C30 21 70 21 69 38 C69 33 65 28 61 27 C57 23 43 23 39 27 C35 28 31 33 31 38 Z" fill={p.hair} />
        )}
        {p.hairStyle === "buzz" && (
          <path d="M32 37 C32 23 68 23 68 37 C65 30 59 27 50 27 C41 27 35 30 32 37 Z" fill={p.hair} opacity="0.9" />
        )}
        {p.hairStyle === "quiff" && (
          <path d="M32 37 C31 25 41 18 53 20 C47 22 45 25 45 28 C57 23 68 26 69 38 C67 30 60 28 52 29 C44 29 35 30 32 37 Z" fill={p.hair} />
        )}
        {p.hairStyle === "bald" && (
          <path d="M34 32 C38 25 46 23 50 23 C54 23 62 25 66 32 C61 29 56 28 50 28 C44 28 39 29 34 32 Z" fill={p.hair} opacity="0.85" />
        )}
        {p.hairStyle === "pony" && (
          <>
            <path d="M63 36 C73 38 79 50 75 64 C73 55 69 51 63 49 Z" fill={hairD} />
            <path d="M33 37 C32 22 68 22 67 37 C65 28 59 25 50 25 C41 25 35 28 33 37 Z" fill={p.hair} />
          </>
        )}
        {p.hairStyle === "bun" && (
          <>
            <circle cx="50" cy="18" r="5.5" fill={p.hair} />
            <path d="M33 37 C32 23 68 23 67 37 C65 29 59 26 50 26 C41 26 35 29 33 37 Z" fill={p.hair} />
          </>
        )}
        {p.hairStyle === "bob" && (
          <path d="M31 38 C30 20 70 20 69 38 L70 54 C66 50 63 46 63 40 C58 36 42 36 37 40 C37 46 34 50 30 54 Z" fill={p.hair} />
        )}
        {p.hairStyle === "wavy" && (
          <path d="M30 38 C29 19 71 19 70 38 L72 58 Q66 50 65 42 C60 37 40 37 35 42 Q34 50 28 58 Z" fill={p.hair} />
        )}
        {p.hairStyle === "shortF" && (
          <path d="M32 38 C31 22 69 22 68 38 C66 30 59 27 50 27 C41 27 34 30 32 38 Z" fill={p.hair} />
        )}
      </svg>
    </span>
  );
}

function shade(hex: string, pct: number): string {
  const h = hex.replace("#", "");
  const num = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const amt = Math.round(2.55 * pct);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
