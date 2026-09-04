import type { Metadata } from "next";
import Link from "next/link";
import { AiSearchPanel } from "@/components/ai-search-panel";
import { FilmLandingHero } from "@/components/film-landing-hero";
import { FocusRail } from "@/components/focus-rail";
import { GradientMenu, type MegaMenuItem } from "@/components/gradient-menu";
import { LandingSeoContent } from "@/components/landing-seo-content";
import { NewsRail } from "@/components/news-rail";
import { MusicRail } from "@/components/music-rail";
import { DownloadHistory } from "@/components/download-history";
import { ContinueWatching } from "@/components/continue-watching";
import { PeopleRail } from "@/components/people-rail";
import { PosterRail } from "@/components/poster-rail";
import { ReleaseUpdatesRail } from "@/components/release-updates-rail";
import { StructuredData } from "@/components/structured-data";
import { WideRail as WideRailComponent } from "@/components/wide-rail";
import { PublicPartyRooms } from "@/components/public-party-rooms";
import { aiSearch } from "@/lib/ai-search";
import { getDictionary, type Locale } from "@/lib/i18n";
import { loadVodNews } from "@/lib/news";
import { loadReleaseUpdates, selectFreshReleaseUpdates, type ReleaseUpdate } from "@/lib/release-updates";
import { getLocale } from "@/lib/server-locale";
import { loadTopPeople } from "@/lib/top-people";
import { loadMusicHomeIndex } from "@/lib/music";
import { FILM_LANDING_SEO, landingJsonLd } from "@/lib/landing-seo";
import { titleMetadata } from "@/lib/seo";
import { loadVodHomeIndex } from "@/lib/vod-index";
import type { VodCard, VodHomeSection } from "@/lib/types";

type HomeRailSection = VodHomeSection & {
  href?: string;
};

const HOME_DATA_TTL_MS = 30_000;
type HomePageData = Awaited<ReturnType<typeof computeHomePageData>>;
const homePageDataCache = new Map<Locale, { expiresAt: number; promise: Promise<HomePageData> }>();

export const revalidate = 300;

export const metadata: Metadata = titleMetadata({
  title: FILM_LANDING_SEO.metaTitle,
  description: FILM_LANDING_SEO.description,
  pathname: "/",
  keywords: FILM_LANDING_SEO.keywords,
});

export default async function HomePage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const {
    index,
    news,
    updates,
    topPeople,
    music,
    heroBanners,
    midBanners,
    initialAiResults,
    landingRails,
    megaSections,
    megaFeaturedItems,
    wideItems,
  } = await buildHomePageData(locale);

  const aiPrompt = t.home.aiPrompt;
  // The first rails are intentional anchors, not part of the daily rotation:
  // a visitor sees releases, their own activity, then the core film and
  // series shelves. Everything after that can keep a fresh daily rhythm.
  const anchorRailIds = ["films-2026", "best-movies", "best-series", "latest-animation", "recent-trailers"];
  const primaryLandingRails = anchorRailIds
    .map((id) => landingRails.find((section) => section.id === id))
    .filter((section): section is HomeRailSection => Boolean(section));
  const remainingLandingRails = landingRails.filter((section) => !anchorRailIds.includes(section.id));

  return (
    <main className="shell film-spotify-page">
      <StructuredData data={landingJsonLd(FILM_LANDING_SEO, "/")} />
      <section className="film-landing-shell">
        <GradientMenu
          totalTitles={index.totalTitles}
          locale={locale}
          menuSections={megaSections}
          featuredItems={megaFeaturedItems}
        />
        <div className="wrap">
          <FilmLandingHero items={heroBanners} locale={locale} />
        </div>
      </section>

      <section className="home-stack wrap film-landing-content">
        <ReleaseUpdatesRail items={updates.items} locale={locale} />
        <ContinueWatching />
        <DownloadHistory />
        {primaryLandingRails.map((section) => (
          <HomeRail key={section.id} section={localizeSection(section, locale)} locale={locale} />
        ))}
        <FocusRail items={midBanners} locale={locale} />
        <WideRailComponent items={wideItems} locale={locale} />
        <MusicRail tracks={music.tracks} />
        <PublicPartyRooms mode="watch" locale={locale} />
        <AiSearchPanel locale={locale} initialQuery={aiPrompt} initialResults={initialAiResults} />
        {remainingLandingRails.map((section) => (
          <HomeRail key={section.id} section={localizeSection(section, locale)} locale={locale} />
        ))}
        <PeopleRail people={topPeople.people} locale={locale} />
        <LandingSeoContent content={FILM_LANDING_SEO} />
        <NewsRail items={news.items} locale={locale} />
      </section>
    </main>
  );
}

