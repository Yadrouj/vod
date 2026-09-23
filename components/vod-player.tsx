"use client";

import { enterPlayerFullscreen } from "@/lib/player-fullscreen";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Captions, Cast, ListVideo, Maximize, Minimize, Pause, PictureInPicture2, Play, Settings, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import { BrandLoader } from "@/components/brand-loader";
import { PlayerSubtitles } from "@/components/player-subtitles";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";
import { playableLinks, playbackSourceLabel } from "@/lib/link-labels";
import type { VodLink } from "@/lib/types";
import { readProgress, saveHistoryValue, PROGRESS_KEY } from "@/lib/media-history";
import Link from "next/link";
import { PlaybackHelp } from "@/components/playback-help";
import { isDonyayeSerial, regionalPlaybackHint } from "@/lib/playback-help";
import styles from "./vod-player.module.css";

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
  initialSource,
}: {
  title: string;
  itemId?: string;
  posterUrl: string | null | undefined;
  links: VodLink[];
  isSeries?: boolean;
  locale?: Locale;
  initialSource?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerFrameRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const previewTimeRef = useRef(Number.NaN);
  const bufferedRef = useRef(0);
  const playAfterSourceReadyRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [choiceIndex, setChoiceIndex] = useState(0);
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
  const [mediaError, setMediaError] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const lastSavedAt = useRef(0);
  const playableSources = useMemo(
    () => playableLinks(links, { isSeries, title, includeAlternateFiles: true }),
    [isSeries, links, title],
  );
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
        const requested = playableSources.findIndex((link) => link.url === initialSource);
        const latest = Object.entries(saved).sort((a, b) => (typeof b[1] === "number" ? 0 : b[1].at) - (typeof a[1] === "number" ? 0 : a[1].at))
          .find(([url]) => playableSources.some((link) => link.url === url))?.[0];
        const match = requested >= 0 ? requested : playableSources.findIndex((link) => link.url === latest);
        if (match >= 0) {
          setActiveIndex(match);
          setSelectionOpen(false);
          setSourceReady(true);
        } else {
          setActiveIndex(0);
          setSelectionOpen(false);
          setSourceReady(playableSources.length > 0);
        }
      } catch {
        setSourceReady(playableSources.length > 0);
      }
    });
    return () => { current = false; };
  }, [initialSource, playableSources]);

  useEffect(() => () => { if (clickTimerRef.current) clearTimeout(clickTimerRef.current); }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest('[data-player-settings], [data-settings-trigger], dialog')) setSettingsOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [settingsOpen]);

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

  function saveProgress(value: number) {
    if (!active?.url || !Number.isFinite(value) || value < 3) return;
    const entry = { title, itemId, posterUrl, url: active.url, time: Math.floor(value), duration: videoRef.current?.duration || undefined,
      season: isSeries ? active.season : null, episode: isSeries ? active.episode : null, quality: active.quality, at: Date.now() };
    const previous = Object.entries(readProgress()).filter(([url]) => url !== active.url)
      .sort((a, b) => (typeof b[1] === "number" ? 0 : b[1].at) - (typeof a[1] === "number" ? 0 : a[1].at)).slice(0, 49);
    saveHistoryValue(PROGRESS_KEY, { [active.url]: entry, ...Object.fromEntries(previous) }, "sarvnema-progress");
  }

  const sources = useMemo(
    () =>
      playableSources.map((link, index) => ({
        ...link,
        label: playbackSourceLabel(link, index, isSeries, t.player.source),
      })),
    [isSeries, playableSources, t.player.source]
  );
  const hasStructuredEpisodes = isSeries && sources.some((source) => source.season != null && source.episode != null);
  const selectedIndex = selectionOpen ? choiceIndex : activeIndex;
  const selectedSeason = hasStructuredEpisodes ? sources[selectedIndex]?.season ?? sources.find((source) => source.season != null)?.season ?? 0 : 0;
  const selectedEpisode = hasStructuredEpisodes ? sources[selectedIndex]?.episode ?? sources.find((source) => source.season === selectedSeason)?.episode ?? 0 : 0;
  const seasons = hasStructuredEpisodes
    ? [...new Set(sources.map((source) => source.season).filter((season): season is number => season != null))].sort((a, b) => a - b)
    : [];

  const nextEpisodeIndex = hasStructuredEpisodes ? sources.map((source, index) => ({ source, index }))
    .filter(({ source }) => source.season != null && source.episode != null &&
      (source.season > (active?.season ?? 0) || (source.season === active?.season && source.episode > (active?.episode ?? 0))))
    .sort((a, b) => a.source.season! - b.source.season! || a.source.episode! - b.source.episode!)[0]?.index ?? -1 : -1;

  function openEpisodes() { setChoiceIndex(activeIndex); setSelectionOpen(true); setSettingsOpen(false); }
  const episodes = hasStructuredEpisodes
    ? [...new Set(sources.filter((source) => source.season === selectedSeason).map((source) => source.episode).filter((episode): episode is number => episode != null))].sort((a, b) => a - b)
    : [];
  const episodeVariants = hasStructuredEpisodes
    ? sources
      .map((source, index) => ({ source, index }))
      .filter(({ source }) => source.season === selectedSeason && source.episode === selectedEpisode)
    : [];

  function togglePlay() {
    const video = videoRef.current;
    if (!video || !sourceReady || !active?.url) return;
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
    if (!Number.isFinite(video.duration)) return;
    const next = Math.max(0, Math.min(video.duration, Number(value)));
    video.currentTime = next;
    setTime(next);
  }

  function skip(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    seek(String(video.currentTime + seconds));
    revealControls();
  }

  function updateSpeed(value: string) {
    setSpeed(value);
    if (videoRef.current) videoRef.current.playbackRate = Number(value);
  }

  function updateVolume(value: string) {
    const next = Math.max(0, Math.min(1, Number(value)));
    setVolume(String(next));
    if (videoRef.current) { videoRef.current.volume = next; videoRef.current.muted = next === 0; }
  }

  function toggleMuted() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    revealControls();
  }

  function changeSource(value: string) {
    const nextIndex = Number(value);
    if (nextIndex === activeIndex) return;
    const next = playableSources[nextIndex];
    if (!next) return;
    const sameEpisode = !isSeries || (next.season === active?.season && next.episode === active?.episode);
    pendingSeekRef.current = sameEpisode ? videoRef.current?.currentTime ?? 0 : null;
    saveProgress(videoRef.current?.currentTime ?? 0);
    setMediaError(0);
    setMessage("");
    const wasPlaying = Boolean(videoRef.current && !videoRef.current.paused);
    setActiveIndex(nextIndex);
    setPaused(true);
    setBuffering(true);
    setTime(0);
    setDuration(0);
    setBuffered(0);
    setSourceReady(true);
    playAfterSourceReadyRef.current = wasPlaying;
  }

  async function toggleFullscreen() {
    const el = playerFrameRef.current;
    if (!el) return;
    try { if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await enterPlayerFullscreen(el);
    }
    } catch { setMessage(locale === "fa" ? "تمام‌صفحه در این مرورگر در دسترس نیست." : "Fullscreen is unavailable in this browser."); }
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
    changeSource(String(choiceIndex));
    playAfterSourceReadyRef.current = true;
    setMessage("");
    setSourceReady(true);
    setSelectionOpen(false);
    if (choiceIndex === activeIndex) void videoRef.current?.play().catch(() => setMessage(t.player.playbackBlocked));
  }

  function chooseSeriesSource(next: { season?: number; episode?: number }) {
    const season = next.season ?? selectedSeason;
    const episode = next.episode ?? selectedEpisode;
    const index = sources.findIndex((source) => (
      source.season === season
      && source.episode === episode
    ));
    if (index >= 0) setChoiceIndex(index);
  }

  return (
    <div className="player-shell">
      {isDonyayeSerial(active) && <details className="source-region-notice" dir={locale === "fa" ? "rtl" : "ltr"}><summary>{locale === "fa" ? "این منبع ممکن است به IP ایران نیاز داشته باشد · راهنمای VPN" : "This source may require an Iranian IP · VPN help"}</summary><p>{regionalPlaybackHint(locale === "fa")}</p></details>}
      <div
        ref={playerFrameRef}
        className={`${styles.player} pro-player ${paused ? "is-paused" : "is-playing"} ${controlsShowing ? "is-controls-visible" : "is-controls-hidden"}`}
        dir="ltr"
        tabIndex={0}
        aria-label={locale === "fa" ? "پلیر ویدئو؛ فاصله برای پخش، جهت‌ها برای جابه‌جایی" : "Video player: Space to play, arrows to seek"}
        onKeyDown={(event) => {
          if (event.key === "Escape") { setSettingsOpen(false); setSubtitlesOpen(false); return; }
          if ((event.target as HTMLElement).closest("button, input, select, textarea, a") || selectionOpen) return;
          if (event.ctrlKey || event.metaKey || event.altKey) return;
          const key = event.key.toLowerCase();
          if ([" ", "k", "j", "l", "arrowleft", "arrowright", "arrowup", "arrowdown", "f", "m"].includes(key) || /^\d$/.test(key)) { event.preventDefault(); revealControls(); }
          if (key === " " || key === "k") togglePlay();
          if (key === "arrowleft" || key === "j") skip(key === "j" ? -10 : -5);
          if (key === "arrowright" || key === "l") skip(key === "l" ? 10 : 5);
          if (key === "arrowup" || key === "arrowdown") updateVolume(String(Number(volume) + (key === "arrowup" ? .05 : -.05)));
          if (/^\d$/.test(key)) seek(String(duration * Number(key) / 10));
          if (key === "f") void toggleFullscreen();
          if (key === "m") toggleMuted();
        }}
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
            setMediaError(0);
            event.currentTarget.volume = Number(volume);
            event.currentTarget.playbackRate = Number(speed);
            const duration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0;
            setDuration(duration);
            const saved = readProgress()[active?.url ?? ""];
            const switchingQuality = pendingSeekRef.current !== null;
            const resumeAt = pendingSeekRef.current ?? (typeof saved === "number" ? saved : saved?.time);
            pendingSeekRef.current = null;
            event.currentTarget.muted = muted;
            if (resumeAt && duration > 0 && (switchingQuality || resumeAt < duration - 8)) {
              const restoredTime = Math.min(resumeAt, Math.max(0, duration - .1));
              event.currentTarget.currentTime = restoredTime;
              setTime(restoredTime);
              if (!switchingQuality) setMessage(locale === "fa" ? `ادامه پخش از ${formatTime(restoredTime)}` : `Resuming from ${formatTime(restoredTime)}`);
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
          onEnded={() => { setPaused(true); if (active?.url) { const progress = readProgress(); delete progress[active.url]; saveHistoryValue(PROGRESS_KEY, progress, "sarvnema-progress"); } }}
          onPlaying={() => setBuffering(false)}
          onPlay={() => { setPaused(false); setControlsVisible(true); }}
          onPause={() => { setPaused(true); setControlsVisible(true); }}
          onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
          onClick={event => {
            if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
            if (event.detail > 1) return;
            const touchMode = matchMedia('(pointer: coarse)').matches;
            if (touchMode && !controlsShowing) { revealControls(); return; }
            clickTimerRef.current = setTimeout(() => { if (touchMode) revealControls(); else togglePlay(); }, 230);
          }}
          onDoubleClick={event => {
            if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
            if (matchMedia('(pointer: coarse)').matches) {
              const rect = event.currentTarget.getBoundingClientRect();
              skip(event.clientX < rect.left + rect.width / 2 ? -10 : 10);
            } else void toggleFullscreen();
          }}
          onError={(event) => {
            setBuffering(false);
            setMediaError(event.currentTarget.error?.code ?? 2);
            setMessage(t.player.sourceError);
          }}
        />

        {buffering && sourceReady && active?.url && !selectionOpen && (
          <div className="player-loading">
            <BrandLoader label={t.common.loading} compact />
          </div>
        )}

        <button className="player-center" type="button" onClick={togglePlay} disabled={!active?.url || !sourceReady} aria-label={paused ? t.common.play : t.player.pause}>
          {paused ? <Play size={30} fill="currentColor" /> : <Pause size={30} fill="currentColor" />}
        </button>

        {!active?.url && (
          <div className="player-no-full-source" role="status" dir={locale === "fa" ? "rtl" : "ltr"}>
            <strong>{t.player.fullSourceUnavailable}</strong>
            {itemId && <Link href={`/${itemId}#downloads`}>{locale === "fa" ? "بررسی همه لینک‌ها و منابع دانلود" : "Check all download links & sources"}</Link>}
          </div>
        )}

        <div className="player-top-glass">
          <strong>{title}</strong>
          <span>{sources[activeIndex]?.label ?? `${active?.quality ?? t.player.source} / ${active?.release ?? active?.group ?? t.player.stream}`}</span>
        </div>

        <div className="player-osd">
          {message && <span>{message}</span>}
        </div>

        <div className="player-bar">
          <div className="player-timeline-wrap" onMouseMove={showTimelinePreview} onMouseLeave={clearTimelinePreview}>
            {preview && duration > 0 && <div className={styles.preview} style={{ left: `clamp(36px, ${preview.x}%, calc(100% - 36px))` }}>{formatTime(preview.time)}</div>}
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
              disabled={!duration}
              aria-label={locale === "fa" ? "جابه‌جایی زمان پخش" : "Seek"}
              aria-valuetext={`${formatTime(time)} / ${formatTime(duration)}`}
            />
          </div>

          <div className="player-actions">
            <div className="player-actions-start">
              <button type="button" className="player-btn player-btn-primary player-btn-icon" onClick={togglePlay} aria-label={paused ? t.common.play : t.player.pause} title={paused ? t.common.play : t.player.pause}>{paused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}</button>
              {nextEpisodeIndex >= 0 && <button type="button" className="player-btn player-btn-icon" onClick={() => changeSource(String(nextEpisodeIndex))} aria-label={locale === "fa" ? "قسمت بعدی" : "Next episode"} title={locale === "fa" ? "قسمت بعدی" : "Next episode"}><SkipForward size={20} fill="currentColor" /></button>}
              <span className="player-time">{formatTime(time)} <span className={styles.duration}><i>/</i> {formatTime(duration)}</span></span>
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
              {hasStructuredEpisodes && <button type="button" className="player-icon-btn" onClick={openEpisodes} aria-label={locale === "fa" ? "قسمت‌ها" : "Episodes"} title={locale === "fa" ? "قسمت‌ها" : "Episodes"}><ListVideo size={20} /></button>}
              <button type="button" className={`player-icon-btn ${subtitlesOpen ? "is-active" : ""}`} onClick={() => { setSubtitlesOpen((value) => !value); setSettingsOpen(false); }} aria-label="Subtitles" title="Subtitles">
                <Captions size={17} />
              </button>
              <button type="button" data-settings-trigger aria-expanded={settingsOpen} className={`player-icon-btn ${settingsOpen ? "is-active" : ""}`} onClick={() => { setSettingsOpen((value) => !value); setSubtitlesOpen(false); }} aria-label={t.player.settings} title={t.player.settings}>
                <Settings size={17} />
              </button>
              <button type="button" className="player-btn player-btn-icon" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : t.player.full} title={fullscreen ? "Exit fullscreen" : t.player.full}>{fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}</button>
            </div>
          </div>
        </div>

        {settingsOpen && (
          <ResponsiveDialog mobileOnly open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t.player.settings} description={title} closeLabel={locale === "fa" ? "بستن" : "Close"} dir={locale === "fa" ? "rtl" : "ltr"}>
          <div className={styles.settings} data-player-settings role="group" aria-label={t.player.settings} dir={locale === "fa" ? "rtl" : "ltr"}>
            <header><strong>{t.player.settings}</strong><button type="button" onClick={() => setSettingsOpen(false)} aria-label={locale === "fa" ? "بستن" : "Close"}><X size={18} /></button></header>
            <label>
              <span className="label">{t.player.quality}</span>
              <select className="select" aria-label={t.player.quality} value={activeIndex} onChange={(event) => changeSource(event.target.value)}>
                {(hasStructuredEpisodes ? episodeVariants : sources.map((source, index) => ({source, index}))).map(({source, index}) => (
                  <option key={`${source.url}-${index}`} value={index}>
                    {playbackSourceLabel(source, index, false, t.player.source)}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.extra}><button type="button" onClick={openPictureInPicture}><PictureInPicture2 size={18} />{locale === "fa" ? "تصویر در تصویر" : "Picture in picture"}</button><button type="button" onClick={castVideo}><Cast size={18} />{t.player.cast}</button></div>
            {hasStructuredEpisodes && <button type="button" onClick={openEpisodes}><ListVideo size={18} />{locale === "fa" ? "انتخاب قسمت" : "Choose episode"}</button>}
            <label>
              <span className="label">{t.player.speed}</span>
              <select className="select" aria-label={t.player.speed} value={speed} onChange={(event) => updateSpeed(event.target.value)}>
                {["0.5", "0.75", "1", "1.25", "1.5", "2"].map((value) => (
                  <option key={value} value={value}>
                    {value}x
                  </option>
                ))}
              </select>
            </label>
          </div>
          </ResponsiveDialog>
        )}
        {itemId && (
          <PlayerSubtitles
            locale={locale}
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
          <ResponsiveDialog open={selectionOpen} onClose={() => setSelectionOpen(false)} title={locale === "fa" ? "انتخاب نسخهٔ پخش" : "Choose playback"} dir={locale === "fa" ? "rtl" : "ltr"}
            footer={<button type="button" onClick={confirmSource}><Play size={18} fill="currentColor" />{locale === "fa" ? "شروع پخش" : "Start playback"}</button>}>
            <div className="player-choice-card" dir={locale === "fa" ? "rtl" : "ltr"}>
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
              {hasStructuredEpisodes ? (
                <div className="player-series-choice-grid">
                  <label>
                    <span>{locale === "fa" ? "فصل" : "Season"}</span>
                    <select className="select" aria-label={locale === "fa" ? "فصل" : "Season"} value={selectedSeason} onChange={(event) => {
                      const season = Number(event.target.value);
                      const firstEpisode = sources.find((source) => source.season === season)?.episode;
                      chooseSeriesSource({ season, episode: firstEpisode ?? 0 });
                    }}>
                      {seasons.map((season) => <option key={season} value={season}>{locale === "fa" ? `فصل ${season}` : `Season ${season}`}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>{locale === "fa" ? "قسمت" : "Episode"}</span>
                    <select className="select" aria-label={locale === "fa" ? "قسمت" : "Episode"} value={selectedEpisode} onChange={(event) => chooseSeriesSource({ episode: Number(event.target.value) })}>
                      {episodes.map((episode) => <option key={episode} value={episode}>{locale === "fa" ? `قسمت ${episode}` : `Episode ${episode}`}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>{locale === "fa" ? "کیفیت و نسخه" : "Quality & version"}</span>
                    <select className="select" value={choiceIndex} onChange={(event) => setChoiceIndex(Number(event.target.value))}>
                      {episodeVariants.map(({ source, index }) => <option key={`${source.url}-${index}`} value={index}>{[source.quality ?? "Auto", source.release, source.group].filter(Boolean).join(" / ")}</option>)}
                    </select>
                  </label>
                </div>
              ) : (
                <select className="select" aria-label={locale === "fa" ? "کیفیت و منبع پخش" : "Playback quality and source"} value={choiceIndex} onChange={(event) => setChoiceIndex(Number(event.target.value))}>
                  {sources.map((source, index) => <option key={`${source.url}-${index}`} value={index}>{source.label}</option>)}
                </select>
              )}
            </div>
          </ResponsiveDialog>
        )}
      </div>
      {mediaError > 0 && active && <PlaybackHelp key={active.url} link={active} code={mediaError} fa={locale === "fa"} itemId={itemId}
        onRetry={() => { setMediaError(0); setMessage(""); playAfterSourceReadyRef.current = true; videoRef.current?.load(); }}
        onChoose={() => { setSettingsOpen(true); revealControls(); playerFrameRef.current?.scrollIntoView({ block: "center", behavior: "auto" }); }} />}
    </div>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor(value / 60) % 60;
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}
