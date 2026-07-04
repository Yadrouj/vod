"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { Exercise } from "@/lib/types";
import { cn } from "./ui";
import { Icon } from "./icons";

/** Exercise thumbnail with a graceful fallback (some MuscleWiki posters 404). */
export function Thumb({
  src,
  className = "size-16",
}: {
  src: string | null;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div
        className={cn(
          "flex flex-shrink-0 items-center justify-center rounded-xl bg-card2 text-brand ring-1 ring-line",
          className
        )}
      >
        <Icon name="dumbbell" className="size-6" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className={cn(
        "flex-shrink-0 rounded-xl bg-card2 object-cover ring-1 ring-line",
        className
      )}
    />
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const color =
    {
      Novice: "bg-emerald-500/15 text-emerald-300",
      Beginner: "bg-emerald-500/15 text-emerald-300",
      Intermediate: "bg-amber-500/15 text-amber-300",
      Advanced: "bg-rose-500/15 text-rose-300",
    }[difficulty] ?? "bg-line text-muted";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        color
      )}
    >
      {difficulty}
    </span>
  );
}

function CardBody({ exercise }: { exercise: Exercise }) {
  return (
    <>
      <Thumb src={exercise.thumbnail} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-ink">{exercise.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {exercise.category}
          {exercise.primaryMuscles[0] ? ` · ${exercise.primaryMuscles[0]}` : ""}
        </p>
        <div className="mt-1.5">
          <DifficultyBadge difficulty={exercise.difficulty} />
        </div>
      </div>
    </>
  );
}

export default function ExerciseCard({
  exercise,
  href,
  onClick,
  accessory,
  className,
}: {
  exercise: Exercise;
  href?: string;
  onClick?: () => void;
  accessory?: ReactNode;
  className?: string;
}) {
  const base =
    "flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left ring-1 ring-line transition-colors";

  if (href) {
    return (
      <Link href={href} className={cn(base, "hover:bg-card2", className)}>
        <CardBody exercise={exercise} />
        {accessory ?? <Icon name="chevronRight" className="size-5 text-faint" />}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(base, "hover:bg-card2 active:brightness-95", className)}
    >
      <CardBody exercise={exercise} />
      {accessory}
    </button>
  );
}
