import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { MusicPlayer } from "@/components/music-player";
import { WatchTogetherLauncher } from "@/components/watch-together-launcher";
import { findMusicTrack, loadMusicIndex, relatedMusic } from "@/lib/music";
import { musicPartyMedia } from "@/lib/watch-party-music";
import { notFound } from "next/navigation";

export const revalidate = 300;

export default async function MusicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, index] = await Promise.all([params, loadMusicIndex()]);
  const track = findMusicTrack(index, id);
  if (!track) notFound();

  const more = relatedMusic(index, track, 12);
  const partyMedia = musicPartyMedia(track);

  return (
    <main className="shell music-detail" dir="rtl">
      <div className="wrap">
        <Link href="/music" className="music-back"><ArrowLeft size={16} /> بازگشت به موسیقی</Link>
        <section className="music-detail-hero" style={track.coverUrl ? { "--music-cover": `url(${track.coverUrl})` } as React.CSSProperties : undefined}>
          <div className="music-detail-cover">{track.coverUrl && <img src={track.coverUrl} alt="" />}</div>
          <div className="music-detail-copy">
            <span>{track.kind === "video" ? "موزیک ویدیو" : "آهنگ"} · {track.category}</span>
            <h1>{track.title}</h1>
            <h2>{track.persianTitle}</h2>
            <div className="music-detail-artists">
              {track.artists.map((artist) => <Link key={artist.slug} href={`/music/artists/${encodeURIComponent(artist.slug)}`}>{artist.name}</Link>)}
            </div>
            <p>{track.description}</p>
            <a href={track.sourceUrl} target="_blank" rel="noreferrer">منبع اثر <ExternalLink size={14} /></a>
          </div>
        </section>

        {partyMedia && (
          <div className="music-detail-party">
            <WatchTogetherLauncher locale="fa" placement="inline" media={partyMedia} label="شنیدن همزمان" experience="listen" />
          </div>
        )}

        <MusicPlayer track={track} queue={more} />

        {more.length > 0 && (
          <section className="music-more">
            <div className="music-section-head"><div><p>بیشتر از همین فضا</p><h2>مشابه برای ادامهٔ گوش‌دادن</h2></div></div>
            <div>
              {more.map((item) => (
                <Link key={item.id} href={`/music/${item.id}`}>
                  {item.coverUrl && <img src={item.coverUrl} alt="" />}
                  <span><strong>{item.title}</strong><small>{item.persianTitle}</small></span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
