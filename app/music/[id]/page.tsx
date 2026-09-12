import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { MusicPlayer } from "@/components/music-player";
import { StructuredData } from "@/components/structured-data";
import { findMusicTrack, loadMusicIndex, relatedMusic } from "@/lib/music";
import { musicJsonLd, musicMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import styles from "./music-detail.module.css";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const [{ id }, index] = await Promise.all([params, loadMusicIndex()]);
  const track = findMusicTrack(index, id);
  return track ? musicMetadata(track) : { title: "Music track not found" };
}

export default async function MusicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, index] = await Promise.all([params, loadMusicIndex()]);
  const track = findMusicTrack(index, id);
  if (!track) notFound();

  const more = relatedMusic(index, track, 12);

  return (
    <main className={`shell ${styles.page}`} dir="rtl">
      <StructuredData data={musicJsonLd(track)} />
      <div className="wrap">
        <nav className={styles.topbar} aria-label="مسیر موسیقی"><Link href="/music" className="music-back"><ArrowLeft size={16} /> بازگشت به موسیقی</Link><Link href="/music/playlists">پلی‌لیست‌های من</Link></nav>
        <h1 className={styles.screenReaderTitle}>{track.persianTitle || track.title}</h1>
        <section className={styles.workspace} aria-label="آهنگ و کنترل‌های پخش">
          <MusicPlayer track={track} queue={more} />
        </section>

        <details className={styles.about}><summary>دربارهٔ این اثر <span>{track.category}</span></summary><p>{track.description}</p><a href={track.sourceUrl} target="_blank" rel="noreferrer">منبع اثر <ExternalLink size={14} /></a></details>

        {more.length > 0 && (
          <section className={styles.related}>
            <h2>برای ادامهٔ شنیدن</h2>
            <div className={styles.tracks}>
              {more.map((item) => (
                <Link key={item.id} href={`/music/${item.id}`}>
                  {item.coverUrl && <img src={item.coverUrl} alt="" />}
                  <span><strong>{item.persianTitle || item.title}</strong><small>{item.artists.map(artist => artist.name).join(" · ")}</small></span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
