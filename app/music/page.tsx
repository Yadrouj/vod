import type { Metadata } from "next";
import { DiscoveryUpdateStrip } from "@/components/discovery-update-strip";
import { Suspense } from "react";
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
import { artistTrackCount, loadMusicIndex, loadMusicLandingIndex, normalizeMusicTrack, searchMusic, selectMusicShelfTracks } from "@/lib/music";
import { getLocale } from "@/lib/server-locale";
import { titleMetadata } from "@/lib/seo";
import { LandingPulse } from "@/components/landing-pulse";
import { matchingMusicArtists } from "@/lib/music-search-ranking";
import styles from "@/components/music-refresh.module.css";
import { MoodCollectionsPreview } from "@/components/mood-collections-preview";
import { loadMoodPlaylists } from "@/lib/mood-playlists";
import { MusicCategoryNav } from "@/components/music-category-nav";
import { selectLibraryArrivals } from "@/lib/music-library-merge";
import { mirroredImageUrl } from "@/lib/image-url";
import {requestedMusic,selectedPublisherTracks,publisherMusicCollections} from '@/lib/musicdel-selections';
import {FeaturedListening} from '@/components/featured-listening';

const REMIX_CATEGORY = "\u0631\u06cc\u0645\u06cc\u06a9\u0633";
const REMIX_DESCRIPTION = "\u0631\u06cc\u0645\u06cc\u06a9\u0633\u200c\u0647\u0627\u06cc \u0634\u0627\u062f\u060c \u067e\u0627\u062f\u06a9\u0633\u062a \u0648 \u0627\u0646\u062a\u062e\u0627\u0628\u200c\u0647\u0627\u06cc \u062a\u0627\u0632\u0647";

const MUSIC_SHELF_SIZE = 12;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const revalidate = 300;

export const metadata: Metadata = titleMetadata({
  title: MUSIC_LANDING_SEO.metaTitle,
  description: MUSIC_LANDING_SEO.description,
  pathname: "/music",
  keywords: MUSIC_LANDING_SEO.keywords,
});

