"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useMusicPlayback, type MusicPlaybackRequest } from "./music-playback-provider";
import { MusicPlayerEngine } from "./music-player-engine";
import styles from "./music-playback.module.css";

export function MusicPlayer(props: MusicPlaybackRequest) {
  const { play, attach, attachedId } = useMusicPlayback();
  const pathname = usePathname();
  const slot = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  useLayoutEffect(() => { latest.current = props; });
  useLayoutEffect(() => {
    if (slot.current) return attach(slot.current, pathname, latest.current);
  }, [attach, pathname, props.track.id]);
  useEffect(() => {
    if (props.playRequest) play(latest.current);
  }, [props.playRequest, play]);
  return <div ref={slot} className={styles.slot} data-music-slot={props.track.id} aria-owns={attachedId === props.track.id ? "persistent-music-player" : undefined}>
    {attachedId !== props.track.id && <div className={`${styles.inlineHost} ${styles.previewHost}`} data-music-preview data-media-theme="music" dir="rtl">
      <MusicPlayerEngine {...props} key={props.track.id} preview inline playRequest={0} onActivate={(track, settings) => play({ ...props, track, queue: [props.track, ...(props.queue ?? [])], settings })} />
    </div>}
  </div>;
}
