import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadAction } from "@/components/download-action";
import { findVodItem, normalizeVodType } from "@/lib/catalog";
import { episodeLabel } from "@/lib/link-labels";
import { subzoneSearchUrl } from "@/lib/subtitles";
import type { VodLink } from "@/lib/types";

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
            <div>
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

      <main className="detail-main wrap">
        <aside className="side">
          <Info label="Title type" value={item.type} />
          <Info label="Start year" value={String(item.year ?? "-")} />
          {item.endYear && <Info label="End year" value={String(item.endYear)} />}
          {item.releaseDate && <Info label="Release date" value={item.releaseDate} />}
          {item.certificate && <Info label="Certificate" value={item.certificate} />}
          <Info label="Countries" value={(item.countries ?? []).join(", ") || "-"} />
          <Info label="Languages" value={(item.languages ?? []).join(", ") || "-"} />
          <Info label="Qualities" value={item.qualities.join(", ") || "-"} />
          <Info label="Versions" value={item.groups.join(", ") || "-"} />
        </aside>

        <section>
          {(item.imdbImages?.length ?? 0) > 0 && (
            <div className="image-strip">
              {item.imdbImages?.slice(0, 12).map((image) => (
                <img key={image.url} src={image.url} alt={image.caption ?? item.title} />
              ))}
            </div>
          )}

          {(item.keywords?.length ?? 0) > 0 && (
            <div className="chips" style={{ marginBottom: 24 }}>
              {item.keywords?.slice(0, 18).map((keyword) => (
                <span key={keyword} className="chip">{keyword}</span>
              ))}
            </div>
          )}

          {(item.credits?.length ?? 0) > 0 && (
            <div className="link-group">
              <div className="link-head">
                <strong>Credits</strong>
                <span className="muted">{item.credits?.length} people</span>
              </div>
              {item.credits?.slice(0, 12).map((credit, index) => (
                <div key={`${credit.name_id}-${index}`} className="file-link">
                  <span>
                    <strong>{credit.name_text}</strong>
                    <span className="muted">{credit.category}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {(item.imdbVideos?.length ?? 0) > 0 && (
            <div className="link-group">
              <div className="link-head">
                <strong>IMDb Videos</strong>
                <span className="muted">{item.imdbVideos?.length} videos</span>
              </div>
              {item.imdbVideos?.slice(0, 6).map((video) => (
                <a key={video.video_id ?? video.name} className="file-link" href={video.playback_urls?.[0]?.url ?? "#"}>
                  <span>
                    <strong>{video.name}</strong>
                    <span className="muted">{video.runtime_seconds ? `${video.runtime_seconds}s` : "video"}</span>
                  </span>
                  <strong style={{ color: "var(--gold)" }}>{video.playback_urls?.[0]?.quality ?? "Play"}</strong>
                </a>
              ))}
            </div>
          )}

          <div className="section-head">
            <div>
              <h2>DonyayeSerial Links</h2>
              <p className="muted">Matched by IMDb ID: {item.imdbCode}</p>
            </div>
          </div>
          {groups.map(([group, links]) => (
            <div key={group} className="link-group">
              <div className="link-head">
                <strong>{group}</strong>
                <span className="muted">{links.length} files</span>
              </div>
              {links.map((link, index) => (
                <a key={`${link.url}-${index}`} className="file-link" href={link.url}>
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
        </section>
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
