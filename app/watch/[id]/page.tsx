import Link from "next/link";
import { notFound } from "next/navigation";
import { VodPlayer } from "@/components/vod-player";
import { findVodItem } from "@/lib/catalog";
import { playableLinks } from "@/lib/link-labels";
import { subzoneSearchUrl } from "@/lib/subtitles";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function WatchPage({ params }: Props) {
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) notFound();

  const links = playableLinks(item.links);

  return (
    <main className="shell">
      <section className="browse-hero">
        <div className="wrap">
          <header className="topbar">
            <Link className="brand" href="/">VOD</Link>
            <div className="chips">
              <Link className="chip" href={`/${item.imdbCode}`}>Details</Link>
              <a className="pill" href={subzoneSearchUrl(item.title, item.year)} target="_blank" rel="noreferrer">
                Subzone subtitles
              </a>
            </div>
          </header>
          <div className="browse-title">
            <div className="meta">
              <span>{item.year ?? "-"}</span>
              <i className="dot" />
              <span>IMDb {(item.imdbRating ?? 0).toFixed(1)}</span>
              <i className="dot" />
              <span>{links.length} sources</span>
            </div>
            <h1>{item.title}</h1>
          </div>
        </div>
      </section>

      <section className="section wrap">
        <VodPlayer title={item.title} posterUrl={item.backdropUrl ?? item.posterUrl} links={links} />
      </section>
    </main>
  );
}
