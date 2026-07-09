import Link from "next/link";
import { AiSearchPanel } from "@/components/ai-search-panel";
import { BannerCarousel } from "@/components/banner-carousel";
import { FocusRail } from "@/components/focus-rail";
import { GradientMenu } from "@/components/gradient-menu";
import { PosterCard } from "@/components/poster-card";
import { SearchSuggest } from "@/components/search-suggest";
import { aiSearch } from "@/lib/ai-search";
import { loadVodIndex } from "@/lib/vod-index";
import type { VodCard, VodHomeSection } from "@/lib/types";

type HomeRailSection = VodHomeSection & {
  href?: string;
};

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
  const aiPrompt = "dark crime series above IMDb 8";
  const initialAiResults = aiSearch(index.items, aiPrompt, 10);
  const extraSections: HomeRailSection[] = [
    makeSection(
      "recent-trailers",
      "Recent Trailers",
      "Newer titles with cinematic artwork and trailer-ready pages.",
      uniqueCards(
        index.items
          .filter((item) => item.backdropUrl && (item.year ?? 0) >= 2020)
          .sort(yearSort)
      ).slice(0, 15),
      "/browse?section=recent-films"
    ),
    makeSection(
      "latest-series",
      "Recent Episodes",
      "Series with the latest seasons and the most episode files.",
      uniqueCards(
        index.items
          .filter((item) => item.type === "series")
          .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.linksCount - a.linksCount)
      ).slice(0, 15),
      "/browse?type=series"
    ),
    makeSection(
      "ai-curated",
      "AI Curated",
      "Dark, quiet, high-score cinema selected by the local matcher.",
      aiSearch(index.items, "dark luxury crime drama thriller above 8", 15).map((result) => result.item),
      "/browse?minScore=8&genre=Crime"
    ),
  ];

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
        <HomeRail section={index.sections[0]} />
        <FocusRail items={midBanners} />
        <AiSearchPanel initialQuery={aiPrompt} initialResults={initialAiResults} />
        {extraSections.map((section) => (
          <HomeRail key={section.id} section={section} />
        ))}
        {index.sections.slice(1).map((section) => (
          <HomeRail key={section.id} section={section} />
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

function makeSection(id: string, title: string, subtitle: string, items: VodCard[], href: string): HomeRailSection {
  return {
    id,
    title,
    subtitle,
    total: items.length,
    items,
    href,
  };
}

function yearSort(a: VodCard, b: VodCard) {
  return (b.year ?? 0) - (a.year ?? 0) || (b.imdbRating ?? 0) - (a.imdbRating ?? 0);
}

function HomeRail({ section }: { section: HomeRailSection }) {
  return (
    <section className="section rail-section">
      <div className="section-head">
        <div>
          <h2>{section.title}</h2>
          <p className="muted">{section.subtitle}</p>
        </div>
        <Link className="view-all" href={section.href ?? `/browse?section=${section.id}`}>
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
