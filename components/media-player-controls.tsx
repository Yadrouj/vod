"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Captions, Check, ChevronLeft, ChevronRight, Keyboard, ListVideo, Maximize, Minimize, Monitor, Pause, PictureInPicture2, Play, Settings, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import { ResponsiveDialog } from "./responsive-dialog";
import type { Locale } from "@/lib/i18n";
import styles from "./media-player-controls.module.css";

type Props = {
  frameRef: RefObject<HTMLDivElement | null>; mediaRef: RefObject<HTMLMediaElement | null>;
  paused: boolean; time: number; duration: number; buffered?: number; rate: number;
  onPlay: () => void; onSeek: (time: number) => void; onRate: (rate: number) => void;
  onFullscreen: () => void; fullscreen: boolean; locale?: Locale; audio?: boolean;
  canPlay?: boolean; canSeek?: boolean; canSource?: boolean; canRate?: boolean;
  sources: { value: string; label: string }[]; source: string; onSource: (value: string) => void;
  settingsOpen: boolean; onSettings: (open: boolean) => void;
  onSubtitles?: () => void; onEpisodes?: () => void; onNext?: () => void;
  onVisibility?: (visible: boolean) => void; panelOpen?: boolean; extras?: ReactNode;
};
const rates = [.25, .5, .75, 1, 1.25, 1.5, 1.75, 2];
export function mediaTime(value: number) {
  const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}` : `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Shared UI only: room playback still goes through its authoritative server. */
