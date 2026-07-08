import Link from "next/link";
import { PosterCard } from "@/components/poster-card";
import { loadVodIndex, pickHero } from "@/lib/vod-index";
import type { VodHomeSection } from "@/lib/types";

export default async function HomePage() {
  const index = await loadVodIndex();
  const hero = pickHero(index);

  return (
    <main className="shell">
      <section
        className="hero home-hero"
        style={
          hero?.backdropUrl
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(5,5,5,0.98), rgba(5,5,5,0.62), rgba(5,5,5,0.32)), url(${hero.backdropUrl})`,
              }
            : undefined
        }
      >
        <div className="wrap hero-inner">
          <header className="topbar">
            <Link className="brand" href="/">VOD</Link>
            <nav className="nav-links" aria-label="Primary">
              <Link href="/browse?section=top-imdb">Top IMDb</Link>
              <Link href="/browse?section=recent-films">Films</Link>
              <Link href="/browse?section=best-series">Series</Link>
              <Link href="/browse?section=animation">Animation</Link>
            </nav>
            <Link className="pill" href="/browse">
              Browse {index.totalTitles.toLocaleString()}
            </Link>
          </header>

          <div className="hero-copy">
            <div className="meta">
              <span>{hero?.type ?? "vod"}</span>
              <i className="dot" />
              <span>{hero?.year ?? "IMDb matched"}</span>
              <i className="dot" />
              <span>{index.totalLinks.toLocaleString()} download links</span>
            </div>
            <h1>{hero?.title ?? "VOD Archive"}</h1>
            <p>
              {hero?.overview ??
                "A cinematic VOD catalog connected to DonyayeSerial links and enriched with IMDb posters, ratings, countries, genres, and release data."}
            </p>
            <form className="hero-search" action="/browse">
              <input name="q" placeholder="Search films, series, IMDb ID..." />
              <button type="submit">Search</button>
            </form>
            <div className="quick-tabs">
              <Link href="/browse?section=top-imdb">Top 250 IMDb</Link>
              <Link href="/browse?section=recent-films">Recent Film</Link>
              <Link href="/browse?section=best-movies">Best Movies</Link>
              <Link href="/browse?section=best-series">Best Series</Link>
              <Link href="/browse?section=kids">Kids</Link>
              <Link href="/browse?section=animation">Animation</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="home-stack wrap">
        {index.sections.map((section) => (
          <HomeRail key={section.id} section={section} />
        ))}
      </section>
    </main>
  );
}

function HomeRail({ section }: { section: VodHomeSection }) {
  return (
    <section className="section rail-section">
      <div className="section-head">
        <div>
          <h2>{section.title}</h2>
          <p className="muted">{section.subtitle}</p>
        </div>
        <Link className="view-all" href={`/browse?section=${section.id}`}>
          View all
        </Link>
      </div>
      <div className="poster-rail">
        {section.items.map((item) => (
          <PosterCard key={`${section.id}-${item.imdbCode}`} item={item} />
        ))}
      </div>
    </section>
  );
}
