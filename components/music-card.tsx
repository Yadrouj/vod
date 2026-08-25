import Link from "next/link";
import { Music2, Play } from "lucide-react";
import type { MusicTrack } from "@/lib/music-types";

export function MusicCard({ track, priority = false }: { track: MusicTrack; priority?: boolean }) {
  return (
    <Link href={`/music/${track.id}`} className="music-card" dir="auto">
      <div className="music-card-cover">
        <span className="music-card-fallback" aria-hidden="true"><Music2 /><b>{(track.persianTitle || track.title).slice(0, 1)}</b></span>
        {track.coverUrl ? <img src={track.coverUrl} alt="" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" referrerPolicy="no-referrer" /> : null}
        <i><Play size={15} fill="currentColor" /></i>
        <em>{track.kind === "video" ? "Video" : "Track"}</em>
      </div>
      <div className="music-card-copy">
        <strong>{track.title}</strong>
        <span>{track.artists.map((artist) => artist.name).join(" • ")}</span>
        {track.album?.title && <small>{track.album.title}</small>}
      </div>
    </Link>
  );
}
