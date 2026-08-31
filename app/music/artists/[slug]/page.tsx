import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MusicArtistCard } from "@/components/music-artist-card";
import { MusicArtistPlaylist } from "@/components/music-artist-playlist";
import { MusicHorizontalRail } from "@/components/music-horizontal-rail";
import { StructuredData } from "@/components/structured-data";
import { artistTrackCount, findMusicArtist, loadMusicArtistIndex, musicForArtistIndex, relatedMusicArtistsIndex } from "@/lib/music";
import { artistJsonLd, artistMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, index] = await Promise.all([params, loadMusicArtistIndex()]);
  const artist = findMusicArtist(index, decodeURIComponent(slug));
  if (!artist) return { title: "Artist not found" };
  return artistMetadata(artist, artistTrackCount(artist));
}

export default async function MusicArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, index] = await Promise.all([params, loadMusicArtistIndex()]);
  const artist = findMusicArtist(index, decodeURIComponent(slug));
  if (!artist) notFound();

  const tracks = musicForArtistIndex(index, artist.slug);
  const similarArtists = relatedMusicArtistsIndex(index, artist, 10);
  const artwork = artist.profileImageUrl || artist.coverUrl;

  return (
    <main className="shell music-artist-page music-artist-page-spotify" dir="rtl">
      <StructuredData data={artistJsonLd(artist, tracks.length)} />
      <section className="wrap">
        <Link href="/music" className="music-back"><ArrowLeft size={16} /> بازگشت به موسیقی</Link>
        <header className="music-artist-hero music-artist-hero-spotify">
          <div className="music-artist-hero-art" style={artwork ? { backgroundImage: `url(${artwork})` } : undefined}>
            {!artwork && artist.name.slice(0, 1)}
          </div>
          <div className="music-artist-hero-copy">
            <p>ARTIST · آرشیو سرونما</p>
            <h1>{artist.name}</h1>
            <span>{tracks.length.toLocaleString("fa-IR")} اثر · {artist.categories.slice(0, 4).join("، ") || "موسیقی"}</span>
            <div className="music-artist-hero-meta"><b>پخش فوری</b><b>صف پخش خودکار</b><a href={artist.profileSourceUrl || artist.sourceUrl} target="_blank" rel="noreferrer">آرشیو منبع ↗</a></div>
          </div>
        </header>
        <MusicArtistPlaylist artistName={artist.name} tracks={tracks} />
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
