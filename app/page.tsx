import Link from "next/link";
import { AiSearchPanel } from "@/components/ai-search-panel";
import { BannerCarousel } from "@/components/banner-carousel";
import { FocusRail } from "@/components/focus-rail";
import { GradientMenu } from "@/components/gradient-menu";
import { HomeLoadingOverlay } from "@/components/home-loading-overlay";
import { NewsRail } from "@/components/news-rail";
import { PeopleRail } from "@/components/people-rail";
import { PosterCard } from "@/components/poster-card";
import { SearchSuggest } from "@/components/search-suggest";
import { aiSearch } from "@/lib/ai-search";
import { getDictionary, type Locale } from "@/lib/i18n";
import { loadVodNews } from "@/lib/news";
import { getLocale } from "@/lib/server-locale";
import { loadTopPeople } from "@/lib/top-people";
import { loadVodHomeIndex } from "@/lib/vod-index";
import type { VodCard, VodHomeSection } from "@/lib/types";

type HomeRailSection = VodHomeSection & {
  href?: string;
};

export default async function HomePage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const index = await loadVodHomeIndex();
  const news = await loadVodNews();
  const topPeople = await loadTopPeople();
  const heroBanners = uniqueCards([
    ...(index.sections.find((section) => section.id === "recent-films")?.items ?? []).slice(0, 5),
    ...(index.sections.find((section) => section.id === "best-movies")?.items ?? []).slice(0, 5),
    ...(index.sections.find((section) => section.id === "top-imdb")?.items ?? []).slice(0, 5),
  ]).slice(0, 10);
  const midBanners = uniqueCards([
    ...(index.sections.find((section) => section.id === "top-imdb")?.items ?? []).slice(5, 11),
    ...(index.sections.find((section) => section.id === "animation")?.items ?? []).slice(0, 4),
  ]).slice(0, 10);
  const aiPrompt = t.home.aiPrompt;
  const initialAiResults = aiSearch(index.items, aiPrompt, 10);
  const persianSection = index.sections.find((section) => section.id === "persian-movies");
  const megaSections = [
    menuSection(index.sections.find((section) => section.id === "persian-movies"), locale, "/browse?section=persian-movies"),
    menuSection(index.sections.find((section) => section.id === "top-imdb"), locale, "/browse?section=top-imdb"),
    menuSection(index.sections.find((section) => section.id === "recent-films"), locale, "/browse?section=recent-films"),
    menuSection(index.sections.find((section) => section.id === "best-series"), locale, "/browse?section=best-series"),
    menuSection(index.sections.find((section) => section.id === "kids"), locale, "/browse?section=kids"),
    menuSection(index.sections.find((section) => section.id === "animation"), locale, "/browse?section=animation"),
  ].filter((section): section is NonNullable<typeof section> => Boolean(section));
  const wideItems = uniqueCards(
    index.items
      .filter((item) => item.backdropUrl && item.overview && (item.imdbRating ?? 0) >= 7.2)
      .sort((a, b) => (b.imdbRating ?? 0) - (a.imdbRating ?? 0) || (b.year ?? 0) - (a.year ?? 0))
  ).slice(0, 10);
  const extraSections: HomeRailSection[] = [
    makeSection(
      "recent-trailers",
      t.home.sections["recent-trailers"].title,
      t.home.sections["recent-trailers"].subtitle,
      uniqueCards(
        index.items
          .filter((item) => item.backdropUrl && (item.year ?? 0) >= 2020)
          .sort(yearSort)
      ).slice(0, 15),
      "/browse?section=recent-films"
    ),
    makeSection(
      "latest-series",
      t.home.sections["latest-series"].title,
      t.home.sections["latest-series"].subtitle,
      uniqueCards(
        index.items
          .filter((item) => item.type === "series")
          .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.linksCount - a.linksCount)
      ).slice(0, 15),
      "/browse?type=series"
    ),
    makeSection(
      "ai-curated",
      t.home.sections["ai-curated"].title,
      t.home.sections["ai-curated"].subtitle,
      aiSearch(index.items, "dark luxury crime drama thriller above 8", 15).map((result) => result.item),
      "/browse?minScore=8&genre=Crime"
    ),
  ];

  return (
    <main className="shell">
      <HomeLoadingOverlay label={t.common.loading} />
      <section className="hero home-hero">
        <GradientMenu totalTitles={index.totalTitles} locale={locale} menuSections={megaSections} />

        <BannerCarousel items={heroBanners} locale={locale} />

        <div className="hero-tools wrap">
          <form className="hero-search" action="/browse">
            <SearchSuggest placeholder={t.home.searchPlaceholder} locale={locale} />
            <button type="submit">{t.common.search}</button>
          </form>
          <div className="quick-tabs">
            {quickLinks(locale).map((item) => (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-stack wrap">
        <HomeRail section={localizeSection(index.sections[0], locale)} locale={locale} />
        {persianSection && <HomeRail section={localizeSection(persianSection, locale)} locale={locale} />}
        <FocusRail items={midBanners} locale={locale} />
        <WideRail items={wideItems} locale={locale} />
        <AiSearchPanel locale={locale} initialQuery={aiPrompt} initialResults={initialAiResults} />
        {extraSections.map((section) => (
          <HomeRail key={section.id} section={section} locale={locale} />
        ))}
        <PeopleRail people={topPeople.people} locale={locale} />
        <NewsRail items={news.items} locale={locale} />
        {index.sections.filter((section) => section.id !== "top-imdb" && section.id !== "persian-movies").map((section) => (
          <HomeRail key={section.id} section={localizeSection(section, locale)} locale={locale} />
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

function menuSection(section: VodHomeSection | undefined, locale: Locale, href: string) {
  if (!section) return null;
  const localized = localizeSection(section, locale);
  return {
    id: localized.id,
    title: localized.title,
    href,
    items: localized.items,
  };
}

function yearSort(a: VodCard, b: VodCard) {
  return (b.year ?? 0) - (a.year ?? 0) || (b.imdbRating ?? 0) - (a.imdbRating ?? 0);
}

function quickLinks(locale: Locale) {
  const t = getDictionary(locale);
  return [
    { href: "/browse?section=top-imdb", label: t.common.topImdb },
    { href: "/browse?section=persian-movies", label: t.common.persianMovies },
    { href: "/browse?section=recent-films", label: t.common.recentFilm },
    { href: "/browse?section=best-movies", label: t.common.bestMovies },
    { href: "/browse?section=best-series", label: t.common.bestSeries },
    { href: "/browse?section=kids", label: t.common.kids },
    { href: "/browse?section=animation", label: t.common.animation },
  ];
}

function localizeSection(section: HomeRailSection, locale: Locale): HomeRailSection {
  const t = getDictionary(locale);
  const localized = t.home.sections[section.id as keyof typeof t.home.sections];
  if (!localized) return section;
  return { ...section, title: localized.title, subtitle: localized.subtitle };
}

function HomeRail({ section, locale }: { section: HomeRailSection; locale: Locale }) {
  const t = getDictionary(locale);

  return (
    <section className="section rail-section">
      <div className="section-head">
        <div>
          <h2>{section.title}</h2>
          <p className="muted">{section.subtitle}</p>
        </div>
        <Link className="view-all" href={section.href ?? `/browse?section=${section.id}`}>
          {t.common.viewAll}
        </Link>
      </div>
      <div className="poster-rail">
        {section.items.slice(0, 12).map((item) => (
          <PosterCard key={`${section.id}-${item.imdbCode}`} item={item} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function WideRail({ items, locale }: { items: VodCard[]; locale: Locale }) {
  if (!items.length) return null;
  const t = getDictionary(locale);

  return (
    <section className="section wide-rail-section">
      <div className="section-head">
        <div>
          <h2>{t.home.wideTitle}</h2>
          <p className="muted">{t.home.wideSubtitle}</p>
        </div>
        <Link className="view-all" href="/browse?minScore=7">
          {t.common.viewAll}
        </Link>
      </div>
      <div className="wide-rail">
        {items.map((item, index) => (
          <Link
            key={`wide-${item.imdbCode}`}
            className={`wide-card wide-card-${index % 3}`}
            href={`/${item.imdbCode}`}
            style={item.backdropUrl ? { backgroundImage: `url(${item.backdropUrl})` } : undefined}
          >
            <span className="rating">{item.imdbRating ? `IMDb ${item.imdbRating.toFixed(1)}` : item.year ?? t.common.movie}</span>
            <span className="wide-copy">
              <strong>{item.title}</strong>
              <small>{[item.year, item.genres.slice(0, 2).join(" / ")].filter(Boolean).join(" / ")}</small>
              <em>{t.home.wideAction}</em>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
