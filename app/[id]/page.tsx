import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { DownloadAction } from "@/components/download-action";
import { LanguageToggle } from "@/components/language-toggle";
import { TitleTabs } from "@/components/title-tabs";
import { findVodItem, normalizeVodType } from "@/lib/catalog";
import { buildSeasonSummaries, movieDownloadSources } from "@/lib/downloads";
import { formatNumber, getDictionary, typeLabel } from "@/lib/i18n";
import { getLocale } from "@/lib/server-locale";
import { subzoneSearchUrl } from "@/lib/subtitles";
import { loadVodIndex } from "@/lib/vod-index";
import { BRAND_NAME } from "@/lib/brand";
import type { VodCard, VodItem } from "@/lib/types";

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
  const index = await loadVodIndex();
  const suggestions = similarTitles(item, index.items);
  const heroVideo = await detailHeroVideo(item);

  return (
    <div className="shell">
      <section
        className="detail-hero"
        style={
          item.backdropUrl
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(5,5,5,0.96), rgba(5,5,5,0.56)), url(${item.backdropUrl})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }
            : undefined
        }
      >
        {heroVideo && (
          <video
            className="detail-video-bg"
            src={heroVideo}
            poster={item.backdropUrl ?? item.posterUrl ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
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
                <Link className="play-glow" href={`/watch/${item.imdbCode}`}>
                  <span className="play-dot" /> {t.common.playOnline}
                </Link>
                {best && <a className="hover-button" href={best.url}><DownloadAction label={t.common.bestFile} /></a>}
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
                <div
                  className="detail-poster"
                  style={{ backgroundImage: `url(${item.posterUrl})` }}
                  aria-label={`${item.title} poster`}
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
          item={item}
          isSeries={isSeries}
          seasons={seasons}
          movieFiles={movieFiles}
          suggestions={suggestions}
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

async function detailHeroVideo(item: VodItem) {
  const storedUrl = pickHeroVideoUrl(item.imdbVideos ?? []);
  if (storedUrl && !videoUrlExpired(storedUrl)) return storedUrl;

  if (!/^tt\d+$/.test(item.imdbCode)) return storedUrl;

  try {
    const response = await fetch(`http://185.203.118.87:8026/titles/${item.imdbCode}/fetch`, {
      method: "POST",
      body: "",
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return storedUrl;
    const data = (await response.json()) as { videos?: VodItem["imdbVideos"] };
    return pickHeroVideoUrl(data.videos ?? []) ?? storedUrl;
  } catch {
    return storedUrl;
  }
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

function similarTitles(item: VodItem, items: VodCard[]) {
  const genres = new Set((item.genres ?? []).map((genre) => genre.toLowerCase()));
  const countries = new Set((item.countries ?? []).map((country) => country.toLowerCase()));
  const type = normalizeVodType(item.type);

  return items
    .filter((candidate) => candidate.imdbCode !== item.imdbCode)
    .map((candidate) => {
      const sharedGenres = candidate.genres.filter((genre) => genres.has(genre.toLowerCase())).length;
      const sharedCountries = candidate.countries.filter((country) => countries.has(country.toLowerCase())).length;
      const typeBoost = candidate.type === type ? 10 : 0;
      const score =
        sharedGenres * 24 +
        sharedCountries * 6 +
        typeBoost +
        (candidate.imdbRating ?? 0) * 2 +
        Math.min(8, Math.log10((candidate.imdbVotes ?? 0) + 1));
      return { candidate, score };
    })
    .filter(({ score }) => score > 18)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18)
    .map(({ candidate }) => candidate);
}
