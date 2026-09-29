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
import styles from "@/components/music-refresh.module.css";
import artistStyles from "@/components/artist-design.module.css";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, index] = await Promise.all([params, loadMusicArtistIndex()]);
  const artist = findMusicArtist(index, decodeURIComponent(slug));
  if (!artist) return { title: "Artist not found" };
  return artistMetadata(artist, artistTrackCount(artist));
}

export default async function MusicArtistPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string; category?: string }> }) {
  const [{ slug }, index] = await Promise.all([params, loadMusicArtistIndex()]);
  const artist = findMusicArtist(index, decodeURIComponent(slug));
  if (!artist) notFound();

  const query = await searchParams;
  const activeCategory = typeof query.category === "string" ? query.category.trim() : "";
  const allTracks = musicForArtistIndex(index, artist.slug);
  const categoryCounts = new Map<string, number>();
  for (const track of allTracks) {
    for (const category of new Set([track.category, ...(track.moods ?? [])].filter(Boolean))) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }
  const artistCategories = [...categoryCounts.keys()].sort((left, right) => left.localeCompare(right, "fa"));
  const tracks = activeCategory
    ? allTracks.filter((track) => new Set([track.category, ...(track.moods ?? [])]).has(activeCategory))
    : allTracks;
  const pages = Math.max(1, Math.ceil(tracks.length / 50));
  const requested = Number(query.page);
  const page = Number.isFinite(requested) ? Math.min(pages, Math.max(1, Math.floor(requested) || 1)) : 1;
  const similarArtists = relatedMusicArtistsIndex(index, artist, 10);
  const artwork = artist.profileImageUrl || artist.coverUrl;
  const artistPath = `/music/artists/${encodeURIComponent(artist.slug)}`;
  const pageHref = (value: number) => `${artistPath}?${new URLSearchParams({ ...(activeCategory ? { category: activeCategory } : {}), page: String(value) })}`;

  return (
    <main className={`shell music-artist-page music-artist-page-spotify ${styles.page} ${artistStyles.profile}`} dir="rtl">
      <StructuredData data={artistJsonLd(artist, tracks.length)} />
      <section className="wrap">
        <Link href="/music" className="music-back"><ArrowLeft size={16} /> بازگشت به موسیقی</Link>
        <header className="music-artist-hero music-artist-hero-spotify">
          <div className="music-artist-hero-art" style={artwork ? { backgroundImage: `url(${artwork})` } : undefined}>
            {!artwork && artist.name.slice(0, 1)}
          </div>
          <div className="music-artist-hero-copy">
            <p>هنرمند · آرشیو موسیقی سرونما</p>
            <h1>{artist.name}</h1>
            <span>{allTracks.length.toLocaleString("fa-IR")} اثر · {activeCategory ? `فیلتر: ${activeCategory}` : artistCategories.slice(0, 4).join("، ") || "موسیقی"}</span>
            <div className="music-artist-hero-meta"><a href="#artist-tracks">شنیدن آهنگ‌ها ↓</a><Link href="/music/artists">همهٔ هنرمندان</Link><a href={artist.profileSourceUrl || artist.sourceUrl} target="_blank" rel="noreferrer">آرشیو منبع ↗</a></div>
          </div>
        </header>
        {artistCategories.length > 0 && <nav className={artistStyles.categories} aria-label="دسته‌بندی‌های این خواننده">
          <Link className={!activeCategory ? artistStyles.categoryActive : undefined} href={artistPath}>همهٔ آهنگ‌ها <small>{allTracks.length.toLocaleString("fa-IR")}</small></Link>
          {artistCategories.map((category) => <Link className={activeCategory === category ? artistStyles.categoryActive : undefined} href={`${artistPath}?category=${encodeURIComponent(category)}`} key={category}>
            {category} <small>{categoryCounts.get(category)?.toLocaleString("fa-IR")}</small>
          </Link>)}
        </nav>}
        <MusicArtistPlaylist key={page} artistName={artist.name} tracks={tracks.slice((page - 1) * 50, page * 50)} />
        {pages > 1 && <nav className={styles.tools} aria-label="صفحه‌بندی آهنگ‌ها">
          {page > 1 && <Link href={pageHref(page - 1)}>← قبلی</Link>}
          <span>صفحهٔ {page.toLocaleString("fa")} از {pages.toLocaleString("fa")}</span>
          {page < pages && <Link href={pageHref(page + 1)}>بعدی →</Link>}
        </nav>}
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
