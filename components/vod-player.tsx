"use client";

import { useMemo, useRef, useState } from "react";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";
import { episodeLabel } from "@/lib/link-labels";
import type { VodLink } from "@/lib/types";

type CastableVideo = HTMLVideoElement & {
  webkitShowPlaybackTargetPicker?: () => void;
  remote?: {
    prompt?: () => Promise<void>;
  };
};

export function VodPlayer({
  title,
  posterUrl,
  links,
  locale = DEFAULT_LOCALE,
}: {
  title: string;
  posterUrl: string | null | undefined;
  links: VodLink[];
  locale?: Locale;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [speed, setSpeed] = useState("1");
  const [volume, setVolume] = useState("0.85");
  const [subtitleUrl, setSubtitleUrl] = useState("");
  const [paused, setPaused] = useState(true);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const active = links[activeIndex] ?? links[0];
  const t = getDictionary(locale);

  const sources = useMemo(
    () =>
      links.map((link, index) => ({
        ...link,
        label: [
          episodeLabel(link),
          link.quality ?? `${t.player.source} ${index + 1}`,
          link.release ?? link.group ?? t.common.file,
        ].filter(Boolean).join(" / "),
      })),
    [links, t.common.file, t.player.source]
  );

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => setMessage(t.player.playbackBlocked));
    } else {
      video.pause();
    }
  }

  function seek(value: string) {
    const video = videoRef.current;
    if (!video) return;
    const next = Number(value);
    video.currentTime = next;
    setTime(next);
  }

  function skip(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
  }

  function updateSpeed(value: string) {
    setSpeed(value);
    if (videoRef.current) videoRef.current.playbackRate = Number(value);
  }

  function updateVolume(value: string) {
    setVolume(value);
    if (videoRef.current) videoRef.current.volume = Number(value);
  }

  function changeSource(value: string) {
    setActiveIndex(Number(value));
    setPaused(true);
    setTime(0);
  }

  async function toggleFullscreen() {
    const el = videoRef.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen();
    }
  }

  async function openPictureInPicture() {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) {
      setMessage(t.player.pipUnavailable);
      return;
    }
    try {
      await video.requestPictureInPicture();
    } catch {
      setMessage(t.player.pipFailed);
    }
  }

  async function castVideo() {
    const video = videoRef.current as CastableVideo | null;
    if (!video) return;
    try {
      if (video.remote?.prompt) {
        await video.remote.prompt();
        return;
      }
      if (video.webkitShowPlaybackTargetPicker) {
        video.webkitShowPlaybackTargetPicker();
        return;
      }
      setMessage(t.player.castUnavailable);
    } catch {
      setMessage(t.player.castFailed);
    }
  }

  return (
    <div className="player-shell">
      <div className="pro-player">
        <video
          ref={videoRef}
          key={`${active?.url}-${subtitleUrl}`}
          className="player"
          src={active?.url}
          poster={posterUrl ?? undefined}
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onError={() => setMessage(t.player.sourceError)}
        >
          {subtitleUrl && <track kind="subtitles" src={subtitleUrl} label="Subtitle" default />}
        </video>

        <button className="player-center" type="button" onClick={togglePlay} aria-label={paused ? t.common.play : t.player.pause}>
          <span className={paused ? "player-play-icon" : "player-pause-icon"} />
        </button>

        <div className="player-top-glass">
          <strong>{title}</strong>
          <span>{active?.quality ?? t.player.source} / {active?.release ?? active?.group ?? t.player.stream}</span>
        </div>

        <div className="player-osd">
          {message && <span>{message}</span>}
        </div>

        <div className="player-bar">
          <input
            className="player-timeline"
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(time, duration || 0)}
            onChange={(event) => seek(event.target.value)}
            aria-label="Seek"
          />

          <div className="player-actions">
            <button type="button" className="player-btn" onClick={togglePlay}>{paused ? t.common.play : t.player.pause}</button>
            <button type="button" className="player-btn" onClick={() => skip(-10)}>-10</button>
            <button type="button" className="player-btn" onClick={() => skip(10)}>+10</button>
            <span className="player-time">{formatTime(time)} / {formatTime(duration)}</span>
            <label className="player-volume">
              <span>{t.player.volume}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(event) => updateVolume(event.target.value)}
              />
            </label>
            <button type="button" className="player-btn" onClick={castVideo}>{t.player.cast}</button>
            <button type="button" className="player-btn" onClick={openPictureInPicture}>PiP</button>
            <button type="button" className="player-btn" onClick={toggleFullscreen}>{t.player.full}</button>
            <button type="button" className="player-btn active" onClick={() => setSettingsOpen((value) => !value)}>
              {t.player.settings}
            </button>
          </div>
        </div>

        {settingsOpen && (
          <div className="player-settings">
            <label>
              <span className="label">{t.player.quality}</span>
              <select className="select" value={activeIndex} onChange={(event) => changeSource(event.target.value)}>
                {sources.map((source, index) => (
                  <option key={`${source.url}-${index}`} value={index}>
                    {source.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">{t.player.speed}</span>
              <select className="select" value={speed} onChange={(event) => updateSpeed(event.target.value)}>
                {["0.5", "0.75", "1", "1.25", "1.5", "2"].map((value) => (
                  <option key={value} value={value}>
                    {value}x
                  </option>
                ))}
              </select>
            </label>
            <label className="settings-wide">
              <span className="label">{t.player.subtitleUrl}</span>
              <input
                className="search"
                value={subtitleUrl}
                onChange={(event) => setSubtitleUrl(event.target.value)}
                placeholder={t.player.subtitlePlaceholder}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
