"use client";
import { Play } from "lucide-react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useMusicPlayback, type MusicPlaybackRequest } from "./music-playback-provider";
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
    <div className={styles.ready} hidden={attachedId === props.track.id}>
      {props.track.coverUrl && <img src={props.track.coverUrl} alt="" />}
      <div><small>{props.track.kind === "video" ? "موزیک‌ویدیو" : "آهنگ"}</small><strong>{props.track.persianTitle || props.track.title}</strong><span>{props.track.artists.map(artist => artist.name).join(" · ")}</span>
        <button type="button" onClick={() => play(props)} aria-label={`پخش ${props.track.persianTitle || props.track.title}`}><Play size={20} fill="currentColor" /> پخش این آهنگ</button>
      </div>
    </div>
  </div>;
}
