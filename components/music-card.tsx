import Link from "next/link";
import { Music2, Play } from "lucide-react";
import type { MusicTrack } from "@/lib/music-types";

export function MusicCard({ track, priority = false }: { track: MusicTrack; priority?: boolean }) {
  const year = Number(track.publishedAt?.match(/\b(19|20)\d{2}\b/)?.[0] ?? 0);
  const isFresh = year >= new Date().getUTCFullYear();
  const folderDate = [track.folder.year, track.folder.month, track.folder.day].filter(Boolean).join("-");
  const releasedAt = Date.parse(track.publishedAt || folderDate);
  const today = Date.parse(new Date().toISOString().slice(0, 10));
  const releasedThisWeek = Number.isFinite(releasedAt) && today - releasedAt >= 0 && today - releasedAt <= 7 * 24 * 60 * 60 * 1_000;
  const freshLabel = releasedThisWeek ? "تازه این هفته" : isFresh ? `NEW ${year}` : null;
  return (
    <Link href={`/music/${track.id}`} className={`music-card${freshLabel ? " music-card-is-fresh" : ""}`} dir="auto">
      <div className="music-card-cover">
        <span className="music-card-fallback" aria-hidden="true"><Music2 /><b>{(track.persianTitle || track.title).slice(0, 1)}</b></span>
        {track.coverUrl ? <img src={track.coverUrl} alt="" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" referrerPolicy="no-referrer" /> : null}
        <i><Play size={15} fill="currentColor" /></i>
        <em>{track.kind === "video" ? "Video" : "Track"}</em>
        {freshLabel && <span className="music-card-fresh">{freshLabel}</span>}
      </div>
      <div className="music-card-copy">
        <strong>{track.title}</strong>
        <span>{track.artists.map((artist) => artist.name).join(" • ")}</span>
        {track.album?.title && <small>{track.album.title}</small>}
      </div>
    </Link>
  );
}
