import Link from "next/link";
import { Headphones } from "lucide-react";
import { MusicCard } from "@/components/music-card";
import type { MusicTrack } from "@/lib/music-types";

export function MusicRail({ tracks }: { tracks: MusicTrack[] }) {
  if (!tracks.length) return null;
  return (
    <section className="music-rail-home">
      <div className="section-heading music-rail-heading">
        <div><p><Headphones size={15} /> SARVNEMA MUSIC</p><h2>Fresh Iranian music</h2><span>Direct listening, artist pages, and music videos.</span></div>
        <Link className="music-view-all" href="/music">Explore music <span>→</span></Link>
      </div>
      <div className="music-rail-list">
        {tracks.slice(0, 10).map((track, index) => <MusicCard key={track.id} track={track} priority={index < 3} />)}
      </div>
    </section>
  );
}