export default async function MusicPage({ searchParams }: Props) {
  const params = await searchParams;
  const { hasFilter, kind, q } = musicFilters(params);
  if (hasFilter) {
    const locale = await getLocale();
    return <main className={`shell music-page music-spotify-page ${styles.page}`} dir="rtl">
      <section className="music-landing-shell"><div className="wrap">
        <MusicHeader locale={locale}/>
        <MusicLandingHero tracks={[]} initialQuery={q} initialKind={kind} iranian={false}/>
      </div></section>
      <section className="wrap music-content music-landing-content">
        <Suspense key={JSON.stringify(params)} fallback={<p role="status">در حال پیدا کردن موسیقی…</p>}><FilteredMusic params={params}/></Suspense>
      </section>
    </main>;
  }
  const [locale, index] = await Promise.all([getLocale(), loadMusicLandingIndex()]);
  const shelfTracks = index.tracks;
  const libraryArrivals = selectLibraryArrivals(shelfTracks, MUSIC_SHELF_SIZE);
  const recentTracks = selectMusicShelfTracks(shelfTracks.filter((track) => track.kind === "track"), MUSIC_SHELF_SIZE);
  const recentVideos = selectMusicShelfTracks(shelfTracks.filter((track) => track.kind === "video"), MUSIC_SHELF_SIZE);
  const classics = selectMusicShelfTracks(shelfTracks.filter((track) => track.category === "موسیقی قدیمی فارسی"), MUSIC_SHELF_SIZE);
  const foreign = selectMusicShelfTracks(shelfTracks.filter((track) => track.category === "موسیقی خارجی"), MUSIC_SHELF_SIZE);
  const remixes = selectMusicShelfTracks(shelfTracks.filter((track) => track.category === REMIX_CATEGORY), MUSIC_SHELF_SIZE);
  const currentYear = new Date().getUTCFullYear();
  const weeklyTracks = selectMusicShelfTracks(
    shelfTracks.filter((track) => isMusicReleasedThisWeek(track)),
    MUSIC_SHELF_SIZE,
  );
  const currentYearTracks = selectMusicShelfTracks(
    shelfTracks.filter((track) => track.kind === "track" && trackPublishedYear(track) === currentYear),
    MUSIC_SHELF_SIZE,
  );
  const topClassics = classics;
  const compactArchiveStats = "archiveStats" in index && isMusicArchiveStats(index.archiveStats) ? index.archiveStats : null;
  const archiveStats: MusicArchiveStats | undefined = compactArchiveStats ?? {
    tracks: index.tracks.filter((track) => track.kind === "track").length,
    artists: new Set(index.tracks.flatMap((track) => normalizeMusicTrack(track).artists.map((artist) => artist.slug))).size,
    videos: index.tracks.filter((track) => track.kind === "video").length,
  };
  const featuredArtists = pickFeaturedArtists(index.artists, 12);
  const artistOfMoment = featuredArtists.find(artist => index.tracks.some(track => track.artists.some(ref => ref.slug === artist.slug))) ?? index.artists[0];
  const artistTracks = artistOfMoment
    ? selectMusicShelfTracks(index.tracks.filter((track) => track.artists.some((artist) => artist.slug === artistOfMoment.slug)), MUSIC_SHELF_SIZE)
    : [];
  // Music-video artwork is generally larger and more reliable than the tiny
  // archive thumbnails, so it leads the visual hero while the shelves keep
  // their chronological catalog order.
  const iranianTracks = shelfTracks.filter(track=>track.kind==='track' && track.coverUrl && track.artists.some(artist=>/محسن یگانه|معین|هایده|مهستی|بهنام بانی|ابی|داریوش|شادمهر|رضا بهرام|شجریان|آرون افشار|سوسن|حمیرا|اشوان/.test(artist.name)));
  const heroSourceTracks = [...requestedMusic, ...iranianTracks, ...weeklyTracks, ...recentTracks];
  const heroSeen = new Set<string>();
  const heroTracks: MusicHeroTrack[] = [...heroSourceTracks]
    .filter(track => { if (heroSeen.has(track.id)) return false; heroSeen.add(track.id); return true; })
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
    { href: "/music?added=library", label: "تازه‌های آرشیو", description: "آهنگ‌های اضافه‌شده با دسته‌بندی‌های واقعی", coverUrl: libraryArrivals[0]?.coverUrl ?? null },
    { href: `/music?category=${encodeURIComponent(REMIX_CATEGORY)}`, label: REMIX_CATEGORY, description: REMIX_DESCRIPTION, coverUrl: remixes[0]?.coverUrl ?? null },
    { href: "/music/collections", label: "پلی‌لیست‌های حال‌وهوا", description: "سفر، تمرکز، ورزش و خاطره‌ها", coverUrl: heroTracks[0]?.coverUrl ?? null },
    { href: "/music?kind=video", label: "موزیک‌ویدیو", description: "تصویر، صدا و اجرای زنده", coverUrl: recentVideos[0]?.coverUrl ?? null },
    { href: "/music?category=%D9%85%D9%88%D8%B3%DB%8C%D9%82%DB%8C%20%D9%82%D8%AF%DB%8C%D9%85%DB%8C%20%D9%81%D8%A7%D8%B1%D8%B3%DB%8C", label: "خاطره‌ها", description: "گلچین موسیقی قدیمی فارسی", coverUrl: classics[0]?.coverUrl ?? null },
    { href: `/music?category=${encodeURIComponent("موسیقی خارجی")}`, label: "گلچین خارجی", description: "راک، متال، جاز، پاپ و کشف‌های تازه", coverUrl: foreign[0]?.coverUrl ?? null },
  ];

  return (
    <main className={`shell music-page music-spotify-page ${styles.page}`} dir="rtl">
      <StructuredData data={landingJsonLd(MUSIC_LANDING_SEO, "/music")} />
      <section className="music-landing-shell">
        <div className="wrap">
          <MusicHeader locale={locale}/>
          <MusicLandingHero tracks={heroTracks} archiveStats={archiveStats} iranian />
          <LandingPulse initial={{ version: index.updatedAt, updatedAt: Date.parse(index.updatedAt) > 0 ? index.updatedAt : null, recentCount: 0 }} locale={locale} endpoint="/api/music/pulse" updatesHref="/music?fresh=week" />
        </div>
      </section>

      <section className="wrap music-content music-landing-content">
        <FeaturedListening tracks={requestedMusic}/>
        <DiscoveryUpdateStrip music title="تازه بشنو، راحت‌تر کشف کن"
          description="موسیقی را با حال‌وهوا یا خواننده انتخاب کن." updatedAt={index.updatedAt}
          links={[{ href: "/music?added=library", label: "تازه‌های آرشیو" }, { href: "/music/collections", label: "پلی‌لیست‌ها" }, { href: `/music?category=${encodeURIComponent("موسیقی خارجی")}`, label: "موسیقی خارجی" }, { href: "/music/artists", label: "هنرمندان" }]} />
            <MusicShelf eyebrow="از لینک‌های عمومی ناشر · تازه‌اضافه‌شده به سرونما" title="تازه‌های ترکی و ریمیکس" tracks={selectedPublisherTracks.filter(t=>!requestedMusic.some(x=>x.id===t.id))} viewAll={'/music/collections/'+publisherMusicCollections[0].id} />
            <Suspense fallback={null}><OptionalMoods/></Suspense>
            <MusicShelf eyebrow="اضافه‌شده به سرونما · دسته‌بندی با تگ‌ها" title="تازه‌های آرشیو" tracks={libraryArrivals} viewAll="/music?added=library" />
            <PublicPartyRooms mode="listen" locale={locale} />
            <nav className="music-discovery-grid" aria-label="میان‌برهای موسیقی">
              {discovery.map((item, itemIndex) => (
                <Link href={item.href} className={`music-discovery-card music-discovery-card-${itemIndex + 1}`} key={item.href}>
                  <span className="music-discovery-art" style={item.coverUrl ? { backgroundImage: `url("${mirroredImageUrl(item.coverUrl)}")` } : undefined} aria-hidden="true" />
                  <i>0{itemIndex + 1}</i>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                  <b>←</b>
                </Link>
              ))}
            </nav>
            <MusicPlaylistLeaderboard />
            {weeklyTracks.length > 0 && <MusicShelf eyebrow="همین هفته" title="تازه‌های این هفته" tracks={weeklyTracks} viewAll="/music?fresh=week" />}
            {currentYearTracks.length > 0 && <MusicShelf eyebrow={`${currentYear} • تازه رسیده`} title={`انتشارهای ${currentYear}`} tracks={currentYearTracks} viewAll={`/music?year=${currentYear}`} />}
            {remixes.length > 0 && <MusicShelf eyebrow={REMIX_CATEGORY} title={REMIX_CATEGORY} tracks={remixes} viewAll={`/music?category=${encodeURIComponent(REMIX_CATEGORY)}`} />}
            <MusicShelf eyebrow="تازه از آرشیو" title="جدیدترین آهنگ‌ها" tracks={recentTracks} viewAll="/music?kind=track" />
            {topClassics.length > 0 && <MusicShelf eyebrow="آرشیو خاطره‌ها" title="موسیقی قدیمی فارسی" tracks={topClassics} viewAll={`/music?category=${encodeURIComponent("موسیقی قدیمی فارسی")}`} />}
            {artistOfMoment && <MusicShelf eyebrow="انتخاب امروز" title={`گلچین ${artistOfMoment.name}`} tracks={artistTracks} viewAll={`/music/artists/${encodeURIComponent(artistOfMoment.slug)}`} />}
            {recentVideos.length > 0 && <MusicShelf eyebrow="تصویر و صدا" title="موزیک‌ویدیوهای تازه" tracks={recentVideos} viewAll="/music?kind=video" />}
            {foreign.length > 0 && <MusicShelf eyebrow="برای کشف بیشتر" title="موسیقی خارجی" tracks={foreign} viewAll="/music?q=موسیقی%20خارجی" />}
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
        <MusicCategoryNav categories={index.categories} categoryCounts={index.categoryCounts} libraryCategoryCounts={index.libraryCategoryCounts} />
      </section>
    </main>
  );
}

