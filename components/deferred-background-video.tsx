"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

export function DeferredBackgroundVideo({ src, poster, locale = "fa" }: { src: string; poster?: string | null; locale?: Locale }) {
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);
  const wantsPlayback = useRef(false);
  const interacted = useRef(false);
  const visible = useRef(true);
  const fa = locale === "fa";

  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const hero = controls.current?.closest("section");
    const sync = () => {
      if (!visible.current || document.hidden || !wantsPlayback.current) video.current?.pause();
      else video.current?.play().catch(() => {});
    };
    const observer = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; sync(); }, { threshold: 0.15 });
    if (hero) observer.observe(hero);
    const motionChanged = () => { if (motion.matches) { wantsPlayback.current = false; sync(); } };
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", motionChanged);
    // Let the poster and controls paint before requesting any video bytes.
    const timer = window.setTimeout(() => {
      if (interacted.current || motion.matches || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "") || !visible.current || document.hidden) return;
      wantsPlayback.current = true;
      setEnabled(true);
    }, 1800);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", motionChanged);
    };
  }, [src]);

  function toggle() {
    interacted.current = true;
    wantsPlayback.current = !playing;
    if (!enabled) setEnabled(true);
    else if (playing) video.current?.pause();
    else video.current?.play().catch(() => {});
  }

  return <>
    {enabled && !failed && <video ref={video} className="detail-video-bg" src={src} poster={poster ?? undefined}
      muted={muted} loop playsInline preload="none" aria-hidden="true" tabIndex={-1} autoPlay
      onLoadedData={() => { if (!wantsPlayback.current || !visible.current || document.hidden) video.current?.pause(); }}
      onPlay={() => { if (!visible.current || document.hidden || !wantsPlayback.current) video.current?.pause(); else setPlaying(true); }} onPause={() => setPlaying(false)} onError={() => setFailed(true)} />}
    <div ref={controls} className="trailer-controls" aria-label={fa ? "کنترل تریلر پس‌زمینه" : "Background trailer controls"}>
      {failed ? <span role="status">{fa ? "تریلر در دسترس نیست" : "Trailer unavailable"}</span> : <>
        <button type="button" onClick={toggle} aria-label={fa ? playing ? "توقف تریلر" : "پخش تریلر" : playing ? "Pause trailer" : "Play trailer"}>
          {playing ? <Pause size={16} /> : <Play size={16} />}<span>{fa ? "تریلر" : "Trailer"}</span>
        </button>
        {enabled && <button type="button" onClick={() => setMuted(!muted)} aria-label={fa ? muted ? "فعال کردن صدای تریلر" : "بی‌صدا کردن تریلر" : muted ? "Unmute trailer" : "Mute trailer"} aria-pressed={!muted}>
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>}
      </>}
    </div>
  </>;
}
