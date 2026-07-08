import Link from "next/link";
import { BannerCarousel } from "@/components/banner-carousel";
import { FocusRail } from "@/components/focus-rail";
import { GradientMenu } from "@/components/gradient-menu";
import { PosterCard } from "@/components/poster-card";
import { SearchSuggest } from "@/components/search-suggest";
import { loadVodIndex } from "@/lib/vod-index";
import type { VodCard, VodHomeSection } from "@/lib/types";

export default async function HomePage() {
  const index = await loadVodIndex();
  const heroBanners = uniqueCards([
    ...(index.sections.find((section) => section.id === "recent-films")?.items ?? []).slice(0, 5),
    ...(index.sections.find((section) => section.id === "best-movies")?.items ?? []).slice(0, 5),
    ...(index.sections.find((section) => section.id === "top-imdb")?.items ?? []).slice(0, 5),
  ]).slice(0, 10);
  const midBanners = uniqueCards([
    ...(index.sections.find((section) => section.id === "top-imdb")?.items ?? []).slice(5, 11),
    ...(index.sections.find((section) => section.id === "animation")?.items ?? []).slice(0, 4),
  ]).slice(0, 10);

  return (
    <main className="shell">
      <section className="hero home-hero">
        <GradientMenu totalTitles={index.totalTitles} />

        <BannerCarousel items={heroBanners} />

        <div className="hero-tools wrap">
          <form className="hero-search" action="/browse">
            <SearchSuggest />
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
      </section>

      <section className="home-stack wrap">
        {index.sections.map((section, index) => (
          <div key={section.id}>
            <HomeRail section={section} />
            {index === 0 && <FocusRail items={midBanners} />}
          </div>
        ))}
      </section>
    </main>
  );
}

function uniqueCards(items: VodCard[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.imdbCode)) return false;
    seen.add(item.imdbCode);
    return true;
  });
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
