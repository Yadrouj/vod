import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadAction } from "@/components/download-action";
import { TitleTabs } from "@/components/title-tabs";
import { findVodItem, normalizeVodType } from "@/lib/catalog";
import { buildSeasonSummaries, movieDownloadSources } from "@/lib/downloads";
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
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) notFound();

  const best = item.links[0];
  const seasons = buildSeasonSummaries(item.links);
  const isSeries = normalizeVodType(item.type) === "series" && seasons.length > 0;
  const movieFiles = isSeries ? [] : movieDownloadSources(item.links);
  const index = await loadVodIndex();
  const suggestions = similarTitles(item, index.items);

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
        <div className="wrap">
          <header className="topbar">
            <Link className="chip" href="/">Back to VOD</Link>
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
                <span>{normalizeVodType(item.type)}</span>
                <i className="dot" />
                <span>{item.year ?? "-"}</span>
                <i className="dot" />
            <span>{item.runtimeMinutes ? `${item.runtimeMinutes}m` : `${item.links.length} files`}</span>
                <i className="dot" />
                <span>{item.imdbCode}</span>
              </div>
              <h1>{item.title}</h1>
              {item.originalTitle && item.originalTitle !== item.title && (
                <p className="muted">Original title: {item.originalTitle}</p>
              )}
              {item.overview && <p>{item.overview}</p>}
              <div className="chips" style={{ marginTop: 24 }}>
                <Link className="play-glow" href={`/watch/${item.imdbCode}`}>
                  <span className="play-dot" /> Play online
                </Link>
                {best && <a className="hover-button" href={best.url}><DownloadAction label="Best file" /></a>}
                <a
                  className="hover-button"
                  href={subzoneSearchUrl(item.title, item.year)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Subzone subtitles
                </a>
                <a
                  className="hover-button"
                  href={item.imdbUrl ?? `https://www.imdb.com/title/${item.imdbCode}/`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View IMDb
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
              <p className="label">IMDb Data</p>
              <div className="stats" style={{ marginTop: 16 }}>
                <Stat label="Rating" value={(item.imdbRating ?? 0).toFixed(1)} />
                <Stat label="Votes" value={(item.imdbVotes ?? 0).toLocaleString()} />
                <Stat label="Runtime" value={item.runtimeMinutes ? `${item.runtimeMinutes}m` : "-"} />
                <Stat label="Metascore" value={item.metascore ? String(item.metascore) : "-"} />
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
          subtitlesUrl={subzoneSearchUrl(item.title, item.year)}
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
