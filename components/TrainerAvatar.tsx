"use client";

import type { Trainer } from "@/lib/marketplace";
import { useLang } from "./LangProvider";
import { cn } from "./ui";

/** Initials avatar with a per-trainer gradient — no external images needed. */
export default function TrainerAvatar({
  trainer,
  size = "size-9",
  className,
}: {
  trainer: Trainer;
  size?: string;
  className?: string;
}) {
  const { lang } = useLang();
  const initial = (lang === "fa" ? trainer.nameFa : trainer.name)
    .replace(/^دکتر\s|^Dr\.\s/i, "")
    .trim()
    .charAt(0);
  return (
    <span
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-full font-extrabold text-white ring-2 ring-white/20",
        size,
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${trainer.color}, ${trainer.color}66)`,
        textShadow: "0 1px 2px rgb(0 0 0 / 0.4)",
      }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
