"use client";
import { Play } from "lucide-react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useMusicPlayback, type MusicPlaybackRequest } from "./music-playback-provider";
import styles from "./music-refresh.module.css";

export function MusicPlayer(props: MusicPlaybackRequest) {
  const { play } = useMusicPlayback();
  const latest = useRef(props);
  useLayoutEffect(() => { latest.current = props; });
  useEffect(() => {
    if (props.playRequest) play(latest.current);
  }, [props.playRequest, play]);
  return <div className={styles.startPlayer}>
    <div><small>آمادهٔ شنیدن</small><strong>{props.track.persianTitle || props.track.title}</strong><span>{props.track.artists.map(artist => artist.name).join(" · ")}</span></div>
    <button type="button" onClick={() => play(props)} aria-label={`پخش ${props.track.persianTitle || props.track.title}`}><Play size={20} fill="currentColor" /> پخش</button>
    <p>با رفتن به صفحه‌های دیگر، موسیقی قطع نمی‌شود.</p>
  </div>;
}
