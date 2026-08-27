import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LandingSeoContent } from "@/components/landing-seo-content";
import { MusicArtistCard } from "@/components/music-artist-card";
import { MusicCard } from "@/components/music-card";
import { MusicHorizontalRail } from "@/components/music-horizontal-rail";
import { MusicLandingHero, type MusicArchiveStats, type MusicHeroTrack } from "@/components/music-landing-hero";
import { MusicPlaylistLeaderboard } from "@/components/music-playlist-leaderboard";
import { PersonalListenLauncher } from "@/components/personal-listen-launcher";
import { PublicPartyRooms } from "@/components/public-party-rooms";
import { StructuredData } from "@/components/structured-data";
import { MUSIC_LANDING_SEO, landingJsonLd } from "@/lib/landing-seo";
import { loadMusicIndex, normalizeMusicTrack, searchMusic, selectMusicShelfTracks } from "@/lib/music";
import { getLocale } from "@/lib/server-locale";
import { titleMetadata } from "@/lib/seo";

const REMIX_CATEGORY = "\u0631\u06cc\u0645\u06cc\u06a9\u0633";
const REMIX_DESCRIPTION = "\u0631\u06cc\u0645\u06cc\u06a9\u0633\u200c\u0647\u0627\u06cc \u0634\u0627\u062f\u060c \u067e\u0627\u062f\u06a9\u0633\u062a \u0648 \u0627\u0646\u062a\u062e\u0627\u0628\u200c\u0647\u0627\u06cc \u062a\u0627\u0632\u0647";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const revalidate = 300;

export const metadata: Metadata = titleMetadata({
  title: MUSIC_LANDING_SEO.metaTitle,
  description: MUSIC_LANDING_SEO.description,
  pathname: "/music",
  keywords: MUSIC_LANDING_SEO.keywords,
});