async function buildHomePageData(locale: Locale) {
  const now = Date.now();
  const cached = homePageDataCache.get(locale);
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = computeHomePageData(locale);
  homePageDataCache.set(locale, { expiresAt: now + HOME_DATA_TTL_MS, promise });
  try {
    return await promise;
  } catch (error) {
    if (homePageDataCache.get(locale)?.promise === promise) homePageDataCache.delete(locale);
    throw error;
  }
}

async function computeHomePageData(locale: Locale) {
  const [index, rawNews, topPeople, rawUpdates, music] = await Promise.all([
    loadVodHomeIndex(),
    loadVodNews(),
    loadTopPeople(),
    loadReleaseUpdates(),
    loadMusicHomeIndex(),
  ]);
  const news = { ...rawNews, items: prioritizeNews(rawNews.items) };
  const verifiedUpdates = selectFreshReleaseUpdates(rawUpdates.items);
  const updates = { ...rawUpdates, items: prioritizeReleaseUpdates(verifiedUpdates) };
  const t = getDictionary(locale);
  const seen = new Set<string>();
  const toyStoryFive = index.sections
    .find((section) => section.id === "latest-animation")
    ?.items.find((item) => item.title.trim().toLowerCase() === "toy story 5");
  const heroBanners = takeFreshVisual([
    ...(toyStoryFive ? [toyStoryFive] : []),
    ...(index.sections.find((section) => section.id === "recent-films")?.items ?? []).slice(0, 5),
    ...(index.sections.find((section) => section.id === "best-movies")?.items ?? []).slice(0, 5),
    ...(index.sections.find((section) => section.id === "top-imdb")?.items ?? []).slice(0, 5),
  ], seen, 10);
  const midBanners = takeFreshVisual([
    ...(index.sections.find((section) => section.id === "latest-animation")?.items ?? []).slice(0, 5),
    ...(index.sections.find((section) => section.id === "top-imdb")?.items ?? []).slice(5, 11),
    ...(index.sections.find((section) => section.id === "animation")?.items ?? []).slice(0, 4),
  ], seen, 10);
  const aiPrompt = t.home.aiPrompt;
  const initialAiResults = aiSearch(index.items, aiPrompt, 30)
    .filter(({ item }) => isLandingReady(item))
    .filter(({ item }) => !seen.has(item.imdbCode))
    .slice(0, 10)
    .map(({ item, score, reasons }) => {
      seen.add(item.imdbCode);
      return {
        item: {
          title: item.title,
          imdbCode: item.imdbCode,
          backdropUrl: item.backdropUrl,
          posterUrl: item.posterUrl,
        },
        score,
        reasons,
      };
    });
  const { sections: megaSections, featuredItems: megaFeaturedItems } = buildGenreMenu(
    index.items,
    index.sections.find((section) => section.id === "old-iranian-films"),
    locale,
  );
  const wideCandidates = index.items
    .filter((item) => item.backdropUrl && item.overview && (item.imdbRating ?? 0) >= 7.2 && isLandingReady(item))
    .sort((a, b) => (b.imdbRating ?? 0) - (a.imdbRating ?? 0) || (b.year ?? 0) - (a.year ?? 0));
  const wideItems = takeFreshCards(wideCandidates, seen, 10);
  const currentYear = new Date().getUTCFullYear();
  const generatedSections: HomeRailSection[] = [
    makeSection(
      "films-2026",
      locale === "fa" ? `فیلم‌های ${currentYear}` : `${currentYear} Movies`,
      locale === "fa" ? "فیلم‌های تازه و به‌روزشده در آرشیو سرونما" : "Fresh movies and recently updated files in the SarvNema archive.",
      uniqueCards(
        index.items
          .filter((item) => item.type === "movie" && item.year === currentYear && isLandingReady(item))
          .sort(yearSort),
      ).slice(0, 60),
      `/browse?year=${currentYear}&type=movie`,
    ),
    makeSection(
      "recent-trailers",
      t.home.sections["recent-trailers"].title,
      t.home.sections["recent-trailers"].subtitle,
      uniqueCards(
        index.items
          .filter((item) => item.backdropUrl && (item.year ?? 0) >= 2020 && isLandingReady(item))
          .sort(yearSort)
      ).slice(0, 60),
      "/browse?section=recent-films"
    ),
    makeSection(
      "latest-series",
      t.home.sections["latest-series"].title,
      t.home.sections["latest-series"].subtitle,
      uniqueCards(
        index.items
          .filter((item) => item.type === "series" && isLandingReady(item))
          .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.linksCount - a.linksCount)
      ).slice(0, 60),
      "/browse?type=series"
    ),
    makeSection(
      "ai-curated",
      t.home.sections["ai-curated"].title,
      t.home.sections["ai-curated"].subtitle,
      aiSearch(index.items, "dark luxury crime drama thriller above 8", 50)
        .map((result) => result.item)
        .filter(isLandingReady),
      "/browse?minScore=8&genre=Crime"
    ),
  ];

  const railPriority = ["films-2026", "best-movies", "best-series", "latest-animation", "recent-trailers", "latest-series"];
  const candidateRails = [...index.sections, ...generatedSections]
    .filter((section) => section.id !== "old-iranian-films");
  const priorityRails = railPriority
    .map((id) => candidateRails.find((section) => section.id === id))
    .filter((section): section is HomeRailSection => Boolean(section));
  const remainingRails = rotateDaily(candidateRails.filter((section) => !railPriority.includes(section.id)));
  const displayedTitles = new Set<string>();
  const landingRails = [...priorityRails, ...remainingRails]
    .map((section) => {
      const candidates = uniqueCards(section.items).filter(isLandingReady);
      const selected = candidates.filter((item) => !displayedTitles.has(item.imdbCode)).slice(0, 15);
      selected.forEach((item) => displayedTitles.add(item.imdbCode));
      return { ...section, items: selected };
    })
    .filter((section) => section.items.length > 0);

  return {
    index,
    news,
    updates,
    topPeople,
    music,
    heroBanners,
    midBanners,
    initialAiResults,
    landingRails,
    megaSections,
    megaFeaturedItems,
    wideItems,
  };
}