export function MediaPlayerControls(props: Props) {
  const { frameRef, mediaRef, paused, time, duration, rate, onPlay, onSeek, onRate, onFullscreen, fullscreen, sources, source, onSource, settingsOpen, onSettings, onSubtitles, onEpisodes, onNext, extras, audio = false, locale = "en", canPlay = true, canSeek = true, canSource = true, canRate = true, panelOpen = false } = props;
  const fa = locale === "fa";
  const label = (en: string, persian: string) => fa ? persian : en;
  const [visible, setVisible] = useState(true);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [scrub, setScrub] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [menu, setMenu] = useState<"main" | "quality" | "speed" | "keys">("main");
  const [theater, setTheater] = useState(false);
  const [pip, setPip] = useState(false);
  const [canPip, setCanPip] = useState(false);
  const [canCast, setCanCast] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const scrubRef = useRef<number | null>(null);
  const holding = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointer = useRef<{ x: number; y: number; type: string; moved: boolean } | null>(null);
  const lastTap = useRef<{ at: number; x: number; y: number } | null>(null);
  const heldRate = useRef<number | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const shown = visible || paused || audio || settingsOpen || panelOpen || scrub !== null;
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const position = Math.min(scrub ?? time, safeDuration);
  const progress = safeDuration ? position / safeDuration * 100 : 0;

  function announce(message: string) {
    setFeedback(message);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(""), 850);
  }
  const reveal = useCallback(() => {
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      const frame = frameRef.current;
      if (holding.current || frame?.querySelector('[data-player-controls]:hover') || (frame?.contains(document.activeElement) && document.activeElement?.matches(":focus-visible:not([data-player-frame])"))) return;
      setVisible(false);
    }, 2800);
  }, [frameRef]);
  function seek(next: number) {
    if (!canSeek || !safeDuration) return;
    onSeek(Math.max(0, Math.min(safeDuration, next)));
    reveal();
  }
  function skip(amount: number) { seek((mediaRef.current?.currentTime ?? time) + amount); announce(`${amount > 0 ? "+" : "−"}${Math.abs(amount)} s`); }
  function play() { if (canPlay) { onPlay(); announce(paused ? label("Play", "پخش") : label("Pause", "توقف")); } reveal(); }
  function setSound(value: number) {
    const media = mediaRef.current;
    if (!media) return;
    media.volume = Math.max(0, Math.min(1, value)); media.muted = value <= 0;
    setVolume(media.volume); setMuted(media.muted);
  }
  function mute() { const media = mediaRef.current; if (media) { media.muted = !media.muted; setMuted(media.muted); } }
  function finishHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (heldRate.current === null) return false;
    latest.current.onRate(heldRate.current); heldRate.current = null; setFeedback(""); return true;
  }
  async function picture() {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await (mediaRef.current as HTMLVideoElement | null)?.requestPictureInPicture();
    } catch { announce(label("Picture in picture unavailable", "تصویر در تصویر در دسترس نیست")); }
  }
  async function cast() {
    const media = mediaRef.current as HTMLVideoElement & { webkitShowPlaybackTargetPicker?: () => void; remote?: { prompt: () => Promise<void> } };
    try { if (media.webkitShowPlaybackTargetPicker) media.webkitShowPlaybackTargetPicker(); else await media.remote?.prompt(); }
    catch { announce(label("Could not connect to a screen", "اتصال به نمایشگر انجام نشد")); }
  }
  function commit() {
    const value = scrubRef.current;
    scrubRef.current = null; setScrub(null); holding.current = false;
    if (value !== null) seek(value);
  }
  function cancelScrub() { scrubRef.current = null; setScrub(null); holding.current = false; reveal(); }

  useEffect(() => {
    latest.current.onVisibility?.(shown);
  }, [shown]);
  useEffect(() => {
    const frame = frameRef.current;
    if (frame) { frame.dataset.playerFrame = "true"; frame.dataset.theater = String(theater); }
  }, [frameRef, theater]);
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    const sound = () => { setVolume(media.volume); setMuted(media.muted); };
    const buffer = () => setBuffered(media.duration > 0 && media.buffered.length ? media.buffered.end(media.buffered.length - 1) / media.duration * 100 : 0);
    const pipChange = () => setPip(document.pictureInPictureElement === media);
    sound(); buffer();
    setCanPip(!audio && Boolean(document.pictureInPictureEnabled));
    setCanCast(Boolean("webkitShowPlaybackTargetPicker" in media || ("remote" in media && (media as HTMLVideoElement).remote)));
    media.addEventListener("volumechange", sound); media.addEventListener("progress", buffer);
    media.addEventListener("enterpictureinpicture", pipChange); media.addEventListener("leavepictureinpicture", pipChange);
    return () => { media.removeEventListener("volumechange", sound); media.removeEventListener("progress", buffer); media.removeEventListener("enterpictureinpicture", pipChange); media.removeEventListener("leavepictureinpicture", pipChange); };
  }, [mediaRef, source, audio]);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const move = (event: PointerEvent) => { if (event.pointerType === "mouse") reveal(); };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onSettings(false); setTheater(false); return; }
      if ((event.target as HTMLElement).closest("button, input, select, textarea, a, dialog, [contenteditable=true]") || event.ctrlKey || event.metaKey || event.altKey || panelOpen) return;
      const k = event.key.toLowerCase();
      if (![" ", "k", "j", "l", "arrowleft", "arrowright", "arrowup", "arrowdown", "f", "m", "c", "i", "t", "home", "end", ".", ",", ">", "<", "?", "n"].includes(k) && !/^\d$/.test(k)) return;
      event.preventDefault(); reveal();
      if (k === " " || k === "k") play();
      if (k === "j" || k === "arrowleft") skip(k === "j" ? -10 : -5);
      if (k === "l" || k === "arrowright") skip(k === "l" ? 10 : 5);
      if (/^\d$/.test(k)) seek(safeDuration * Number(k) / 10);
      if (k === "home" || k === "end") seek(k === "home" ? 0 : Math.max(0, safeDuration - .1));
      if ((k === "." || k === ",") && paused) seek(time + (k === "." ? 1 : -1) / 30);
      if (k === ">" || k === "<") { if (canRate) onRate(Math.max(.25, Math.min(2, rate + (k === ">" ? .25 : -.25)))); }
      if (k === "arrowup" || k === "arrowdown") setSound(volume + (k === "arrowup" ? .05 : -.05));
      if (k === "m") mute();
      if (k === "f") onFullscreen();
      if (k === "c" && onSubtitles) mediaRef.current?.dispatchEvent(new Event("sarvnema:toggle-captions"));
      if (k === "i" && canPip) void picture();
      if (k === "t" && !audio) setTheater(value => !value);
      if (k === "n" && event.shiftKey && canPlay) onNext?.();
      if (k === "?") { setMenu("keys"); onSettings(true); }
    };
    frame.addEventListener("pointermove", move); frame.addEventListener("keydown", key);
    return () => { frame.removeEventListener("pointermove", move); frame.removeEventListener("keydown", key); };
  });
  useEffect(() => { reveal(); }, [paused, settingsOpen, panelOpen, source, reveal]);
  useEffect(() => {
    const blur = () => { finishHold(); holding.current = false; };
    const hidden = () => { if (document.hidden) blur(); };
    window.addEventListener("blur", blur); document.addEventListener("visibilitychange", hidden);
    return () => { window.removeEventListener("blur", blur); document.removeEventListener("visibilitychange", hidden); finishHold(); for (const timer of [hideTimer, feedbackTimer, clickTimer]) if (timer.current) clearTimeout(timer.current); };
  }, []);
  useEffect(() => {
    if (!settingsOpen) return;
    const dismiss = (event: PointerEvent) => { if (!(event.target as HTMLElement).closest('[data-player-settings], [data-settings-trigger], dialog')) onSettings(false); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [settingsOpen, onSettings]);

  const button = (text: string, icon: ReactNode, action: () => void, options: { disabled?: boolean; pressed?: boolean; desktop?: boolean; settings?: boolean } = {}) => <button type="button" className={`${styles.button} ${options.desktop ? styles.desktop : ""}`} aria-label={text} data-tooltip={text} aria-pressed={options.pressed} disabled={options.disabled} data-settings-trigger={options.settings || undefined} aria-expanded={options.settings ? settingsOpen : undefined} onClick={action}>{icon}</button>;
  return <>
    <div className={styles.surface} data-player-surface data-player-ui="true" aria-hidden="true"
      onContextMenu={event => { event.preventDefault(); setMenu("main"); onSettings(true); }}
      onPointerDown={event => {
        if (event.button !== 0) return;
        frameRef.current?.focus({ preventScroll: true });
        pointer.current = { x: event.clientX, y: event.clientY, type: event.pointerType, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
        if (!paused && canRate) holdTimer.current = setTimeout(() => { heldRate.current = rate; onRate(2); setFeedback("2×"); }, 600);
      }}
      onPointerMove={event => { if (pointer.current && Math.hypot(event.clientX - pointer.current.x, event.clientY - pointer.current.y) > 12) { pointer.current.moved = true; finishHold(); } }}
      onPointerUp={event => {
        const start = pointer.current; pointer.current = null;
        if (finishHold() || !start || start.moved) return;
        const touch = start.type !== "mouse";
        const previous = lastTap.current;
        const double = previous && Date.now() - previous.at < 300 && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 60;
        if (clickTimer.current) clearTimeout(clickTimer.current);
        if (double) {
          lastTap.current = null;
          if (!touch) onFullscreen();
          else { const rect = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width; if (x < .4) skip(-10); else if (x > .6) skip(10); else play(); }
        } else {
          lastTap.current = { at: Date.now(), x: event.clientX, y: event.clientY };
          clickTimer.current = setTimeout(() => { if (touch) { if (shown && !paused) setVisible(false); else reveal(); } else play(); }, 300);
        }
      }} onPointerCancel={() => { pointer.current = null; finishHold(); }} onLostPointerCapture={() => finishHold()} />
    {feedback && <div className={styles.feedback} role="status">{feedback}</div>}
    {(shown || paused) && <button className={`${styles.center} ${!paused ? styles.touchOnly : ""}`} data-player-ui="true" type="button" onClick={play} disabled={!canPlay} aria-label={paused ? label("Play", "پخش") : label("Pause", "توقف")}>{paused ? <Play fill="currentColor" /> : <Pause fill="currentColor" />}</button>}
    <div className={`${styles.controls} ${shown ? styles.visible : ""}`} data-player-controls data-player-ui="true" dir="ltr" inert={!shown} onPointerEnter={() => { holding.current = true; reveal(); }} onPointerLeave={() => { holding.current = false; reveal(); }} onFocusCapture={reveal}>
      <div className={styles.timeline} onPointerMove={event => { if (!safeDuration || event.pointerType !== "mouse") return; const rect = event.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))); }} onPointerLeave={() => setHover(null)}>
        <div className={styles.track}><i style={{ width: `${Math.min(100, props.buffered ?? buffered)}%` }} /><b style={{ width: `${progress}%` }} /><em style={{ left: `${progress}%` }} /></div>
        {(hover !== null || scrub !== null) && <output className={styles.preview} style={{ left: `clamp(38px, ${(hover ?? progress / 100) * 100}%, calc(100% - 38px))` }}>{mediaTime(scrub ?? (hover ?? 0) * safeDuration)}</output>}
        <input type="range" min="0" max={safeDuration} step="0.1" value={position} aria-label={label("Seek", "جابه‌جایی زمان پخش")} aria-valuetext={`${mediaTime(position)} / ${mediaTime(safeDuration)}`} disabled={!canSeek || !safeDuration}
          onPointerDown={event => { holding.current = true; event.currentTarget.setPointerCapture(event.pointerId); }}
          onChange={event => { scrubRef.current = Number(event.target.value); setScrub(scrubRef.current); }} onPointerUp={commit} onPointerCancel={cancelScrub} onBlur={commit}
          onKeyDown={event => {
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); seek(event.key === "Home" ? 0 : event.key === "End" ? safeDuration : time + (event.key === "ArrowLeft" ? -5 : 5)); }
            if (event.key === " " || event.key === "k") { event.preventDefault(); play(); }
            if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); setSound(volume + (event.key === "ArrowUp" ? .05 : -.05)); }
          }} onKeyUp={commit} />
      </div>
      <div className={styles.row}>
        <div className={styles.group}>
          {button(paused ? label("Play (k)", "پخش (k)") : label("Pause (k)", "توقف (k)"), paused ? <Play fill="currentColor" /> : <Pause fill="currentColor" />, play, { disabled: !canPlay })}
          {onNext && button(label("Next episode (Shift+N)", "قسمت بعدی (Shift+N)"), <SkipForward fill="currentColor" />, onNext, { desktop: true, disabled: !canPlay })}
          <div className={styles.volume}>{button(muted ? label("Unmute (m)", "وصل صدا (m)") : label("Mute (m)", "قطع صدا (m)"), muted || !volume ? <VolumeX /> : <Volume2 />, mute)}<input aria-label={label("Volume", "صدا")} type="range" min="0" max="1" step=".05" value={muted ? 0 : volume} onChange={event => setSound(Number(event.target.value))} /></div>
          <span className={styles.time}>{mediaTime(position)}<span> / {mediaTime(safeDuration)}</span></span>
        </div>
        <div className={styles.group}>
          {onSubtitles && button(label("Subtitles (c)", "زیرنویس (c)"), <Captions />, onSubtitles)}
          {button(label("Settings", "تنظیمات"), <Settings />, () => { setMenu("main"); onSettings(!settingsOpen); }, { settings: true, pressed: settingsOpen })}
          {canPip && button(label("Miniplayer (i)", "تصویر در تصویر (i)"), <PictureInPicture2 />, () => void picture(), { desktop: true, pressed: pip })}
          {!audio && button(label("Theater mode (t)", "حالت سینما (t)"), <Monitor />, () => setTheater(value => !value), { desktop: true, pressed: theater })}
          {button(fullscreen ? label("Exit fullscreen (f)", "خروج از تمام‌صفحه (f)") : label("Fullscreen (f)", "تمام‌صفحه (f)"), fullscreen ? <Minimize /> : <Maximize />, onFullscreen)}
        </div>
      </div>
      {extras && <div className={styles.extras}>{extras}</div>}
    </div>
    <ResponsiveDialog mobileOnly open={settingsOpen} onClose={() => onSettings(false)} title={label("Playback settings", "تنظیمات پخش")} dir={fa ? "rtl" : "ltr"} closeLabel={label("Close settings", "بستن تنظیمات")} theme={audio ? "music" : "cinema"}>
      <section className={styles.settings} data-player-settings data-player-ui="true" dir={fa ? "rtl" : "ltr"} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onSettings(false); } }}>
        <header>{menu !== "main" && button(label("Back", "بازگشت"), <ChevronLeft />, () => setMenu("main"))}<strong>{menu === "quality" ? label("Quality & source", "کیفیت و منبع") : menu === "speed" ? label("Playback speed", "سرعت پخش") : menu === "keys" ? label("Keyboard shortcuts", "میانبرهای صفحه‌کلید") : label("Settings", "تنظیمات")}</strong>{button(label("Close settings", "بستن تنظیمات"), <X />, () => onSettings(false))}</header>
        {menu === "main" && <>
          <button disabled={!canSource} onClick={() => setMenu("quality")}><span>{label("Quality & source", "کیفیت و منبع")}</span><small>{sources.find(s => s.value === source)?.label}</small><ChevronRight /></button>
          <button disabled={!canRate} onClick={() => setMenu("speed")}><span>{label("Playback speed", "سرعت پخش")}</span><small>{rate === 1 ? label("Normal", "عادی") : `${rate}×`}</small><ChevronRight /></button>
          <label className={styles.sound}>{label("Volume", "صدا")}<input type="range" min="0" max="1" step=".05" value={muted ? 0 : volume} onChange={event => setSound(Number(event.target.value))} /></label>
          {onEpisodes && <button onClick={() => { onSettings(false); onEpisodes(); }}><ListVideo />{label("Episodes", "قسمت‌ها")}</button>}
          {onNext && <button disabled={!canPlay} onClick={() => { onNext(); onSettings(false); }}><SkipForward />{label("Next", "بعدی")}</button>}
          {canPip && <button onClick={() => { void picture(); onSettings(false); }}><PictureInPicture2 />{label("Picture in picture", "تصویر در تصویر")}</button>}
          {canCast && <button onClick={() => void cast()}><Monitor />{label("Cast / AirPlay", "ارسال به نمایشگر")}</button>}
          <button className={styles.desktop} onClick={() => setMenu("keys")}><Keyboard />{label("Keyboard shortcuts", "میانبرهای صفحه‌کلید")}</button>
        </>}
        {menu === "quality" && <div role="group" aria-label={label("Quality & source", "کیفیت و منبع")}>{sources.map(option => <button key={option.value} disabled={!canSource} aria-pressed={source === option.value} onClick={() => { onSource(option.value); onSettings(false); }}><span>{option.label}</span>{source === option.value && <Check />}</button>)}</div>}
        {menu === "speed" && <div role="group" aria-label={label("Playback speed", "سرعت پخش")}>{rates.map(value => <button key={value} disabled={!canRate} aria-pressed={rate === value} onClick={() => { onRate(value); onSettings(false); }}><span>{value === 1 ? label("Normal", "عادی") : `${value}×`}</span>{rate === value && <Check />}</button>)}</div>}
        {menu === "keys" && <dl className={styles.keys}>{[["Space / K", label("Play / pause", "پخش / توقف")], ["← / →", label("Seek 5 seconds", "۵ ثانیه جلو / عقب")], ["J / L", label("Seek 10 seconds", "۱۰ ثانیه جلو / عقب")], ["0–9", label("Jump to percentage", "رفتن به درصد زمان")], ["↑ / ↓ / M", label("Volume / mute", "صدا / بی‌صدا")], ["F / T / I", label("Fullscreen / theater / mini", "تمام‌صفحه / سینما / کوچک")], ["C", label("Toggle captions", "روشن / خاموش زیرنویس")], ["< / >", label("Playback speed", "سرعت پخش")], [", / .", label("Frame step (paused)", "حرکت فریم در توقف")]].map(([key, text]) => <div key={key}><dt><kbd>{key}</kbd></dt><dd>{text}</dd></div>)}</dl>}
      </section>
    </ResponsiveDialog>
  </>;
}
