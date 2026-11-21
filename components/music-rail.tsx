import Link from "next/link";
import { Headphones } from "lucide-react";
import { MusicCard } from "@/components/music-card";
import { MusicHorizontalRail } from "@/components/music-horizontal-rail";
import { selectMusicShelfTracks } from "@/lib/music";
import type { MusicTrack } from "@/lib/music-types";
import {requestedMusic} from '@/lib/musicdel-selections';

export function MusicRail({ tracks,locale='fa' }: { tracks: MusicTrack[];locale?:'fa'|'en' }) {
  const visibleTracks = [...requestedMusic,...selectMusicShelfTracks(tracks.filter((track) => track.kind === "track" && !requestedMusic.some(t=>t.id===track.id)), 10)];
  if (!visibleTracks.length) return null;
  return (
    <section className="music-rail-home" data-media-theme="music">
      <div className="section-heading music-rail-heading">
        <div><p><Headphones size={15} /> SARVNEMA MUSIC</p><h2>{locale==='fa'?'انتخاب‌های موسیقی سرونما':'SarvNema music picks'}</h2><span>{locale==='fa'?'دو اجرای ویژه، انتخاب‌های تازهٔ ترکی و ریمیکس؛ با پخش مستقیم.':'Featured recordings, Turkish selections and remixes.'}</span></div>
        <Link className="music-view-all" href="/music">{locale==='fa'?'همهٔ موسیقی‌ها':'Explore music'}</Link>
      </div>
      <MusicHorizontalRail className="music-rail-list" label="Fresh Iranian music">
        {visibleTracks.map((track, index) => <MusicCard key={track.id} track={track} priority={index < 3} />)}
      </MusicHorizontalRail>
    </section>
  );
}
