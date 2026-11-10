"use client";

import { enterPlayerFullscreen } from "@/lib/player-fullscreen";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
import { MediaPlayerControls } from "./media-player-controls";
import { BrandLoader } from "@/components/brand-loader";
import { PlayerSubtitles } from "@/components/player-subtitles";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";
import { playableLinks, playbackSourceLabel } from "@/lib/link-labels";
import type { VodLink } from "@/lib/types";
import { readProgress, saveHistoryValue, PROGRESS_KEY } from "@/lib/media-history";
import Link from "next/link";
import { PlaybackHelp } from "@/components/playback-help";
import { PlayerRecovery } from "@/components/player-recovery";
import { isDonyayeSerial, matchesPlaybackSource, needsPlaybackBuffer, preferredPlaybackIndex, regionalPlaybackHint, recoverySources, sourceHost } from "@/lib/playback-help";
import styles from "./vod-player.module.css";
import { compatibleMediaIndex } from "@/lib/media-compatibility";
import { mediaDeliveryRoutes } from "@/lib/media-delivery";
import { useMediaWarmup } from './use-media-warmup';

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
  const bufferedRef = useRef(0);
  const playAfterSourceReadyRef = useRef(false);
  const pendingPlayRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const [choiceIndex, setChoiceIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sourceRevision, setSourceRevision] = useState(0);
  const [delivery, setDelivery] = useState({ url: "", index: 0 });
  const handledDeliveryFailure = useRef<HTMLMediaElement | null>(null);
  const [speed, setSpeed] = useState("1");
  const [volume, setVolume] = useState("0.85");
  const [paused, setPaused] = useState(true);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subtitlesOpen, setSubtitlesOpen] = useState(false);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [sourceReady, setSourceReady] = useState(false);
  const [message, setMessage] = useState("");
  const [mediaError, setMediaError] = useState(0);
  const [mediaErrorDetail, setMediaErrorDetail] = useState("");
  const [buffering, setBuffering] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const lastSavedAt = useRef(0);
  const [failedSourceUrls, setFailedSourceUrls] = useState<Set<string>>(new Set());
  const playableSources = useMemo(
    () => playableLinks(links, { isSeries, title, includeAlternateFiles: true }),
    [isSeries, links, title],
  );
  const active = playableSources[activeIndex] ?? playableSources[0];
  const deliveryRoutes = mediaDeliveryRoutes(active);
  const deliveryIndex = delivery.url === active?.url ? delivery.index : 0;
  const playbackUrl = deliveryRoutes[deliveryIndex] ?? active?.url;
  const mediaKey = `${sourceReady ? playbackUrl : "awaiting-source"}:${sourceRevision}`;
  useMediaWarmup(videoRef, sourceReady ? mediaKey : undefined);
  const recoveryOptions = { differentServerFirst: mediaError > 0 && mediaError !== 3 };
  const alternatives = active ? recoverySources(active, playableSources, recoveryOptions).filter(({ link }) => !isDonyayeSerial(link)).slice(0, 2) : [];
  const nextRecovery = active ? recoverySources(active, playableSources, recoveryOptions).find(({ link }) => !failedSourceUrls.has(link.url)) : undefined;
  const t = getDictionary(locale);
  const controlsShowing = paused || settingsOpen || subtitlesOpen || selectionOpen || controlsVisible;
  const logicalUrl = active?.url;
  const deliveryCount = deliveryRoutes.length;
  const tryDeliveryFallback = useCallback((video: HTMLMediaElement | null, code: number) => {
    if (!video || video !== videoRef.current) return false;
    if (handledDeliveryFailure.current === video) return true;
    if (code === 3 || !logicalUrl || deliveryIndex >= deliveryCount - 1) return false;
    handledDeliveryFailure.current = video;
    pendingSeekRef.current = pendingSeekRef.current ?? video.currentTime ?? 0;
    playAfterSourceReadyRef.current = playAfterSourceReadyRef.current || pendingPlayRef.current || !video.paused || !paused;
    setDelivery({ url: logicalUrl, index: deliveryIndex + 1 });
    setMediaError(0); setMediaErrorDetail(""); setMessage(""); setBuffering(true); setPaused(true);
    return true;
  }, [logicalUrl, deliveryIndex, deliveryCount, paused]);

  useEffect(() => {
    if (!buffering || !sourceReady || !active?.url) return;
    const timer = setTimeout(() => {
      setBuffering(false);
      if (!needsPlaybackBuffer(videoRef.current, pendingPlayRef.current || playAfterSourceReadyRef.current)) return;
      if (tryDeliveryFallback(videoRef.current, 2)) return;
      setFailedSourceUrls(previous => new Set(previous).add(active.url));
      setMediaError(2);
      setMediaErrorDetail("Source load timed out without usable playback data (20s)");
      setMessage(isDonyayeSerial(active) ? regionalPlaybackHint(locale === "fa") : t.player.sourceError);
    }, deliveryIndex < deliveryCount - 1 ? 8000 : 20000);
    return () => clearTimeout(timer);
  }, [buffering, sourceReady, active, locale, t.player.sourceError, sourceRevision, deliveryIndex, deliveryCount, tryDeliveryFallback]);

  useEffect(() => {
    let current = true;
    queueMicrotask(() => {
      if (!current) return;
      setMediaError(0); setMediaErrorDetail(""); setMessage(""); setBuffered(0); setDuration(0); setTime(0);
      pendingSeekRef.current = null; playAfterSourceReadyRef.current = false; pendingPlayRef.current = false;
      setFailedSourceUrls(new Set());
      if (!playableSources.length) {
        setSourceReady(false);
        setSelectionOpen(false);
        setBuffering(false);
        setMessage("");
        return;
      }
      try {
        const saved = readProgress();
        const latest = Object.entries(saved).sort((a, b) => (typeof b[1] === "number" ? 0 : b[1].at) - (typeof a[1] === "number" ? 0 : a[1].at))
          .find(([url]) => playableSources.some((link) => matchesPlaybackSource(link, url)))?.[0];
        const preferred = preferredPlaybackIndex(playableSources, initialSource, latest);
        const match = compatibleMediaIndex(playableSources, preferred, videoRef.current, navigator.userAgent);
        if (match >= 0) {
          if (latest && playableSources[match].url !== latest && !initialSource) {
            const entry = saved[latest];
            pendingSeekRef.current = typeof entry === "number" ? entry : entry?.time ?? null;
          }
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

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

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
    setControlsVisible(true);
    if (video.paused) {
      setBuffering(true);
      if (mediaError || video.error) { retrySource(); return; }
      attemptPlay(video);
    } else {
      pendingPlayRef.current = false; playAfterSourceReadyRef.current = false;
      video.pause();
    }
  }

  function attemptPlay(video: HTMLVideoElement) {
    pendingPlayRef.current = true;
    setBuffering(needsPlaybackBuffer(video, true));
    void video.play().then(() => {
      if (videoRef.current !== video) return;
      pendingPlayRef.current = false;
      setBuffering(needsPlaybackBuffer(video));
    }).catch((error: unknown) => {
      // A promise from a detached, failed source must not poison its replacement.
      if (videoRef.current !== video || (error as { name?: string })?.name === "AbortError") return;
      setBuffering(false);
      if (video.error || (error as { name?: string })?.name !== "NotAllowedError") {
        if (tryDeliveryFallback(video, video.error?.code ?? 2)) return;
        pendingPlayRef.current = false;
        if (active?.url) setFailedSourceUrls(previous => new Set(previous).add(active.url));
        setMediaError(video.error?.code ?? 2);
        setMediaErrorDetail(video.error?.message || (error instanceof Error ? `${error.name}: ${error.message}` : "Playback failed"));
        setMessage(isDonyayeSerial(active) ? regionalPlaybackHint(locale === "fa") : t.player.sourceError);
      } else {
        pendingPlayRef.current = false;
        setPaused(true);
        setMessage(locale === "fa" ? "برای شروع پخش، دکمهٔ پخش را بزن." : "Tap Play to start this source.");
      }
    });
  }

  function retrySource() {
    if (active?.url) setDelivery({ url: active.url, index: 0 });
    if (active?.url) setFailedSourceUrls(previous => { const next = new Set(previous); next.delete(active.url); return next; });
    pendingSeekRef.current = videoRef.current?.currentTime || time || null;
    playAfterSourceReadyRef.current = true;
    pendingPlayRef.current = false;
    setMediaError(0); setMediaErrorDetail(""); setMessage(""); setBuffering(true); setPaused(true);
    setSourceReady(true); setSourceRevision(value => value + 1);
  }

  function seek(value: string) {
    const video = videoRef.current;
    if (!video) return;
    if (!Number.isFinite(video.duration)) return;
    const next = Math.max(0, Math.min(video.duration, Number(value)));
    video.currentTime = next;
    setTime(next);
  }

  function updateSpeed(value: string) {
    setSpeed(value);
    if (videoRef.current) videoRef.current.playbackRate = Number(value);
  }

  function changeSource(value: string) {
    const nextIndex = Number(value);
    if (nextIndex === activeIndex) { if (mediaError) retrySource(); return; }
    const next = playableSources[nextIndex];
    if (!next) return;
    setDelivery({ url: next.url, index: 0 });
    const sameEpisode = !isSeries || (next.season === active?.season && next.episode === active?.episode);
    pendingSeekRef.current = sameEpisode ? pendingSeekRef.current ?? videoRef.current?.currentTime ?? 0 : null;
    saveProgress(videoRef.current?.currentTime ?? 0);
    setMediaError(0);
    setMediaErrorDetail("");
    setMessage("");
    const wasPlaying = Boolean(mediaError || pendingPlayRef.current || playAfterSourceReadyRef.current || (videoRef.current && !videoRef.current.paused));
    pendingPlayRef.current = false;
    videoRef.current?.pause();
    setActiveIndex(nextIndex);
    setPaused(true);
    setBuffering(true);
    setTime(0);
    setDuration(0);
    setBuffered(0);
    bufferedRef.current = 0;
    setSourceRevision(value => value + 1);
    setSettingsOpen(false);
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

  function confirmSource() {
    setSelectionOpen(false);
    if (choiceIndex === activeIndex) {
      if (mediaError || videoRef.current?.error) retrySource();
      else if (videoRef.current) attemptPlay(videoRef.current);
    } else {
      changeSource(String(choiceIndex));
      playAfterSourceReadyRef.current = true;
    }
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
      {isDonyayeSerial(active) && <aside className="source-region-notice" dir={locale === "fa" ? "rtl" : "ltr"}><strong>{locale === "fa" ? "برای پخش از دنیای سریال، VPN را خاموش کن" : "Donyaye Serial: turn off your VPN in Iran"}</strong><p>{regionalPlaybackHint(locale === "fa")}</p>{alternatives.length > 0 && <div className="playback-help-actions">{alternatives.map(({ link, index }) => <button key={link.url} type="button" onClick={() => { changeSource(String(index)); playAfterSourceReadyRef.current = true; }}>{locale === "fa" ? "منبع جایگزین" : "Alternative source"} · {[link.quality, link.group, sourceHost(link)].filter(Boolean).join(" · ")}</button>)}</div>}</aside>}
      <div
        ref={playerFrameRef}
        className={`${styles.player} pro-player ${paused ? "is-paused" : "is-playing"} ${controlsShowing ? "is-controls-visible" : "is-controls-hidden"}`}
        dir="ltr"
        tabIndex={0}
        aria-label={locale === "fa" ? "پلیر ویدئو؛ فاصله برای پخش، جهت‌ها برای جابه‌جایی" : "Video player: Space to play, arrows to seek"}
      >
        <video
          ref={videoRef}
          key={mediaKey}
          className="player"
          src={sourceReady ? playbackUrl : undefined}
          poster={posterUrl ?? undefined}
          playsInline
          preload={sourceReady ? "metadata" : "none"}
          onLoadStart={() => setBuffering(true)}
          onLoadedMetadata={(event) => {
            setMediaError(0);
            setMessage("");
            event.currentTarget.volume = Number(volume);
            event.currentTarget.playbackRate = Number(speed);
            const duration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0;
            setDuration(duration);
            const progress = readProgress();
            const saved = progress[active?.url ?? ""] ?? progress[active?.sourceOriginalUrl ?? ""];
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
            setBuffering(needsPlaybackBuffer(event.currentTarget, pendingPlayRef.current || playAfterSourceReadyRef.current));
            bufferedRef.current = 0;
            setBuffered(0);
          }}
          onCanPlay={(event) => {
            setBuffering(false);
            if (playAfterSourceReadyRef.current) {
              playAfterSourceReadyRef.current = false;
              attemptPlay(event.currentTarget);
            }
          }}
          onWaiting={() => setBuffering(true)}
          onStalled={event => { if (needsPlaybackBuffer(event.currentTarget, pendingPlayRef.current || playAfterSourceReadyRef.current)) setBuffering(true); }}
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
          onEnded={() => { pendingPlayRef.current = false; playAfterSourceReadyRef.current = false; setPaused(true); if (active?.url) { const progress = readProgress(); delete progress[active.url]; saveHistoryValue(PROGRESS_KEY, progress, "sarvnema-progress"); } }}
          onPlaying={() => { pendingPlayRef.current = false; if (active?.url) setFailedSourceUrls(previous => { const next = new Set(previous); next.delete(active.url); return next; }); setBuffering(false); setMediaError(0); setMessage(""); }}
          onPlay={() => { setPaused(false); setControlsVisible(true); }}
          onPause={() => { setPaused(true); setControlsVisible(true); }}
          onVolumeChange={(event) => { setMuted(event.currentTarget.muted); setVolume(String(event.currentTarget.volume)); }}
          onError={(event) => {
            if (event.currentTarget !== videoRef.current) return;
            if (tryDeliveryFallback(event.currentTarget, event.currentTarget.error?.code ?? 2)) return;
            if (active?.url) setFailedSourceUrls(previous => new Set(previous).add(active.url));
            setBuffering(false);
            setMediaError(event.currentTarget.error?.code ?? 2);
            setMediaErrorDetail(event.currentTarget.error?.message || "The browser did not provide a media error description");
            setMessage(isDonyayeSerial(active) ? (locale === "fa" ? "این منبع ممکن است با VPN باز نشود؛ VPN را خاموش کنید یا نسخهٔ دوبله / سرور دیگری را انتخاب کنید." : "This source may not work with a VPN. Turn it off in Iran, or try a dubbed version / another server.") : t.player.sourceError);
          }}
        />

        {mediaError > 0 && active && !settingsOpen && !selectionOpen && !subtitlesOpen && <PlayerRecovery
          fa={locale === "fa"} regional={isDonyayeSerial(active)} onRetry={retrySource}
          code={mediaError} detail={mediaErrorDetail} sourceLabel={`${active.quality ?? ""} · ${sourceHost({ url: playbackUrl ?? active.url })}`}
          onNext={nextRecovery ? () => { changeSource(String(nextRecovery.index)); playAfterSourceReadyRef.current = true; } : undefined}
          nextLabel={nextRecovery ? sourceHost(nextRecovery.link) : undefined}
          onChoose={() => { setSettingsOpen(true); setControlsVisible(true); }} />}

        {buffering && sourceReady && active?.url && !selectionOpen && (
          <div className="player-loading">
            <BrandLoader label={t.common.loading} compact />
          </div>
        )}

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

        <MediaPlayerControls
          mediaKey={mediaKey}
          frameRef={playerFrameRef} mediaRef={videoRef} paused={paused} time={time} duration={duration} buffered={buffered}
          rate={Number(speed)} onRate={value => updateSpeed(String(value))} onPlay={togglePlay} onSeek={value => seek(String(value))}
          onFullscreen={() => void toggleFullscreen()} fullscreen={fullscreen} locale={locale} canPlay={Boolean(active?.url && sourceReady)}
          sources={(hasStructuredEpisodes ? episodeVariants : sources.map((source, index) => ({ source, index }))).map(({ source, index }) => ({ value: String(index), label: `${playbackSourceLabel(source, index, false, t.player.source)} · ${sourceHost(source)}${isDonyayeSerial(source) ? (locale === "fa" ? " · ممکن است به IP ایران نیاز داشته باشد" : " · May require Iranian IP") : ""}` }))}
          source={String(activeIndex)} onSource={changeSource} settingsOpen={settingsOpen} onSettings={open => { setSettingsOpen(open); if (open) setSubtitlesOpen(false); }}
          onSubtitles={itemId ? () => { setSubtitlesOpen(value => !value); setSettingsOpen(false); } : undefined}
          onEpisodes={hasStructuredEpisodes ? openEpisodes : undefined} onNext={nextEpisodeIndex >= 0 ? () => changeSource(String(nextEpisodeIndex)) : undefined}
          onVisibility={setControlsVisible} panelOpen={subtitlesOpen || selectionOpen}
        />
        {itemId && (
          <PlayerSubtitles
            locale={locale}
            videoRef={videoRef}
            itemId={itemId}
            title={title}
            sourceKey={mediaKey}
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
        alternatives={recoverySources(active, playableSources)} onAlternative={index => { changeSource(String(index)); playAfterSourceReadyRef.current = true; }}
        onRetry={retrySource}
        onChoose={() => { setSettingsOpen(true); setControlsVisible(true); playerFrameRef.current?.scrollIntoView({ block: "center", behavior: "auto" }); }} />}
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