type MusicParams = Awaited<Props["searchParams"]>;

function musicFilters(params: MusicParams) {
  const category = asText(params.category);
  const q = asText(params.q);
  const kind = asText(params.kind) || "all";
  const fresh = asText(params.fresh);
  const libraryOnly = asText(params.added) === "library";
  const year = Number(asText(params.year)) || null;
  const filterLabel = q || category || (libraryOnly ? "تازه‌های آرشیو" : "") || (fresh === "week" ? "تازه‌های این هفته" : "") || (year ? String(year) : "") || kind;
  const hasFilter = Boolean(q || category || kind !== "all" || year || fresh || libraryOnly);
  return { category, q, kind, fresh, libraryOnly, year, filterLabel, hasFilter };
}

function MusicHeader({locale}: {locale: Awaited<ReturnType<typeof getLocale>>}) {
  return <header className="topbar music-landing-topbar">
            <BrandLogo locale={locale} compact />
            <div className="topbar-actions">
              <PersonalListenLauncher />
              <Link className="pill" href="/">خانه</Link>
              <Link className="pill active" href="/music">موسیقی</Link>
            </div>
          </header>;
}

async function FilteredMusic({params}: {params: MusicParams}) {
  const { category, q, kind, fresh, libraryOnly, year, filterLabel } = musicFilters(params);
  const index = await loadMusicIndex();
  const allMatches = searchMusic(index, q, kind, category)
      .filter((track) => !year || trackPublishedYear(track) === year)
      .filter((track) => fresh !== "week" || isMusicReleasedThisWeek(track))
      .filter((track) => !libraryOnly || track.sources.some(source => source.provider === "melodify" || source.provider === "sarvnema-hosted"));
  if (libraryOnly) allMatches.sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? "") || a.id.localeCompare(b.id, "en", { numeric: true }));
  const pageCount = Math.max(1, Math.ceil(allMatches.length / 80));
  const requestedPage = Number(asText(params.page));
  const page = Number.isFinite(requestedPage) ? Math.min(pageCount, Math.max(1, Math.floor(requestedPage) || 1)) : 1;
  const pageHref = (value: number) => {
    const search = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) if (key !== "page" && asText(val)) search.set(key, asText(val));
    search.set("page", String(value));
    return `/music?${search}`;
  };
  const tracks = allMatches.slice((page - 1) * 80, page * 80);
  const matchingArtists = q ? matchingMusicArtists(index.artists,q).slice(0,12) : [];
  return <>
    <details className={styles.filterPanel}><summary>تغییر دسته‌بندی</summary>
      <MusicCategoryNav categories={index.categories} categoryCounts={index.categoryCounts} libraryCategoryCounts={index.libraryCategoryCounts} activeCategory={category} libraryOnly={libraryOnly}/>
    </details>
            {matchingArtists.length > 0 && <section><h2>خواننده‌ها</h2><MusicHorizontalRail label="خواننده‌های مرتبط">{matchingArtists.map(artist => <MusicArtistCard key={artist.slug} artist={artist} />)}</MusicHorizontalRail></section>}
            <div className="music-section-head music-search-results-head">
              <div><p>نتایج جست‌وجو</p><h2>{allMatches.length.toLocaleString("fa-IR")} نتیجه برای «{filterLabel}»</h2></div>
              <span>{index.tracks.length.toLocaleString("fa-IR")} عنوان در آرشیو</span>
            </div>
            <div className="music-grid">{tracks.map((track, trackIndex) => <MusicCard key={track.id} track={track} priority={trackIndex < 8} />)}</div>
            {pageCount > 1 && <nav className={styles.tools} aria-label="صفحه‌بندی آهنگ‌ها">
              {page > 1 && <Link href={pageHref(page - 1)}>← قبلی</Link>}
              <span>صفحهٔ {page.toLocaleString("fa-IR")} از {pageCount.toLocaleString("fa-IR")}</span>
              {page < pageCount && <Link href={pageHref(page + 1)}>بعدی →</Link>}
            </nav>}
            {!tracks.length && <div className="music-empty">هنوز چیزی برای این جست‌وجو پیدا نشد؛ نام انگلیسی یا فارسی خواننده را امتحان کن.</div>}
  </>;
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