function takeFreshCards(items: VodCard[], seen: Set<string>, limit: number) {
  const fresh: VodCard[] = [];
  for (const item of uniqueCards(items)) {
    if (seen.has(item.imdbCode)) continue;
    seen.add(item.imdbCode);
    fresh.push(item);
    if (fresh.length >= limit) break;
  }
  return fresh;
}

function takeFreshVisual(items: VodCard[], seen: Set<string>, limit: number) {
  const images = new Set<string>();
  const fresh: VodCard[] = [];
  for (const item of uniqueCards(items)) {
    const image = item.backdropUrl ?? item.posterUrl;
    if (!isLandingReady(item) || !image || seen.has(item.imdbCode) || images.has(image)) continue;
    seen.add(item.imdbCode);
    images.add(image);
    fresh.push(item);
    if (fresh.length >= limit) break;
  }
  return fresh;
}

function rotateDaily<T>(items: T[]) {
  if (items.length < 2) return items;
  const day = Math.floor(Date.now() / 86_400_000);
  const offset = day % items.length;
  return items.slice(offset).concat(items.slice(0, offset));
}

function prioritizeNews<T extends { id: string; url: string; title: string; category: string; publishedAt: string }>(items: T[]) {
  const seen = new Set<string>();
  return [...items]
    .filter((item) => {
      const key = `${item.url}|${item.title}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const categoryRank = (category: string) => category === "release" ? 0 : category === "episodes" ? 1 : category === "imdb" ? 2 : 3;
      return categoryRank(a.category) - categoryRank(b.category) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    })
    .slice(0, 15);
}

function prioritizeReleaseUpdates(items: ReleaseUpdate[]) {
  return [...items]
    .sort((a, b) => {
      const statusRank = (status: ReleaseUpdate["status"]) => status === "coming-soon" ? 0 : 1;
      const kindRank = (kind: ReleaseUpdate["kind"]) => kind === "episode" ? 0 : kind === "series" ? 1 : 2;
      return statusRank(a.status) - statusRank(b.status) || Date.parse(b.eventAt) - Date.parse(a.eventAt) || kindRank(a.kind) - kindRank(b.kind);
    })
    .slice(0, 16);
}

function uniqueCards(items: VodCard[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.imdbCode)) return false;
    seen.add(item.imdbCode);
    return true;
  });
}

/**
 * A newly indexed show can legitimately have one episode, but it should not
 * dominate every discovery rail before the archive has a usable set of files.
 * The detail page and direct search still expose it immediately.
 */
function isLandingReady(item: VodCard) {
  return item.type !== "series" || item.linksCount >= 8;
}

function uniqueVisualCards(items: VodCard[]) {
  const seen = new Set<string>();
  return uniqueCards(items).filter((item) => {
    const image = item.backdropUrl ?? item.posterUrl;
    if (!image || seen.has(image)) return false;
    seen.add(image);
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

function buildGenreMenu(items: VodCard[], oldIranianSection: VodHomeSection | undefined, locale: Locale) {
  const counts = new Map<string, number>();
  const usedImages = new Set<string>();
  const usedIds = new Set<string>();
  for (const item of items) for (const genre of item.genres ?? []) counts.set(genre, (counts.get(genre) ?? 0) + 1);
  const genreSections = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 7)
    .map(([genre, total], genreIndex) => {
      const candidates = uniqueCards(items.filter((item) =>
        isLandingReady(item) && (item.genres ?? []).some((itemGenre) => itemGenre.toLowerCase() === genre.toLowerCase())
      ));
      const rotated = candidates.slice((genreIndex * 2) % Math.max(candidates.length, 1))
        .concat(candidates.slice(0, (genreIndex * 2) % Math.max(candidates.length, 1)));
      const artItem = rotated.find((item) => {
        const image = item.backdropUrl ?? item.posterUrl;
        if (!image || usedImages.has(image) || usedIds.has(item.imdbCode)) return false;
        usedImages.add(image);
        usedIds.add(item.imdbCode);
        return true;
      });
      const selected = rotated.filter((item) => item.imdbCode !== artItem?.imdbCode);
      return {
        id: `genre-${genre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        title: genre,
        href: `/browse?genre=${encodeURIComponent(genre)}`,
        items: (selected.length ? selected : candidates).slice(0, 10).map(toMegaMenuItem),
        artUrl: artItem?.backdropUrl ?? artItem?.posterUrl ?? null,
        total,
      };
    });
  const oldIranianItems = uniqueCards(oldIranianSection?.items ?? []).slice(0, 10);
  const oldIranianMenuSection = oldIranianItems.length
    ? [{
        id: "old-iranian-films",
        title: locale === "fa" ? "فیلم‌های قدیمی ایرانی" : "Old Iranian Films",
        href: "/browse?section=old-iranian-films",
        items: oldIranianItems.map(toMegaMenuItem),
        artUrl: oldIranianItems[0]?.backdropUrl ?? oldIranianItems[0]?.posterUrl ?? null,
        total: oldIranianSection?.total ?? oldIranianItems.length,
      }]
    : [];
  const sections = [...oldIranianMenuSection, ...genreSections];
  const featuredItems = uniqueVisualCards(
    [...items]
      .filter(isLandingReady)
      .sort((a, b) => (b.imdbRating ?? 0) - (a.imdbRating ?? 0) || (b.imdbVotes ?? 0) - (a.imdbVotes ?? 0))
  )
    .filter((item) => item.posterUrl && !usedImages.has(item.posterUrl))
    .slice(0, 8)
    .map(toMegaMenuItem);
  return { sections, featuredItems };
}

function toMegaMenuItem(item: VodCard): MegaMenuItem {
  return {
    imdbCode: item.imdbCode,
    title: item.title,
    year: item.year,
    posterUrl: item.posterUrl,
    backdropUrl: item.backdropUrl,
  };
}

function yearSort(a: VodCard, b: VodCard) {
  return (b.year ?? 0) - (a.year ?? 0) || (b.imdbRating ?? 0) - (a.imdbRating ?? 0);
}

function localizeSection(section: HomeRailSection, locale: Locale): HomeRailSection {
  const t = getDictionary(locale);
  const localized = t.home.sections[section.id as keyof typeof t.home.sections];
  if (locale === "fa" && section.id === "latest-animation") {
    return {
      ...section,
      title: "انیمیشن‌های تازه",
      subtitle: "انیمیشن‌های جدید و مجموعه‌های کامل‌تر از آرشیو.",
    };
  }
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
      <PosterRail items={section.items} locale={locale} href={section.href ?? `/browse?section=${section.id}`} />
    </section>
  );
}
