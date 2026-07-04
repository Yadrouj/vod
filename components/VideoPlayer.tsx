"use client";

import { useEffect, useState } from "react";
import type { Exercise, Gender, VideoClip } from "@/lib/types";
import { proxiedVideo } from "@/lib/media";
import { cn } from "./ui";

/** Prefer the requested gender's clips; fall back to the other gender if empty. */
export function pickClips(exercise: Exercise, gender: Gender): VideoClip[] {
  const primary = exercise.videos[gender];
  if (primary.length) return primary;
  return exercise.videos[gender === "male" ? "female" : "male"];
}

export default function VideoPlayer({
  exercise,
  gender,
  angle = "front",
  loopAutoplay = false,
  showAngles = true,
  className,
}: {
  exercise: Exercise;
  gender: Gender;
  angle?: string;
  loopAutoplay?: boolean;
  showAngles?: boolean;
  className?: string;
}) {
  const clips = pickClips(exercise, gender);
  const initial = Math.max(
    0,
    clips.findIndex((c) => c.angle === angle)
  );
  const [idx, setIdx] = useState(initial);

  // Reset when the exercise or gender changes (different clip set).
  useEffect(() => {
    const i = clips.findIndex((c) => c.angle === angle);
    setIdx(i >= 0 ? i : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id, gender]);

  const clip = clips[idx] ?? clips[0];

  if (!clip) {
    return (
      <div
        className={cn(
          "flex aspect-square w-full items-center justify-center rounded-2xl bg-card2 text-muted ring-1 ring-line",
          className
        )}
      >
        No demo video
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <video
        key={clip.url}
        src={proxiedVideo(clip.url)}
        poster={clip.poster ?? undefined}
        controls={!loopAutoplay}
        loop
        muted={loopAutoplay}
        autoPlay={loopAutoplay}
        playsInline
        preload="metadata"
        className="aspect-square w-full rounded-2xl bg-black object-contain ring-1 ring-line"
      />
      {showAngles && clips.length > 1 && (
        <div className="flex justify-center gap-2">
          {clips.map((c, i) => (
            <button
              key={c.url}
              type="button"
              onClick={() => setIdx(i)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold capitalize transition-colors",
                i === idx
                  ? "bg-brand text-brandink"
                  : "bg-card2 text-muted ring-1 ring-line"
              )}
            >
              {c.angle}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
