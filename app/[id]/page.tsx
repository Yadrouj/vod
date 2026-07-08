import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findVodItem, normalizeVodType } from "@/lib/catalog";
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
      <section className="detail-hero">
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
              <div className="chips" style={{ marginTop: 24 }}>
                {best && <a className="chip active" href={best.url}>Download best</a>}
                <a
                  className="chip"
                  href={item.imdbUrl ?? `https://www.imdb.com/title/${item.imdbCode}/`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View IMDb
                </a>
              </div>
            </div>

            <aside className="detail-card">
              <p className="label">IMDb Data</p>
              <div className="stats" style={{ marginTop: 16 }}>
                <Stat label="Rating" value={(item.imdbRating ?? 0).toFixed(1)} />
                <Stat label="Votes" value={(item.imdbVotes ?? 0).toLocaleString()} />
                <Stat label="Runtime" value={item.runtimeMinutes ? `${item.runtimeMinutes}m` : "-"} />
                <Stat label="Files" value={item.links.length.toLocaleString()} />
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
          <Info label="Qualities" value={item.qualities.join(", ") || "-"} />
          <Info label="Versions" value={item.groups.join(", ") || "-"} />
        </aside>

        <section>
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
                    <span className="muted">{link.release ?? "release"} / {link.size ?? "size unknown"}</span>
                  </span>
                  <strong style={{ color: "var(--gold)" }}>{link.quality ?? "File"}</strong>
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
