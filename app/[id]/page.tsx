import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadAction } from "@/components/download-action";
import { findVodItem, normalizeVodType } from "@/lib/catalog";
import { episodeLabel } from "@/lib/link-labels";
import { subzoneSearchUrl } from "@/lib/subtitles";
import type { VodItem, VodLink } from "@/lib/types";

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

  const groups = groupLinks(item.links);
  const best = item.links[0];

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

      <main className="movie-page wrap">
        <section className="movie-media-panel">
          <PanelHead title="Pictures & Clips" note={`${item.imdbImages?.length ?? 0} pictures / ${item.imdbVideos?.length ?? 0} clips`} />
          <MediaCarousel item={item} />
        </section>

        <aside className="movie-facts-panel">
          <PanelHead title="Data" note={item.imdbCode} />
          <div className="compact-facts">
            <Info label="Type" value={item.type} />
            <Info label="Year" value={String(item.year ?? "-")} />
            {item.endYear && <Info label="End" value={String(item.endYear)} />}
            {item.releaseDate && <Info label="Release" value={item.releaseDate} />}
            {item.certificate && <Info label="Cert" value={item.certificate} />}
            <Info label="Country" value={(item.countries ?? []).slice(0, 2).join(", ") || "-"} />
            <Info label="Language" value={(item.languages ?? []).slice(0, 2).join(", ") || "-"} />
            <Info label="Qualities" value={item.qualities.join(", ") || "-"} />
          </div>
          {(item.keywords?.length ?? 0) > 0 && (
            <div className="compact-keywords">
              {item.keywords?.slice(0, 10).map((keyword) => (
                <span key={keyword} className="chip">{keyword}</span>
              ))}
            </div>
          )}
        </aside>

        {(item.credits?.length ?? 0) > 0 && (
          <section className="movie-cast-panel">
            <PanelHead title="Cast & Crew" note={`${item.credits?.length} people`} />
            <CastRail item={item} />
          </section>
        )}

        <section className="movie-download-panel">
          <PanelHead title="DonyayeSerial Links" note={`${item.links.length} matched files`} />
          <div className="download-scroll">
            {groups.map(([group, links]) => (
              <div key={group} className="compact-link-group">
                <div className="link-head">
                  <strong>{group}</strong>
                  <span className="muted">{links.length} files</span>
                </div>
                {links.map((link, index) => (
                  <a key={`${link.url}-${index}`} className="file-link compact-file-link" href={link.url}>
                    <span>
                      <strong>{link.label}</strong>
                      <span className="muted">
                        {episodeLabel(link) ? `${episodeLabel(link)} / ` : ""}
                        {link.release ?? "release"} / {link.size ?? "size unknown"}
                      </span>
                    </span>
                    <DownloadAction label={link.quality ?? "File"} />
                  </a>
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function PanelHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="panel-head">
      <h2>{title}</h2>
      <span className="muted">{note}</span>
    </div>
  );
}

function MediaCarousel({ item }: { item: VodItem }) {
  const videos = item.imdbVideos?.slice(0, 8) ?? [];
  const images = item.imdbImages?.slice(0, 18) ?? [];
  const fallbackImage = images.length === 0 ? item.backdropUrl ?? item.posterUrl : null;

  return (
    <div className="media-carousel">
      {videos.map((video) => {
        const source = video.playback_urls?.[0]?.url;
        return (
          <article key={video.video_id ?? video.name} className="media-card clip-card">
            {source ? (
              <video src={source} poster={video.thumbnail_url ?? undefined} controls playsInline preload="metadata" />
            ) : (
              <div className="media-thumb" style={video.thumbnail_url ? { backgroundImage: `url(${video.thumbnail_url})` } : undefined} />
            )}
            <div className="media-card-foot">
              <strong>{video.name}</strong>
              {source && <a className="hover-button" href={source} target="_blank" rel="noreferrer">Open clip</a>}
            </div>
          </article>
        );
      })}

      {images.map((image) => (
        <a key={image.url} className="media-card image-card" href={image.url} target="_blank" rel="noreferrer">
          <img src={image.url} alt={image.caption ?? item.title} />
          <span>{image.caption ?? "Open picture"}</span>
        </a>
      ))}

      {fallbackImage && (
        <a className="media-card image-card" href={fallbackImage} target="_blank" rel="noreferrer">
          <img src={fallbackImage} alt={`${item.title} poster`} />
          <span>Open poster</span>
        </a>
      )}
    </div>
  );
}

function CastRail({ item }: { item: VodItem }) {
  return (
    <div className="cast-rail">
      {item.credits?.slice(0, 24).map((credit, index) => {
        const content = (
          <>
            {credit.name_image_url ? (
              <img src={credit.name_image_url} alt={credit.name_text} />
            ) : (
              <span className="cast-fallback">{credit.name_text.slice(0, 1)}</span>
            )}
            <strong>{credit.name_text}</strong>
            <span>{credit.category}</span>
          </>
        );

        return credit.name_id ? (
          <Link key={`${credit.name_id}-${index}`} className="cast-card" href={`/person/${credit.name_id}`}>
            {content}
          </Link>
        ) : (
          <div key={`${credit.name_text}-${index}`} className="cast-card">{content}</div>
        );
      })}
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-card">
      <p className="label">{label}</p>
      <p className="value">{value}</p>
    </div>
  );
}

function groupLinks(links: VodLink[]): [string, VodLink[]][] {
  const map = new Map<string, VodLink[]>();
  for (const link of links) {
    const group = link.group || "Files";
    map.set(group, [...(map.get(group) ?? []), link]);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}
