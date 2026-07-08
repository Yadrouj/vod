"use client";

import { useMemo, useRef, useState } from "react";
import { episodeLabel } from "@/lib/link-labels";
import type { VodLink } from "@/lib/types";

export function VodPlayer({
  title,
  posterUrl,
  links,
}: {
  title: string;
  posterUrl: string | null | undefined;
  links: VodLink[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [speed, setSpeed] = useState("1");
  const [volume, setVolume] = useState("0.85");
  const [subtitleUrl, setSubtitleUrl] = useState("");
  const active = links[activeIndex] ?? links[0];

  const sources = useMemo(
    () =>
      links.map((link, index) => ({
        ...link,
        label: [
          episodeLabel(link),
          link.quality ?? `Source ${index + 1}`,
          link.release ?? link.group ?? "file",
        ].filter(Boolean).join(" / "),
      })),
    [links]
  );

  function updateSpeed(value: string) {
    setSpeed(value);
    if (videoRef.current) videoRef.current.playbackRate = Number(value);
  }

  function updateVolume(value: string) {
    setVolume(value);
    if (videoRef.current) videoRef.current.volume = Number(value);
  }

  return (
    <div className="player-shell">
      <video
        ref={videoRef}
        key={`${active?.url}-${subtitleUrl}`}
        className="player"
        src={active?.url}
        poster={posterUrl ?? undefined}
        controls
        playsInline
        preload="metadata"
      >
        {subtitleUrl && <track kind="subtitles" src={subtitleUrl} label="Subtitle" default />}
      </video>

      <div className="player-controls">
        <label>
          <span className="label">Quality</span>
          <select className="select" value={activeIndex} onChange={(event) => setActiveIndex(Number(event.target.value))}>
            {sources.map((source, index) => (
              <option key={`${source.url}-${index}`} value={index}>
                {source.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Speed</span>
          <select className="select" value={speed} onChange={(event) => updateSpeed(event.target.value)}>
            {["0.5", "0.75", "1", "1.25", "1.5", "2"].map((value) => (
              <option key={value} value={value}>
                {value}x
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Volume</span>
          <input
            className="select"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(event) => updateVolume(event.target.value)}
          />
        </label>
        <label>
          <span className="label">Subtitle URL</span>
          <input
            className="search"
            value={subtitleUrl}
            onChange={(event) => setSubtitleUrl(event.target.value)}
            placeholder="Paste .vtt subtitle URL"
          />
        </label>
      </div>

      <p className="muted">
        Playing {title}. Browser playback depends on the file format and the remote server allowing streaming.
      </p>
    </div>
  );
}
