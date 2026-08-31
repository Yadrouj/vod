"use client";

import { ListMusic, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { MusicPlayer } from "@/components/music-player";
import type { MusicTrack } from "@/lib/music-types";

export function MusicArtistPlaylist({ artistName, tracks }: { artistName: string; tracks: MusicTrack[] }) {
  const [selectedId, setSelectedId] = useState(tracks[0]?.id ?? "");
  const [playRequest, setPlayRequest] = useState(0);
  const selectedIndex = Math.max(0, tracks.findIndex((track) => track.id === selectedId));
  const selected = tracks[selectedIndex] ?? tracks[0];
  const queue = useMemo(() => selected ? [...tracks.slice(selectedIndex + 1), ...tracks.slice(0, selectedIndex)] : [], [selected, selectedIndex, tracks]);

  if (!selected) return <p className="music-empty">هنوز آهنگ قابل‌پخشی برای این هنرمند ثبت نشده است.</p>;

  function selectTrack(track: MusicTrack, shouldPlay = true) {
    setSelectedId(track.id);
    if (shouldPlay) setPlayRequest((value) => value + 1);
  }

  return (
    <section className="artist-playlist-workspace" aria-label={`آرشیو ${artistName}`}>
      <aside className="artist-playlist-now-playing">
        <div className="artist-playlist-caption"><span>در حال پخش</span><ListMusic size={16} /><b>{tracks.length.toLocaleString("fa-IR")} ترک</b></div>
        <MusicPlayer track={selected} queue={queue} playRequest={playRequest} />
      </aside>
      <section className="artist-playlist-library">
        <header><div><p>DISCOGRAPHY</p><h2>آهنگ‌های {artistName}</h2></div><span>{tracks.length.toLocaleString("fa-IR")} اثر</span></header>
        <ol className="artist-track-list">
          {tracks.map((track, index) => {
            const active = track.id === selected.id;
            return <li className={active ? "is-active" : ""} key={track.id}>
              <button type="button" onClick={() => selectTrack(track)} aria-current={active ? "true" : undefined}>
                <i>{String(index + 1).padStart(2, "0")}</i>
                {track.coverUrl ? <img src={track.coverUrl} alt="" loading="lazy" /> : <span className="artist-track-art" />}
                <span className="artist-track-copy"><strong>{track.persianTitle || track.title}</strong><small>{track.artists.map((item) => item.name).join(" · ") || artistName}</small></span>
                <em>{track.album?.title || track.category}</em>
                <span className="artist-track-play"><Play size={16} fill="currentColor" /></span>
              </button>
            </li>;
          })}
        </ol>
      </section>
    </section>
  );
}