export default async function MusicPage({ searchParams }: Props) {
  const [locale, index, params] = await Promise.all([getLocale(), loadMusicIndex(), searchParams]);
  const category = asText(params.category);
  const q = asText(params.q);
  const kind = asText(params.kind) || "all";
  const filterLabel = q || category || kind;
  const hasFilter = Boolean(q || category);
  const allMatches = searchMusic(index, q, kind, category);
  const tracks = allMatches.slice(0, hasFilter ? 80 : 24);
  const recentTracks = selectMusicShelfTracks(index.tracks.filter((track) => track.kind === "track"), 16);
  const recentVideos = selectMusicShelfTracks(index.tracks.filter((track) => track.kind === "video"), 16);
  const classics = selectMusicShelfTracks(index.tracks.filter((track) => track.category === "موسیقی قدیمی فارسی"), 16);
  const foreign = selectMusicShelfTracks(index.tracks.filter((track) => track.category === "موسیقی خارجی"), 16);
  const remixes = selectMusicShelfTracks(index.tracks.filter((track) => track.category === REMIX_CATEGORY), 16);
  const archiveStats: MusicArchiveStats = {
    tracks: index.tracks.filter((track) => track.kind === "track").length,
    artists: new Set(index.tracks.flatMap((track) => normalizeMusicTrack(track).artists.map((artist) => artist.slug))).size,
    videos: index.tracks.filter((track) => track.kind === "video").length,
  };
  const artistOfMoment = index.artists.find((artist) => artist.trackIds.length >= 8) ?? index.artists[0];
  const artistTracks = artistOfMoment
    ? selectMusicShelfTracks(index.tracks.filter((track) => track.artists.some((artist) => artist.slug === artistOfMoment.slug)), 16)
    : [];
  const featuredArtists = pickFeaturedArtists(index.artists, 14);
  // Music-video artwork is generally larger and more reliable than the tiny
  // archive thumbnails, so it leads the visual hero while the shelves keep
  // their chronological catalog order.
  const heroSourceTracks = hasFilter && tracks.length ? tracks : [...recentVideos, ...remixes, ...recentTracks];
  const heroTracks: MusicHeroTrack[] = [...heroSourceTracks]
    .sort((left, right) => Number(Boolean(right.coverUrl)) - Number(Boolean(left.coverUrl)))
    .slice(0, 8)
    .map((track) => ({
      id: track.id,
      title: track.title,
      persianTitle: track.persianTitle,
      coverUrl: track.coverUrl,
      kind: track.kind,
      artists: track.artists.map((artist) => ({ name: artist.name })),
    }));
  const discovery = [
    { href: `/music?category=${encodeURIComponent(REMIX_CATEGORY)}`, label: REMIX_CATEGORY, description: REMIX_DESCRIPTION, coverUrl: remixes[0]?.coverUrl ?? null },
    { href: "/music/playlists", label: "پلی‌لیست خودت", description: "صف شخصی، پخش پشت‌سرهم و Shuffle", coverUrl: heroTracks[0]?.coverUrl ?? null },
    { href: "/music?kind=video", label: "موزیک‌ویدیو", description: "تصویر، صدا و اجرای زنده", coverUrl: recentVideos[0]?.coverUrl ?? null },
    { href: "/music?category=%D9%85%D9%88%D8%B3%DB%8C%D9%82%DB%8C%20%D9%82%D8%AF%DB%8C%D9%85%DB%8C%20%D9%81%D8%A7%D8%B1%D8%B3%DB%8C", label: "خاطره‌ها", description: "گلچین موسیقی قدیمی فارسی", coverUrl: classics[0]?.coverUrl ?? null },
    { href: "/music?q=موسیقی%20خارجی", label: "Foreign picks", description: "چند انتخاب تازه از آرشیو خارجی", coverUrl: foreign[0]?.coverUrl ?? null },
  ];

  return (
    <main className="shell music-page music-spotify-page" dir="rtl">
      <StructuredData data={landingJsonLd(MUSIC_LANDING_SEO, "/music")} />
      <section className="music-landing-shell">
        <div className="wrap">
          <header className="topbar music-landing-topbar">
            <BrandLogo locale={locale} compact />
            <div className="topbar-actions">
              <PersonalListenLauncher />
              <Link className="pill" href="/">خانه</Link>
              <Link className="pill active" href="/music">موسیقی</Link>
            </div>
          </header>
          <MusicLandingHero tracks={heroTracks} archiveStats={archiveStats} initialQuery={q} initialKind={kind} />
        </div>
      </section>

      <section className="wrap music-content music-landing-content">
        {hasFilter ? (
          <>
            <div className="music-section-head music-search-results-head">
              <div><p>نتایج جست‌وجو</p><h2>{allMatches.length.toLocaleString("fa-IR")} نتیجه برای «{filterLabel}»</h2></div>
              <span>{index.tracks.length.toLocaleString("fa-IR")} عنوان در آرشیو</span>
            </div>
            <div className="music-grid">{tracks.map((track, trackIndex) => <MusicCard key={track.id} track={track} priority={trackIndex < 8} />)}</div>
            {!tracks.length && <div className="music-empty">هنوز چیزی برای این جست‌وجو پیدا نشد؛ نام انگلیسی یا فارسی خواننده را امتحان کن.</div>}
          </>
        ) : (
          <>
            <nav className="music-discovery-grid" aria-label="میان‌برهای موسیقی">
              {discovery.map((item, itemIndex) => (
                <Link href={item.href} className={`music-discovery-card music-discovery-card-${itemIndex + 1}`} key={item.href}>
                  <span className="music-discovery-art" style={item.coverUrl ? { backgroundImage: `url("${item.coverUrl}")` } : undefined} aria-hidden="true" />
                  <i>0{itemIndex + 1}</i>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                  <b>←</b>
                </Link>
              ))}
            </nav>
            <PublicPartyRooms mode="listen" locale={locale} />
            <MusicPlaylistLeaderboard />
            {remixes.length > 0 && <MusicShelf eyebrow={REMIX_CATEGORY} title={REMIX_CATEGORY} tracks={remixes} viewAll={`/music?category=${encodeURIComponent(REMIX_CATEGORY)}`} />}
            <MusicShelf eyebrow="تازه از آرشیو" title="جدیدترین آهنگ‌ها" tracks={recentTracks} viewAll="/music?kind=track" preload />
            {artistOfMoment && <MusicShelf eyebrow="انتخاب امروز" title={`گلچین ${artistOfMoment.name}`} tracks={artistTracks} viewAll={`/music/artists/${encodeURIComponent(artistOfMoment.slug)}`} />}
            {recentVideos.length > 0 && <MusicShelf eyebrow="تصویر و صدا" title="موزیک‌ویدیوهای تازه" tracks={recentVideos} viewAll="/music?kind=video" />}
            {classics.length > 0 && <MusicShelf eyebrow="آرشیو خاطره‌ها" title="موسیقی قدیمی فارسی" tracks={classics} viewAll="/music?category=%D9%85%D9%88%D8%B3%DB%8C%D9%82%DB%8C%20%D9%82%D8%AF%DB%8C%D9%85%DB%8C%20%D9%81%D8%A7%D8%B1%D8%B3%DB%8C" />}
            {foreign.length > 0 && <MusicShelf eyebrow="برای کشف بیشتر" title="موسیقی خارجی" tracks={foreign} viewAll="/music?q=موسیقی%20خارجی" />}
          </>
        )}

        <div className="music-section-head music-artist-heading">
          <div><p>خواننده‌ها</p><h2>صفحهٔ اختصاصی هنرمندان</h2></div>
          <Link className="music-view-all" href="/music/artists">نمایش همه <span>←</span></Link>
        </div>
        <MusicHorizontalRail className="music-artist-card-list" label="خواننده‌های منتخب">
          {featuredArtists.map((artist) => (
            <MusicArtistCard artist={artist} key={artist.slug} />
          ))}
        </MusicHorizontalRail>
        <LandingSeoContent content={MUSIC_LANDING_SEO} />
      </section>
    </main>
  );
}

function MusicShelf({ eyebrow, title, tracks, viewAll, preload = false }: { eyebrow: string; title: string; tracks: Awaited<ReturnType<typeof loadMusicIndex>>["tracks"]; viewAll: string; preload?: boolean }) {
  if (!tracks.length) return null;
  return (
    <section className="music-shelf">
      <div className="music-section-head">
        <div><p>{eyebrow}</p><h2>{title}</h2></div>
        <Link className="music-view-all" href={viewAll}>نمایش همه <span>←</span></Link>
      </div>
      <MusicHorizontalRail className="music-shelf-list" label={title}>{tracks.map((track, index) => <MusicCard key={track.id} track={track} priority={preload && index < 3} />)}</MusicHorizontalRail>
    </section>
  );
}

function asText(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function pickFeaturedArtists<T extends { slug: string; trackIds: string[]; profileImageUrl?: string | null; coverUrl: string | null }>(artists: T[], limit: number) {
  const day = new Date().toISOString().slice(0, 10);
  const pool = artists
    .filter((artist) => artist.trackIds.length > 1)
    .sort((left, right) => (
      Number(Boolean(right.profileImageUrl || right.coverUrl)) - Number(Boolean(left.profileImageUrl || left.coverUrl))
      || right.trackIds.length - left.trackIds.length
    ))
    .slice(0, Math.max(limit * 5, 70));

  return pool
    .map((artist) => ({ artist, score: hashArtist(`${day}:${artist.slug}`) }))
    .sort((left, right) => left.score - right.score)
    .slice(0, limit)
    .map(({ artist }) => artist);
}

function hashArtist(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
