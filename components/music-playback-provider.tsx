"use client";
import Link from "next/link";
import { Minimize2, Maximize2, Expand, X } from "lucide-react";
import { createContext, lazy, Suspense, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { MusicTrack } from "@/lib/music-types";
import styles from "./music-refresh.module.css";

export type MusicPlaybackRequest = { track: MusicTrack; queue?: MusicTrack[]; playRequest?: number; lyricsAutoOpen?: boolean; onTrackPlay?: (track: MusicTrack) => void };
const Engine = lazy(() => import("./music-player-engine").then(module => ({ default: module.MusicPlayerEngine })));
const PlaybackContext = createContext<{ play: (request: MusicPlaybackRequest) => void } | null>(null);
export function useMusicPlayback() {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error("Music playback provider is missing");
  return context;
}

export function MusicPlaybackProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const path = useRef(pathname);
  useLayoutEffect(() => { path.current = pathname; }, [pathname]);
  const [request, setRequest] = useState<(MusicPlaybackRequest & { origin: string; serial: number }) | null>(null);
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [activeId, setActiveId] = useState("");
  const [immersive, setImmersive] = useState(false);
  const container = useRef<HTMLDialogElement>(null);
  const hasRequest = Boolean(request);
  useLayoutEffect(() => {
    const dialog = container.current;
    return () => {
      // Removing a media element alone need not stop its playback/network load.
      dialog?.querySelectorAll("audio,video").forEach(node => {
        const player = node as HTMLMediaElement;
        player.pause(); player.removeAttribute("src"); player.load();
      });
      if (dialog && "mediaSession" in navigator) navigator.mediaSession.metadata = null;
    };
  }, [hasRequest]);
  useLayoutEffect(() => {
    const dialog = container.current;
    if (!dialog || !hasRequest) return;
    if (immersive) {
      if (dialog.open) dialog.close();
      dialog.showModal();
      const overflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = overflow; };
    }
    if (dialog.matches(":modal")) dialog.close();
    dialog.open = true;
  }, [immersive, hasRequest]);
  const play = useCallback((next: MusicPlaybackRequest) => {
    setRequest(previous => ({ ...next, origin: path.current, serial: (previous?.serial ?? 0) + 1 }));
    setExpandedPath(path.current);
    setActiveId(next.track.id);
  }, []);
  const compact = !immersive && expandedPath !== pathname;
  const close = () => {
    container.current?.querySelectorAll("audio,video").forEach(node => { const media = node as HTMLMediaElement; media.pause(); media.removeAttribute("src"); media.load(); });
    setRequest(null);
    setImmersive(false);
  };
  return <PlaybackContext.Provider value={{ play }}>
    {children}
    {request && <dialog ref={container} open={!immersive} onCancel={event => { event.preventDefault(); setImmersive(false); }} className={`${styles.dock} ${compact ? styles.compact : ""} ${immersive ? styles.immersive : ""}`} data-music-dock data-immersive={immersive || undefined} data-media-theme="music" dir="rtl" aria-label="پخش‌کنندهٔ موسیقی">
      <header><Link href={`/music/${activeId}`} onClick={() => setImmersive(false)}>صفحهٔ آهنگ ↗</Link><span />{!immersive && <button type="button" onClick={() => setImmersive(true)} aria-label="نمای تمام‌صفحهٔ موسیقی و متن"><Expand size={18} /></button>}<button type="button" onClick={() => { setImmersive(false); setExpandedPath(compact ? pathname : null); }} aria-label={compact ? "بزرگ کردن پلیر" : "کوچک کردن پلیر"}>{compact ? <Maximize2 size={16} /> : <Minimize2 size={16} />}</button><button type="button" onClick={close} aria-label="بستن و قطع موسیقی"><X size={18} /></button></header>
      <Suspense fallback={<p role="status">در حال آماده‌کردن پخش…</p>}><Engine {...request} immersive={immersive} playRequest={request.serial} onTrackPlay={track => { setActiveId(track.id); request.onTrackPlay?.(track); }} /></Suspense>
    </dialog>}
  </PlaybackContext.Provider>;
}
