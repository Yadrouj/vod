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
  const [loading, setLoading] = useState(true);

  // Reset when the exercise or gender changes (different clip set).
  useEffect(() => {
    const i = clips.findIndex((c) => c.angle === angle);
    setIdx(i >= 0 ? i : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id, gender]);

  const clip = clips[idx] ?? clips[0];

  // Show a spinner while the current clip buffers (first play streams via the
  // proxy). Reset on clip change so it never looks frozen.
  useEffect(() => {
    setLoading(true);
  }, [clip?.url]);

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
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black ring-1 ring-line">
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
          onLoadedData={() => setLoading(false)}
          onCanPlay={() => setLoading(false)}
          onError={() => setLoading(false)}
          className="h-full w-full object-contain"
        />
        {loading && !clip.poster && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="size-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        )}
      </div>
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
