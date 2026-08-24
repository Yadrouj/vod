import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MusicArtistCard } from "@/components/music-artist-card";
import { MusicCard } from "@/components/music-card";
import { MusicHorizontalRail } from "@/components/music-horizontal-rail";
import { StructuredData } from "@/components/structured-data";
import { findMusicArtist, loadMusicIndex, musicForArtist, relatedMusicArtists } from "@/lib/music";
import { artistJsonLd, artistMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, index] = await Promise.all([params, loadMusicIndex()]);
  const artist = findMusicArtist(index, decodeURIComponent(slug));
  if (!artist) return { title: "Artist not found" };
  return artistMetadata(artist, musicForArtist(index, artist.slug).length);
}

export default async function MusicArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, index] = await Promise.all([params, loadMusicIndex()]);
  const artist = findMusicArtist(index, decodeURIComponent(slug));
  if (!artist) notFound();

  const tracks = musicForArtist(index, artist.slug);
  const similarArtists = relatedMusicArtists(index, artist, 10);

  return (
    <main className="shell music-artist-page" dir="rtl">
      <StructuredData data={artistJsonLd(artist, tracks.length)} />
      <section className="wrap">
        <Link href="/music" className="music-back"><ArrowLeft size={16} /> بازگشت به موسیقی</Link>
        <header className="music-artist-hero">
          <div className="music-artist-portrait" style={(artist.profileImageUrl || artist.coverUrl) ? { backgroundImage: `url(${artist.profileImageUrl || artist.coverUrl})` } : undefined}>
            {!(artist.profileImageUrl || artist.coverUrl) && artist.name.slice(0, 1)}
          </div>
          <div>
            <p>ARTIST PROFILE</p>
            <h1>{artist.name}</h1>
            <span>{tracks.length.toLocaleString("fa-IR")} اثر · {artist.categories.join("، ")}</span>
            <a href={artist.profileSourceUrl || artist.sourceUrl} target="_blank" rel="noreferrer">آرشیو منبع</a>
          </div>
        </header>
        <div className="music-grid">{tracks.map((track, index) => <MusicCard key={track.id} track={track} priority={index < 6} />)}</div>
        {similarArtists.length > 0 && (
          <section className="music-similar-artists">
            <div className="music-section-head"><div><p>برای کشف بیشتر</p><h2>خواننده‌های نزدیک به این حال‌وهوا</h2></div></div>
            <MusicHorizontalRail className="music-artist-card-list" label="خواننده‌های مشابه">
              {similarArtists.map((item) => <MusicArtistCard artist={item} key={item.slug} />)}
            </MusicHorizontalRail>
          </section>
        )}
      </section>
    </main>
  );
}
