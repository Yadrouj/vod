"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Captions, Cast, Maximize, Minimize, Pause, PictureInPicture2, Play, RotateCcw, RotateCw, Settings, Volume2, VolumeX } from "lucide-react";
import { BrandLoader } from "@/components/brand-loader";
import { PlayerSubtitles } from "@/components/player-subtitles";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";
import { playableLinks, playbackSourceLabel } from "@/lib/link-labels";
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
  isSeries = false,
  locale = DEFAULT_LOCALE,
}: {
  title: string;
  itemId?: string;
  posterUrl: string | null | undefined;
  links: VodLink[];
  isSeries?: boolean;
  locale?: Locale;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerFrameRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const previewTimeRef = useRef(Number.NaN);
  const bufferedRef = useRef(0);
  const playAfterSourceReadyRef = useRef(false);
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
  const [sourceReady, setSourceReady] = useState(false);
  const [message, setMessage] = useState("");
  const [buffering, setBuffering] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const lastSavedAt = useRef(0);
  const playableSources = useMemo(() => playableLinks(links), [links]);
  const active = playableSources[activeIndex] ?? playableSources[0];
  const t = getDictionary(locale);
  const controlsShowing = paused || settingsOpen || subtitlesOpen || selectionOpen || controlsVisible;

  useEffect(() => {
    let current = true;
    queueMicrotask(() => {
      if (!current) return;
      if (!playableSources.length) {
        setSourceReady(false);
        setSelectionOpen(false);
        setBuffering(false);
        setMessage("");
        return;
      }
      try {
        const saved = readProgress();
        const match = playableSources.findIndex((link) => Boolean(saved[link.url]));
        if (match >= 0) {
          setActiveIndex(match);
          setSelectionOpen(false);
          setSourceReady(true);
        } else if (playableSources.length > 1) {
          setActiveIndex(0);
          setSourceReady(false);
          setSelectionOpen(true);
        } else {
          setSourceReady(playableSources.length > 0);
        }
      } catch {
        setSourceReady(playableSources.length <= 1 && playableSources.length > 0);
        if (playableSources.length > 1) setSelectionOpen(true);
      }
    });
    return () => { current = false; };
  }, [playableSources]);

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    if (paused || settingsOpen || subtitlesOpen || selectionOpen) return;
    controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2600);
    return () => {
      if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    };
  }, [active?.url, paused, selectionOpen, settingsOpen, subtitlesOpen]);

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
      playableSources.map((link, index) => ({
        ...link,
        label: playbackSourceLabel(link, index, isSeries, t.player.source),
      })),
    [isSeries, playableSources, t.player.source]
  );

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    revealControls();
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

  function toggleMuted() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    revealControls();
  }

  function changeSource(value: string) {
    const wasPlaying = Boolean(videoRef.current && !videoRef.current.paused);
    setActiveIndex(Number(value));
    setPaused(true);
    setBuffering(true);
    setTime(0);
    setSourceReady(true);
    playAfterSourceReadyRef.current = wasPlaying;
  }

  async function toggleFullscreen() {
    const el = playerFrameRef.current;
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

  function revealControls() {
    setControlsVisible(true);
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    if (!paused && !settingsOpen && !subtitlesOpen && !selectionOpen) {
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2600);
    }
  }

  function handlePointerLeave() {
    if (!paused && !settingsOpen && !subtitlesOpen && !selectionOpen) {
      if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 850);
    }
  }

  function showTimelinePreview(event: MouseEvent<HTMLDivElement>) {
    if (duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const next = ratio * duration;
    if (Math.abs(previewTimeRef.current - next) < 0.45) return;
    previewTimeRef.current = next;
    setPreview({ x: ratio * 100, time: next });
  }

  function clearTimelinePreview() {
    previewTimeRef.current = Number.NaN;
    setPreview(null);
  }

  function confirmSource() {
    playAfterSourceReadyRef.current = true;
    setMessage("");
    setSourceReady(true);
    setSelectionOpen(false);
  }

  return (
    <div className="player-shell">
      <div
        ref={playerFrameRef}
        className={`pro-player ${paused ? "is-paused" : "is-playing"} ${controlsShowing ? "is-controls-visible" : "is-controls-hidden"}`}
        dir="ltr"
        onMouseMove={revealControls}
        onMouseLeave={handlePointerLeave}
        onFocusCapture={revealControls}
        onTouchStart={revealControls}
      >
        <video
          ref={videoRef}
          key={sourceReady ? active?.url : "awaiting-source"}
          className="player"
          src={sourceReady ? active?.url : undefined}
          poster={posterUrl ?? undefined}
          playsInline
          preload={sourceReady ? "metadata" : "none"}
          onLoadStart={() => setBuffering(true)}
          onLoadedMetadata={(event) => {
            event.currentTarget.volume = Number(volume);
            event.currentTarget.playbackRate = Number(speed);
            setDuration(event.currentTarget.duration || 0);
            const saved = readProgress()[active?.url ?? ""];
            const resumeAt = typeof saved === "number" ? saved : saved?.time;
            if (resumeAt && resumeAt < event.currentTarget.duration - 8) {
              event.currentTarget.currentTime = resumeAt;
              setTime(resumeAt);
              setMessage(locale === "fa" ? `ادامه پخش از ${formatTime(resumeAt)}` : `Resuming from ${formatTime(resumeAt)}`);
            }
            setBuffering(false);
            bufferedRef.current = 0;
            setBuffered(0);
          }}
          onCanPlay={(event) => {
            setBuffering(false);
            if (playAfterSourceReadyRef.current) {
              playAfterSourceReadyRef.current = false;
              void event.currentTarget.play().catch(() => setMessage(t.player.playbackBlocked));
            }
          }}
          onWaiting={() => setBuffering(true)}
          onStalled={() => setBuffering(true)}
          onTimeUpdate={(event) => {
            const current = event.currentTarget.currentTime;
            setTime(current);
            if (Date.now() - lastSavedAt.current > 5000) { lastSavedAt.current = Date.now(); saveProgress(current); }
          }}
          onProgress={(event) => {
            const video = event.currentTarget;
            if (video.duration && video.buffered.length) {
              const next = (video.buffered.end(video.buffered.length - 1) / video.duration) * 100;
              if (Math.abs(bufferedRef.current - next) >= 0.5) {
                bufferedRef.current = next;
                setBuffered(next);
              }
            }
          }}
          onEnded={() => { if (active?.url) { const progress = readProgress(); delete progress[active.url]; document.cookie = `sarvnema_progress=${encodeURIComponent(JSON.stringify(progress))}; path=/; max-age=2592000; SameSite=Lax`; } }}
          onPlaying={() => setBuffering(false)}
          onPlay={() => { setPaused(false); setControlsVisible(true); }}
          onPause={() => { setPaused(true); setControlsVisible(true); }}
          onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
          onClick={revealControls}
          onError={() => {
            setBuffering(false);
            setMessage(t.player.sourceError);
          }}
        />

        {buffering && active?.url && (
          <div className="player-loading">
            <BrandLoader label={t.common.loading} compact />
          </div>
        )}

        <button className="player-center" type="button" onClick={togglePlay} disabled={!active?.url} aria-label={paused ? t.common.play : t.player.pause}>
          <span className={paused ? "player-play-icon" : "player-pause-icon"} />
        </button>

        {!active?.url && (
          <div className="player-no-full-source" role="status" dir={locale === "fa" ? "rtl" : "ltr"}>
            <strong>{t.player.fullSourceUnavailable}</strong>
          </div>
        )}

        <div className="player-top-glass">
          <strong>{title}</strong>
          <span>{active?.quality ?? t.player.source} / {active?.release ?? active?.group ?? t.player.stream}</span>
        </div>

        <div className="player-osd">
          {message && <span>{message}</span>}
        </div>

        <div className="player-bar">
          <div className="player-timeline-wrap" onMouseMove={showTimelinePreview} onMouseLeave={clearTimelinePreview}>
            {preview && duration > 0 && <div className="player-frame-preview" style={{ left: `${preview.x}%` }}>{posterUrl ? <span className="player-frame-preview-image" style={{ backgroundImage: `url(${posterUrl})` }} aria-hidden="true" /> : <span className="player-frame-preview-empty" />}<span>{formatTime(preview.time)}</span></div>}
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
            <div className="player-actions-start">
              <button type="button" className="player-btn player-btn-primary player-btn-icon" onClick={togglePlay} aria-label={paused ? t.common.play : t.player.pause} title={paused ? t.common.play : t.player.pause}>{paused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}</button>
              <button type="button" className="player-btn player-btn-icon" onClick={() => skip(-10)} aria-label="Back 10 seconds" title="Back 10 seconds"><RotateCcw size={17} /><small>10</small></button>
              <button type="button" className="player-btn player-btn-icon" onClick={() => skip(10)} aria-label="Forward 10 seconds" title="Forward 10 seconds"><RotateCw size={17} /><small>10</small></button>
              <span className="player-time">{formatTime(time)} <i>/</i> {formatTime(duration)}</span>
              <label className="player-volume" title={t.player.volume}>
                <button type="button" onClick={toggleMuted} aria-label={muted ? "Unmute" : "Mute"}>{muted || Number(volume) === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(event) => updateVolume(event.target.value)}
                  aria-label={t.player.volume}
                />
              </label>
            </div>
            <div className="player-actions-end">
              <button type="button" className="player-btn player-btn-icon" onClick={castVideo} aria-label={t.player.cast} title={t.player.cast}><Cast size={17} /></button>
              <button type="button" className="player-btn player-btn-icon" onClick={openPictureInPicture} aria-label="Picture in picture" title="Picture in picture"><PictureInPicture2 size={17} /></button>
              <button type="button" className={`player-icon-btn ${subtitlesOpen ? "is-active" : ""}`} onClick={() => { setSubtitlesOpen((value) => !value); setSettingsOpen(false); }} aria-label="Subtitles" title="Subtitles">
                <Captions size={17} />
              </button>
              <button type="button" className={`player-icon-btn ${settingsOpen ? "is-active" : ""}`} onClick={() => { setSettingsOpen((value) => !value); setSubtitlesOpen(false); }} aria-label={t.player.settings} title={t.player.settings}>
                <Settings size={17} />
              </button>
              <button type="button" className="player-btn player-btn-icon" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : t.player.full} title={fullscreen ? "Exit fullscreen" : t.player.full}>{fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}</button>
            </div>
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
            sourceSubtitleUrl={active?.subtitleUrl ?? null}
            open={subtitlesOpen}
            onClose={() => setSubtitlesOpen(false)}
          />
        )}
        {selectionOpen && sources.length > 1 && (
          <div className="player-choice-overlay">
            <div className="player-choice-card" dir={locale === "fa" ? "rtl" : "ltr"}>
              <span className="label">Choose playback</span>
              <h3>{title}</h3>
              <p>
                {isSeries
                  ? locale === "fa"
                    ? "قسمت و کیفیت پخش را انتخاب کن."
                    : "Select an episode and playback quality."
                  : locale === "fa"
                    ? "کیفیت پخش را انتخاب کن."
                    : "Select a playback quality."}
              </p>
              <select className="select" value={activeIndex} onChange={(event) => setActiveIndex(Number(event.target.value))}>
                {sources.map((source, index) => <option key={`${source.url}-${index}`} value={index}>{source.label}</option>)}
              </select>
              <button type="button" className="play-glow" onClick={confirmSource}>▶ Start playback</button>
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
