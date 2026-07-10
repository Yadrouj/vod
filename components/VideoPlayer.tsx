"use client";

import { useState } from "react";
import type { Exercise, Gender, VideoClip } from "@/lib/types";
import { proxiedVideo, videoSrc } from "@/lib/media";
import { cn } from "./ui";
import { LogoMark } from "./Logo";

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

  return (
    <VideoPlayerInner
      key={`${exercise.id}-${gender}-${angle}`}
      clips={clips}
      angle={angle}
      loopAutoplay={loopAutoplay}
      showAngles={showAngles}
      className={className}
    />
  );
}

function VideoPlayerInner({
  clips,
  angle,
  loopAutoplay,
  showAngles,
  className,
}: {
  clips: VideoClip[];
  angle: string;
  loopAutoplay: boolean;
  showAngles: boolean;
  className?: string;
}) {
  const initial = Math.max(
    0,
    clips.findIndex((c) => c.angle === angle)
  );
  const [idx, setIdx] = useState(initial);
  const clip = clips[idx] ?? clips[0];
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedLocalUrl, setFailedLocalUrl] = useState<string | null>(null);

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

  const useRemoteFallback = failedLocalUrl === clip.url;
  const loading = loadedUrl !== clip.url;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black ring-1 ring-line">
        <video
          key={`${clip.url}-${useRemoteFallback ? "remote" : "local"}`}
          src={useRemoteFallback ? proxiedVideo(clip.url) : videoSrc(clip)}
          poster={clip.poster ?? undefined}
          controls={!loopAutoplay}
          loop
          muted={loopAutoplay}
          autoPlay={loopAutoplay}
          playsInline
          preload="metadata"
          onLoadedData={() => setLoadedUrl(clip.url)}
          onCanPlay={() => setLoadedUrl(clip.url)}
          onError={() => {
            if (clip.localUrl && !useRemoteFallback) {
              setFailedLocalUrl(clip.url);
              return;
            }
            setLoadedUrl(clip.url);
          }}
          className="h-full w-full object-contain"
        />
        {loading && !clip.poster && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <LogoMark className="size-10 drop-shadow-[0_0_16px_rgb(184_242_74/0.45)]" />
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
