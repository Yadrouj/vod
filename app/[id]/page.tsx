import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { DeferredBackgroundVideo } from "@/components/deferred-background-video";
import { DownloadButton } from "@/components/ui/download-animation";
import { LanguageToggle } from "@/components/language-toggle";
import { TitleTabs, type TitleTabsItem } from "@/components/title-tabs";
import { WatchTogetherLauncher } from "@/components/watch-together-launcher";
import { findVodItem, normalizeVodType } from "@/lib/catalog";
import { buildSeasonSummaries, movieDownloadSources } from "@/lib/downloads";
import { formatNumber, getDictionary, typeLabel } from "@/lib/i18n";
import { getLocale } from "@/lib/server-locale";
import { subzoneSearchUrl } from "@/lib/subtitles";
import { BRAND_NAME } from "@/lib/brand";
import { sizedImageUrl } from "@/lib/image-url";
import type { VodItem } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) return { title: "Title not found" };
  return {
    title: item.title,
    description: `${item.title} metadata and direct file links on ${BRAND_NAME}.`
  };
}

export default async function DetailPage({ params }: Props) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) notFound();

  const best = item.links[0];
  const seasons = buildSeasonSummaries(item.links);
  const isSeries = normalizeVodType(item.type) === "series" && seasons.length > 0;
  const movieFiles = isSeries ? [] : movieDownloadSources(item.links);
  const heroVideo = detailHeroVideo(item);
  const tabsItem = toTitleTabsItem(item);

  return (
    <div className="shell">
      <section
        className="detail-hero"
        style={
          item.backdropUrl
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(5,5,5,0.96), rgba(5,5,5,0.56)), url(${sizedImageUrl(item.backdropUrl, 1600)})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }
            : undefined
        }
      >
        {heroVideo && (
          <DeferredBackgroundVideo
            src={heroVideo}
            poster={sizedImageUrl(item.backdropUrl ?? item.posterUrl, 1600)}
          />
        )}
        <div className="wrap">
          <header className="topbar detail-topbar">
            <BrandLogo locale={locale} compact />
            <nav className="detail-breadcrumb" aria-label="Breadcrumb">
              <Link href="/">{t.common.home}</Link>
              <span aria-hidden="true">/</span>
              <Link href={`/browse?type=${normalizeVodType(item.type)}`}>
                {normalizeVodType(item.type) === "series" ? t.common.series : t.common.films}
              </Link>
              <span aria-hidden="true">/</span>
              <span className="breadcrumb-current" aria-current="page">{item.title}</span>
            </nav>
            <div className="detail-topbar-tools">
              {item.imdbRating ? (
                <a
                  className="pill"
                  href={item.imdbUrl ?? `https://www.imdb.com/title/${item.imdbCode}/`}
                  target="_blank"
                  rel="noreferrer"
                >
                  IMDb {item.imdbRating.toFixed(1)}
                </a>
              ) : item.sourcePageUrl ? (
                <a className="pill" href={item.sourcePageUrl} target="_blank" rel="noreferrer">
                  {t.common.source}
                </a>
              ) : null}
              <LanguageToggle locale={locale} />
            </div>
          </header>

          <div className="detail-grid">
            <div className="detail-copy">
              <div className="meta">
                <span>{typeLabel(normalizeVodType(item.type), locale)}</span>
                <i className="dot" />
                <span>{item.year ?? "-"}</span>
                <i className="dot" />
                <span>{item.runtimeMinutes ? `${item.runtimeMinutes}m` : `${item.links.length} ${t.common.files}`}</span>
                <i className="dot" />
                <span>{item.source === "mihandownload" ? t.common.persianMovies : item.imdbCode}</span>
              </div>
              <h1>{item.title}</h1>
              {item.originalTitle && item.originalTitle !== item.title && (
                <p className="muted">{t.title.originalTitle}: {item.originalTitle}</p>
              )}
              {item.overview && <p>{item.overview}</p>}
              <div className="chips" style={{ marginTop: 24 }}>
                <Link className="play-glow detail-play-button" href={`/watch/${item.imdbCode}`}>
                  <span className="play-dot" /> {t.common.playOnline}
                </Link>
                <WatchTogetherLauncher
                  locale={locale}
                  placement="inline"
                  preset={{ itemId: item.imdbCode, title: item.title, posterUrl: item.backdropUrl ?? item.posterUrl }}
                />
                {best && <DownloadButton href={best.url} label={t.common.bestFile} />}
                <a
                  className="hover-button"
                  href={subzoneSearchUrl(item.title, item.year)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.title.subzoneSubtitles}
                </a>
                {item.imdbUrl ? (
                  <a className="hover-button" href={item.imdbUrl} target="_blank" rel="noreferrer">
                    {t.common.viewImdb}
                  </a>
                ) : item.sourcePageUrl ? (
                  <a className="hover-button" href={item.sourcePageUrl} target="_blank" rel="noreferrer">
                    {t.common.source}
                  </a>
                ) : null}
              </div>
            </div>

            <aside className="detail-card">
              {item.posterUrl && (
                <img
                  className="detail-poster"
                  src={sizedImageUrl(item.posterUrl, 500) ?? item.posterUrl}
                  alt={`${item.title} poster`}
                  loading="eager"
                  decoding="async"
                />
              )}
              <p className="label">{t.title.imdbData}</p>
              <div className="stats" style={{ marginTop: 16 }}>
                <Stat label={t.title.rating} value={item.imdbRating ? item.imdbRating.toFixed(1) : "-"} />
                <Stat label={t.title.votes} value={formatNumber(item.imdbVotes ?? 0, locale)} />
                <Stat label={t.title.runtime} value={item.runtimeMinutes ? `${item.runtimeMinutes}m` : "-"} />
                <Stat label={t.title.metascore} value={item.metascore ? String(item.metascore) : "-"} />
              </div>
              <div className="chips" style={{ marginTop: 18 }}>
                {(item.genres ?? []).map((genre) => (
                  <span key={genre} className="chip">{genre}</span>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <main className="wrap">
        <TitleTabs
          item={tabsItem}
          isSeries={isSeries}
          seasons={seasons}
          movieFiles={movieFiles}
          locale={locale}
        />
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <p className="label">{label}</p>
      <p className="value">{value}</p>
    </div>
  );
}

function detailHeroVideo(item: VodItem) {
  const storedUrl = pickHeroVideoUrl(item.imdbVideos ?? []);
  return storedUrl && !videoUrlExpired(storedUrl) ? storedUrl : null;
}

function toTitleTabsItem(item: VodItem): TitleTabsItem {
  return {
    title: item.title,
    imdbCode: item.imdbCode,
    type: item.type,
    year: item.year,
    endYear: item.endYear,
    releaseDate: item.releaseDate,
    certificate: item.certificate,
    countries: item.countries,
    languages: item.languages,
    qualities: item.qualities,
    keywords: item.keywords?.slice(0, 14),
    companies: item.companies?.slice(0, 8),
    credits: item.credits?.slice(0, 30),
    imdbVideos: item.imdbVideos?.slice(0, 10),
    imdbImages: item.imdbImages?.slice(0, 20),
    backdropUrl: item.backdropUrl,
    posterUrl: item.posterUrl,
    source: item.source,
  };
}

function pickHeroVideoUrl(videos: NonNullable<VodItem["imdbVideos"]>) {
  const preferred =
    videos.find((video) => /trailer|teaser|preview/i.test(video.name)) ??
    videos[0];
  const playbacks = preferred?.playback_urls ?? [];

  return (
    playbacks.find((playback) => /\.(mp4|m4v)(?:$|[?#])/i.test(playback.url))?.url ??
    playbacks.find((playback) => playback.mime_type?.toLowerCase() === "video/mp4")?.url ??
    null
  );
}

function videoUrlExpired(url: string) {
  try {
    const expires = Number(new URL(url).searchParams.get("Expires"));
    return Number.isFinite(expires) && expires <= Math.floor(Date.now() / 1000) + 60;
  } catch {
    return false;
  }
}
