import Link from "next/link";
import { ArrowUpLeft, MicVocal } from "lucide-react";
import type { MusicArtist } from "@/lib/music-types";

export function MusicArtistCard({ artist, priority = false }: { artist: MusicArtist; priority?: boolean }) {
  const artwork = artist.profileImageUrl || artist.coverUrl;
  const title = artist.name.trim() || "هنرمند";

  return (
    <Link href={`/music/artists/${encodeURIComponent(artist.slug)}`} className="music-artist-card" dir="auto">
      <div className="music-artist-card-cover">
        <span className="music-artist-card-fallback" aria-hidden="true">
          <MicVocal />
          <b>{title.slice(0, 1)}</b>
        </span>
        {artwork && (
          <img
            src={artwork}
            alt={title}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            referrerPolicy="no-referrer"
          />
        )}
        <em>{artist.trackIds.length.toLocaleString("fa-IR")} اثر</em>
        <i aria-hidden="true"><ArrowUpLeft /></i>
      </div>
      <div className="music-artist-card-copy">
        <strong>{title}</strong>
        <span>صفحهٔ هنرمند</span>
      </div>
    </Link>
  );
}
