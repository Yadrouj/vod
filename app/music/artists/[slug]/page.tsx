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
import { findSingerProfile, loadCreatorProfiles, singerAsArtist, singerRecordings, tracksForSinger } from '@/lib/creator-profiles';
import { CreatorProfileBio } from '@/components/creator-profile-bio';
import { SingerRecordings } from '@/components/singer-recordings';
import { CreatorPortrait } from '@/components/creator-portrait';
import creatorStyles from '@/components/creator-profiles.module.css';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, index, creators] = await Promise.all([params, loadMusicArtistIndex(), loadCreatorProfiles()]);
  const profile = findSingerProfile(creators, slug);
  const artist = profile ? singerAsArtist(profile, tracksForSinger(index, profile)) : findMusicArtist(index, slug);
  if (!artist) return { title: "Artist not found" };
  return artistMetadata(artist, artistTrackCount(artist));
}

export default async function MusicArtistPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string; category?: string }> }) {
  const [{ slug }, index, creators] = await Promise.all([params, loadMusicArtistIndex(), loadCreatorProfiles()]);
  const profile = findSingerProfile(creators, slug);
  const profileTracks = profile ? tracksForSinger(index, profile) : null;
  const artist = profile ? singerAsArtist(profile, profileTracks!) : findMusicArtist(index, slug);
  if (!artist) notFound();

  const query = await searchParams;
  const activeCategory = typeof query.category === "string" ? query.category.trim() : "";
  const allTracks = profileTracks ?? musicForArtistIndex(index, artist.slug);
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
  const similarArtists = allTracks.length ? relatedMusicArtistsIndex(index, artist, 10) : [];
  const artwork = artist.profileImageUrl || artist.coverUrl;
  const artistPath = `/music/artists/${encodeURIComponent(artist.slug)}`;
  const pageHref = (value: number) => `${artistPath}?${new URLSearchParams({ ...(activeCategory ? { category: activeCategory } : {}), page: String(value) })}`;

  return (
    <main className={`shell music-artist-page music-artist-page-spotify ${styles.page} ${artistStyles.profile} ${creatorStyles.portrait}`} dir="rtl" data-singer-profile={profile?.wikidataId}>
      <StructuredData data={artistJsonLd(artist, allTracks.length, Boolean(profile))} />
      <section className="wrap">
        <Link href="/music" className="music-back"><ArrowLeft size={16} /> بازگشت به موسیقی</Link>
        <header className="music-artist-hero music-artist-hero-spotify">
          {profile ? <CreatorPortrait src={profile.imageUrl} name={profile.nameFa} eager /> : <div className="music-artist-hero-art" style={artwork ? { backgroundImage: `url(${artwork})` } : undefined}>{!artwork && artist.name.slice(0, 1)}</div>}
          <div className="music-artist-hero-copy">
            <p>هنرمند · آرشیو موسیقی سرونما</p>
            <h1>{artist.name}</h1>
            <span>{allTracks.length.toLocaleString("fa-IR")} اثر · {activeCategory ? `فیلتر: ${activeCategory}` : artistCategories.slice(0, 4).join("، ") || "موسیقی"}</span>
            <div className="music-artist-hero-meta"><a href="#artist-tracks">{allTracks.length ? 'شنیدن آهنگ‌ها ↓' : 'وضعیت آرشیو ↓'}</a><Link href="/music/artists">همهٔ هنرمندان</Link>{profile && <Link href="/music/artists/top-100">۱۰۰ صدای برجسته</Link>}<a href={artist.profileSourceUrl || artist.sourceUrl} target="_blank" rel="noreferrer">منبع معرفی ↗</a></div>
          </div>
        </header>
        {artistCategories.length > 0 && <nav className={artistStyles.categories} aria-label="دسته‌بندی‌های این خواننده">
          <Link className={!activeCategory ? artistStyles.categoryActive : undefined} href={artistPath}>همهٔ آهنگ‌ها <small>{allTracks.length.toLocaleString("fa-IR")}</small></Link>
          {artistCategories.map((category) => <Link className={activeCategory === category ? artistStyles.categoryActive : undefined} href={`${artistPath}?category=${encodeURIComponent(category)}`} key={category}>
            {category} <small>{categoryCounts.get(category)?.toLocaleString("fa-IR")}</small>
          </Link>)}
        </nav>}
        {profile && <CreatorProfileBio profile={profile} />}
        {allTracks.length > 0 ? <MusicArtistPlaylist key={`${artist.slug}-${page}-${activeCategory}`} artistName={artist.name} tracks={tracks.slice((page - 1) * 50, page * 50)} /> : <section id="artist-tracks" className={creatorStyles.bio}><h2>هنوز اثری در آرشیو سرونما نداریم</h2><p>معرفی و کاور آثار را در پایین ببینید. تا زمانی که فایلِ معتبری در آرشیو ثبت نشود، دکمهٔ پخش یا دانلود نمایش نمی‌دهیم.</p></section>}
        {profile && <SingerRecordings recordings={singerRecordings(profile, allTracks)} />}
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
