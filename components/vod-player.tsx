"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Captions, Settings } from "lucide-react";
import { BrandLoader } from "@/components/brand-loader";
import { PlayerSubtitles } from "@/components/player-subtitles";
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
  itemId,
  posterUrl,
  links,
  locale = DEFAULT_LOCALE,
}: {
  title: string;
  itemId?: string;
  posterUrl: string | null | undefined;
  links: VodLink[];
  locale?: Locale;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [speed, setSpeed] = useState("1");
  const [volume, setVolume] = useState("0.85");
  const [paused, setPaused] = useState(true);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [preview, setPreview] = useState<{ x: number; time: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subtitlesOpen, setSubtitlesOpen] = useState(false);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [buffering, setBuffering] = useState(true);
  const lastSavedAt = useRef(0);
  const active = links[activeIndex] ?? links[0];
  const t = getDictionary(locale);

  useEffect(() => {
    let current = true;
    queueMicrotask(() => {
      if (!current) return;
      try {
        const saved = readProgress();
        const match = links.findIndex((link) => Boolean(saved[link.url]));
        if (match >= 0) {
          setActiveIndex(match);
          setSelectionOpen(false);
        } else if (links.length > 1) {
          setSelectionOpen(true);
        }
      } catch { if (links.length > 1) setSelectionOpen(true); }
    });
    return () => { current = false; };
  }, [links]);

  function readProgress(): Record<string, { title: string; itemId?: string; url: string; time: number; at: number } | number> {
    try {
      const raw = document.cookie.split("; ").find((cookie) => cookie.startsWith("sarvnema_progress="))?.split("=")[1];
      return raw ? JSON.parse(decodeURIComponent(raw)) : {};
    } catch { return {}; }
  }

  function saveProgress(value: number) {
    if (!active?.url || !Number.isFinite(value) || value < 3) return;
    const progress = { ...readProgress(), [active.url]: { title, itemId, url: active.url, time: Math.floor(value), at: Date.now() } };
    document.cookie = `sarvnema_progress=${encodeURIComponent(JSON.stringify(progress))}; path=/; max-age=2592000; SameSite=Lax`;
    window.dispatchEvent(new CustomEvent("sarvnema-progress"));
  }

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
      setBuffering(true);
      video.play().catch(() => {
        setBuffering(false);
        setMessage(t.player.playbackBlocked);
      });
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
    setBuffering(true);
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
          key={active?.url}
          className="player"
          src={active?.url}
          poster={posterUrl ?? undefined}
          playsInline
          preload="metadata"
          onLoadStart={() => setBuffering(true)}
          onLoadedMetadata={(event) => {
            setDuration(event.currentTarget.duration || 0);
            const saved = readProgress()[active?.url ?? ""];
            const resumeAt = typeof saved === "number" ? saved : saved?.time;
            if (resumeAt && resumeAt < event.currentTarget.duration - 8) {
              event.currentTarget.currentTime = resumeAt;
              setTime(resumeAt);
              setMessage(locale === "fa" ? `ادامه پخش از ${formatTime(resumeAt)}` : `Resuming from ${formatTime(resumeAt)}`);
            }
            setBuffering(false);
            setBuffered(0);
          }}
          onCanPlay={() => setBuffering(false)}
          onWaiting={() => setBuffering(true)}
          onTimeUpdate={(event) => {
            const current = event.currentTarget.currentTime;
            setTime(current);
            if (Date.now() - lastSavedAt.current > 5000) { lastSavedAt.current = Date.now(); saveProgress(current); }
          }}
          onProgress={(event) => {
            const video = event.currentTarget;
            if (video.duration && video.buffered.length) setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
          }}
          onEnded={() => { if (active?.url) { const progress = readProgress(); delete progress[active.url]; document.cookie = `sarvnema_progress=${encodeURIComponent(JSON.stringify(progress))}; path=/; max-age=2592000; SameSite=Lax`; } }}
          onPlaying={() => setBuffering(false)}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onError={() => {
            setBuffering(false);
            setMessage(t.player.sourceError);
          }}
        />

        {buffering && (
          <div className="player-loading">
            <BrandLoader label={t.common.loading} compact />
          </div>
        )}

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
          <div className="player-timeline-wrap" onMouseMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)); const next = ratio * duration; setPreview({ x: ratio * 100, time: next }); if (previewRef.current && Number.isFinite(next)) previewRef.current.currentTime = next; }} onMouseLeave={() => setPreview(null)}>
            {preview && duration > 0 && <div className="player-frame-preview" style={{ left: `${preview.x}%` }}><video ref={previewRef} src={active?.url} muted preload="metadata" /><span>{formatTime(preview.time)}</span></div>}
            <span className="player-timeline-track" aria-hidden="true">
              <span className="player-buffer-progress" style={{ width: `${buffered}%` }} />
              <span className="player-played-progress" style={{ width: `${duration > 0 ? Math.min(100, (time / duration) * 100) : 0}%` }} />
            </span>
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
          </div>

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
            <button type="button" className={`player-icon-btn ${subtitlesOpen ? "is-active" : ""}`} onClick={() => { setSubtitlesOpen((value) => !value); setSettingsOpen(false); }} aria-label="Subtitles" title="Subtitles">
              <Captions size={17} />
            </button>
            <button type="button" className={`player-icon-btn ${settingsOpen ? "is-active" : ""}`} onClick={() => { setSettingsOpen((value) => !value); setSubtitlesOpen(false); }} aria-label={t.player.settings} title={t.player.settings}>
              <Settings size={17} />
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
          </div>
        )}
        {itemId && (
          <PlayerSubtitles
            videoRef={videoRef}
            itemId={itemId}
            title={title}
            sourceKey={active?.url ?? ""}
            sourceLabel={sources[activeIndex]?.label ?? ""}
            open={subtitlesOpen}
            onClose={() => setSubtitlesOpen(false)}
          />
        )}
        {selectionOpen && sources.length > 1 && (
          <div className="player-choice-overlay">
            <div className="player-choice-card">
              <span className="label">Choose playback</span>
              <h3>{title}</h3>
              <p>Select episode, quality or source before starting.</p>
              <select className="select" value={activeIndex} onChange={(event) => changeSource(event.target.value)}>
                {sources.map((source, index) => <option key={`${source.url}-${index}`} value={index}>{source.label}</option>)}
              </select>
              <button type="button" className="play-glow" onClick={() => setSelectionOpen(false)}>▶ Start playback</button>
            </div>
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