async function OptionalMoods() {
  const index = await loadMoodPlaylists().catch(() => null);
  return index?.playlists.length ? <MoodCollectionsPreview playlists={index.playlists}/> : null;
}

function asText(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function trackPublishedYear(track: { publishedAt: string | null }) {
  return Number(track.publishedAt?.match(/\b(19|20)\d{2}\b/)?.[0] ?? 0);
}

function isMusicReleasedThisWeek(track: { publishedAt: string | null; folder: { year: string | null; month: string | null; day: string | null } }) {
  const folderDate = [track.folder.year, track.folder.month, track.folder.day].filter(Boolean).join("-");
  const timestamp = Date.parse(track.publishedAt || folderDate);
  const age = Date.now() - timestamp;
  return Number.isFinite(timestamp) && age >= 0 && age <= 7 * 24 * 60 * 60 * 1_000;
}

function pickFeaturedArtists<T extends { slug: string; trackIds: string[]; trackCount?: number; profileImageUrl?: string | null; coverUrl: string | null }>(artists: T[], limit: number) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date());
  const pool = artists
    .filter((artist) => artistTrackCount(artist) > 1)
    .sort((left, right) => (
      Number(Boolean(right.profileImageUrl || right.coverUrl)) - Number(Boolean(left.profileImageUrl || left.coverUrl))
      || artistTrackCount(right) - artistTrackCount(left)
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

function isMusicArchiveStats(value: unknown): value is MusicArchiveStats {
  if (!value || typeof value !== "object") return false;
  const stats = value as Record<string, unknown>;
  return [stats.tracks, stats.artists, stats.videos].every((item) => typeof item === "number" && Number.isFinite(item));
}
