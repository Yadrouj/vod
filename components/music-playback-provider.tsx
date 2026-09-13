"use client";
import Link from "next/link";
import { Minimize2, Maximize2, Expand, X } from "lucide-react";
import { createContext, lazy, Suspense, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import type { MusicTrack } from "@/lib/music-types";
import type { MusicPlaybackSettings } from "./music-player-engine";
import styles from "./music-refresh.module.css";
import playbackStyles from "./music-playback.module.css";

export type MusicPlaybackRequest = { track: MusicTrack; queue?: MusicTrack[]; playRequest?: number; lyricsAutoOpen?: boolean; onTrackPlay?: (track: MusicTrack) => void; settings?: MusicPlaybackSettings };
const Engine = lazy(() => import("./music-player-engine").then(module => ({ default: module.MusicPlayerEngine })));
type PlayerSlot = { pathname: string; trackId: string };
const PlaybackContext = createContext<{
  play: (request: MusicPlaybackRequest) => void;
  attach: (node: HTMLDivElement, pathname: string, request: MusicPlaybackRequest) => () => void;
  attachedId: string | null;
} | null>(null);
export function useMusicPlayback() {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error("Music playback provider is missing");
  return context;
}

export function MusicPlaybackProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const path = useRef(pathname);
  useLayoutEffect(() => { path.current = pathname; }, [pathname]);
  const [request, setRequest] = useState<(MusicPlaybackRequest & { origin: string; serial: number; started: boolean }) | null>(null);
  const [slot, setSlot] = useState<PlayerSlot | null>(null);
  const slotNode = useRef<HTMLDivElement | null>(null);
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [activeId, setActiveId] = useState("");
  const [immersive, setImmersive] = useState(false);
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  const container = useRef<HTMLDialogElement>(null);
  const hasRequest = Boolean(request);
  const currentId = request?.started ? activeId : request?.track.id;
  const inline = Boolean(ready && request && slot && slot.pathname === pathname && (request.origin === pathname || slot.trackId === currentId));

  const attach = useCallback((node: HTMLDivElement, slotPath: string, next: MusicPlaybackRequest) => {
    const entry = { pathname: slotPath, trackId: next.track.id };
    slotNode.current = node;
    setSlot(entry);
    // Browsing another track must never replace music that is already playing.
    setRequest(previous => previous?.started ? previous : { ...next, origin: slotPath, serial: 0, started: false });
    return () => { if (slotNode.current === node) slotNode.current = null; setSlot(current => current === entry ? null : current); };
  }, []);

  useLayoutEffect(() => {
    const host = container.current;
    const node = slotNode.current;
    if (!inline || immersive || !node || !host) return;
    let frame = 0;
    const place = () => {
      if (!node.isConnected) return;
      const rect = node.getBoundingClientRect();
      host.style.setProperty("--music-inline-x", `${rect.left + window.scrollX}px`);
      host.style.setProperty("--music-inline-y", `${rect.top + window.scrollY}px`);
      host.style.setProperty("--music-inline-width", `${rect.width}px`);
      const height = `${Math.ceil(host.getBoundingClientRect().height)}px`;
      if (node.style.height !== height) node.style.height = height;
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place); };
    // Keep the media DOM in the persistent layout. Only its position changes;
    // moving it between React portals would remount/restart audio and video.
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    observer.observe(host);
    observer.observe(document.body);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    place();
    return () => {
      observer.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      node.style.height = "";
    };
  }, [inline, immersive, slot]);
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
    setRequest(previous => ({ ...next, origin: path.current, serial: (previous?.serial ?? 0) + 1, started: true }));
    setExpandedPath(path.current);
    setActiveId(next.track.id);
  }, []);
  const compact = !inline && !immersive && expandedPath !== pathname;
  const close = () => {
    container.current?.querySelectorAll("audio,video").forEach(node => { const media = node as HTMLMediaElement; media.pause(); media.removeAttribute("src"); media.load(); });
    setRequest(null);
    setReady(false);
    setImmersive(false);
  };
  return <PlaybackContext.Provider value={{ play, attach, attachedId: inline ? slot!.trackId : null }}>
    {children}
    {request && typeof document !== "undefined" && createPortal(<dialog ref={container} id="persistent-music-player" open={!immersive}
      hidden={!ready || !inline && !request.started && !immersive} role={inline && !immersive ? "region" : "dialog"}
      onCancel={event => { event.preventDefault(); setImmersive(false); }}
      className={`${styles.dock} ${compact ? styles.compact : ""} ${immersive ? styles.immersive : ""} ${inline && !immersive ? playbackStyles.inlineHost : ""}`}
      data-music-player-host data-music-inline={inline && !immersive || undefined} data-music-dock={!inline || immersive || undefined}
      data-immersive={immersive || undefined} data-media-theme="music" dir="rtl" aria-label="پخش‌کنندهٔ موسیقی">
      <header><Link href={`/music/${currentId}`} onClick={() => setImmersive(false)}>صفحهٔ آهنگ ↗</Link><span />
        {!immersive && <button type="button" onClick={() => setImmersive(true)} aria-label="نمای تمام‌صفحهٔ موسیقی و متن"><Expand size={18} /></button>}
        {(!inline || immersive) && <button type="button" onClick={() => { setImmersive(false); setExpandedPath(compact ? pathname : null); }} aria-label={immersive ? "بازگشت به پلیر" : compact ? "بزرگ کردن پلیر" : "کوچک کردن پلیر"}>{compact ? <Maximize2 size={16} /> : <Minimize2 size={16} />}</button>}
        {!inline && <button type="button" onClick={close} aria-label="بستن و قطع موسیقی"><X size={18} /></button>}
      </header>
      <Suspense fallback={null}><Engine {...request} onReady={markReady} inline={inline && !immersive} immersive={immersive} playRequest={request.serial} onTrackPlay={track => {
        setActiveId(track.id);
        setRequest(previous => previous && !previous.started ? { ...previous, started: true } : previous);
        request.onTrackPlay?.(track);
      }} /></Suspense>
    </dialog>, document.body)}
  </PlaybackContext.Provider>;
}
