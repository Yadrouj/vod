import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadAction } from "@/components/download-action";
import { LanguageToggle } from "@/components/language-toggle";
import { TitleTabs } from "@/components/title-tabs";
import { findVodItem, normalizeVodType } from "@/lib/catalog";
import { buildSeasonSummaries, movieDownloadSources } from "@/lib/downloads";
import { formatNumber, getDictionary, typeLabel } from "@/lib/i18n";
import { getLocale } from "@/lib/server-locale";
import { subzoneSearchUrl } from "@/lib/subtitles";
import { loadVodIndex } from "@/lib/vod-index";
import type { VodCard, VodItem } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) return { title: "Title not found | VOD" };
  return {
    title: `${item.title} | VOD`,
    description: `${item.title} IMDb metadata and DonyayeSerial file links.`
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
  const heroVideo = detailHeroVideo(item);

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
          <header className="topbar">
            <div className="topbar-actions">
              <LanguageToggle locale={locale} />
              <Link className="chip" href="/">{t.common.backToVod}</Link>
            </div>
            <a
              className="pill"
              href={item.imdbUrl ?? `https://www.imdb.com/title/${item.imdbCode}/`}
              target="_blank"
              rel="noreferrer"
            >
              IMDb {(item.imdbRating ?? 0).toFixed(1)}
            </a>
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
                <span>{item.imdbCode}</span>
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
                <a
                  className="hover-button"
                  href={item.imdbUrl ?? `https://www.imdb.com/title/${item.imdbCode}/`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.common.viewImdb}
                </a>
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
                <Stat label={t.title.rating} value={(item.imdbRating ?? 0).toFixed(1)} />
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

function detailHeroVideo(item: VodItem) {
  const videos = item.imdbVideos ?? [];
  const preferred =
    videos.find((video) => /trailer|teaser|preview/i.test(video.name)) ??
    videos[0];

  return (
    preferred?.playback_urls?.find((playback) => playback.mime_type === "MP4")?.url ??
    preferred?.playback_urls?.find((playback) => /\.(mp4|m4v)(?:$|[?#])/i.test(playback.url))?.url ??
    preferred?.playback_urls?.[0]?.url ??
    null
  );
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
