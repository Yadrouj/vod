import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { MusicCard } from "@/components/music-card";
import { MusicLandingHero, type MusicHeroTrack } from "@/components/music-landing-hero";
import { MusicPlaylistLeaderboard } from "@/components/music-playlist-leaderboard";
import { PublicPartyRooms } from "@/components/public-party-rooms";
import { loadMusicIndex, searchMusic } from "@/lib/music";
import { getLocale } from "@/lib/server-locale";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const revalidate = 300;

export default async function MusicPage({ searchParams }: Props) {
  const [locale, index, params] = await Promise.all([getLocale(), loadMusicIndex(), searchParams]);
  const q = asText(params.q);
  const kind = asText(params.kind) || "all";
  const allMatches = searchMusic(index, q, kind);
  const tracks = allMatches.slice(0, q ? 80 : 24);
  const recentTracks = index.tracks.filter((track) => track.kind === "track").slice(0, 14);
  const recentVideos = index.tracks.filter((track) => track.kind === "video").slice(0, 12);
  const classics = index.tracks.filter((track) => track.category === "موسیقی قدیمی فارسی").slice(0, 12);
  const foreign = index.tracks.filter((track) => track.category === "موسیقی خارجی").slice(0, 12);
  const artistOfMoment = index.artists.find((artist) => artist.trackIds.length >= 8) ?? index.artists[0];
  const artistTracks = artistOfMoment
    ? index.tracks.filter((track) => track.artists.some((artist) => artist.slug === artistOfMoment.slug)).slice(0, 12)
    : [];
  const featuredArtists = index.artists.slice(0, 20);
  // Music-video artwork is generally larger and more reliable than the tiny
  // archive thumbnails, so it leads the visual hero while the shelves keep
  // their chronological catalog order.
  const heroSourceTracks = q && tracks.length ? tracks : [...recentVideos, ...recentTracks];
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
    { href: "/music/playlists", label: "پلی‌لیست خودت", description: "صف شخصی، پخش پشت‌سرهم و Shuffle", coverUrl: heroTracks[0]?.coverUrl ?? null },
    { href: "/music?kind=video", label: "موزیک‌ویدیو", description: "تصویر، صدا و اجرای زنده", coverUrl: recentVideos[0]?.coverUrl ?? null },
    { href: "/music?q=موسیقی%20قدیمی%20فارسی", label: "خاطره‌ها", description: "گلچین موسیقی قدیمی فارسی", coverUrl: classics[0]?.coverUrl ?? null },
    { href: "/music?q=موسیقی%20خارجی", label: "Foreign picks", description: "چند انتخاب تازه از آرشیو خارجی", coverUrl: foreign[0]?.coverUrl ?? null },
  ];

  return (
    <main className="shell music-page music-spotify-page" dir="rtl">
      <section className="music-landing-shell">
        <div className="wrap">
          <header className="topbar music-landing-topbar">
            <BrandLogo locale={locale} compact />
            <div className="topbar-actions">
              <Link className="pill" href="/">خانه</Link>
              <Link className="pill active" href="/music">موسیقی</Link>
            </div>
          </header>
          <MusicLandingHero tracks={heroTracks} initialQuery={q} initialKind={kind} />
        </div>
      </section>

      <section className="wrap music-content music-landing-content">
        {q ? (
          <>
            <div className="music-section-head music-search-results-head">
              <div><p>نتایج جست‌وجو</p><h2>{allMatches.length.toLocaleString("fa-IR")} نتیجه برای «{q}»</h2></div>
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
            <MusicShelf eyebrow="تازه از آرشیو" title="جدیدترین آهنگ‌ها" tracks={recentTracks} viewAll="/music?kind=track" preload />
            {artistOfMoment && <MusicShelf eyebrow="انتخاب امروز" title={`گلچین ${artistOfMoment.name}`} tracks={artistTracks} viewAll={`/music/artists/${encodeURIComponent(artistOfMoment.slug)}`} />}
            {recentVideos.length > 0 && <MusicShelf eyebrow="تصویر و صدا" title="موزیک‌ویدیوهای تازه" tracks={recentVideos} viewAll="/music?kind=video" />}
            {classics.length > 0 && <MusicShelf eyebrow="آرشیو خاطره‌ها" title="موسیقی قدیمی فارسی" tracks={classics} viewAll="/music?q=موسیقی%20قدیمی%20فارسی" />}
            {foreign.length > 0 && <MusicShelf eyebrow="برای کشف بیشتر" title="موسیقی خارجی" tracks={foreign} viewAll="/music?q=موسیقی%20خارجی" />}
          </>
        )}

        <div className="music-section-head music-artist-heading">
          <div><p>خواننده‌ها</p><h2>صفحهٔ اختصاصی هنرمندان</h2></div>
          <Link className="music-view-all" href="/music/artists">نمایش همه <span>←</span></Link>
        </div>
        <div className="music-artists">
          {featuredArtists.map((artist) => (
            <Link href={`/music/artists/${encodeURIComponent(artist.slug)}`} key={artist.slug} className="music-artist">
              <span style={(artist.profileImageUrl || artist.coverUrl) ? { backgroundImage: `url(${artist.profileImageUrl || artist.coverUrl})` } : undefined}>
                {!(artist.profileImageUrl || artist.coverUrl) && artist.name.slice(0, 1)}
              </span>
              <strong>{artist.name}</strong>
              <small>{artist.trackIds.length.toLocaleString("fa-IR")} اثر</small>
            </Link>
          ))}
        </div>
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
      <div className="music-shelf-list">{tracks.map((track, index) => <MusicCard key={track.id} track={track} priority={preload && index < 3} />)}</div>
    </section>
  );
}

function asText(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
