import { cache } from "react";
import { loadVodHomeIndex, selectVodSection } from "./vod-index";
import { loadImdbTrending, loadHeroArtwork } from "./imdb-trending";
import { localizedTitle } from "./title-display";
import { heroBackdropUrl } from "./hero-art";
import { contentRestriction } from "./content-restrictions.mjs";
import { titleSynopsis } from "./title-synopsis";
import { isAwaitingTitleLinks } from "./title-availability";
import { sizedImageUrl } from "./image-url";
import type { VodCard, VodItem } from "./types";
import type { Locale } from "./i18n";
import type { TVCard } from "./tv-types";

export function tvCard(item: VodCard | VodItem, locale: Locale): TVCard {
  return {
    id: item.imdbCode || item.id, title: localizedTitle(item, locale), original: item.title,
    poster: sizedImageUrl(item.posterUrl, 400), backdrop: heroBackdropUrl({ ...item, posterUrl: item.posterUrl ?? null, backdropUrl: item.backdropUrl ?? null }),
    year: item.year, rating: item.imdbRating, series: /series|tv/i.test(item.type),
    overview: (titleSynopsis(item, locale) || "").slice(0, 420),
    available: !contentRestriction(item) && ("linksCount" in item ? !isAwaitingTitleLinks(item) : item.links.length > 0),
  };
}

export const tvHome = cache(async (locale: Locale) => {
  const [index, trending, art] = await Promise.all([loadVodHomeIndex(), loadImdbTrending(18), loadHeroArtwork()]);
  const valid = index.items.filter(item => !contentRestriction(item));
  const unique = (items: VodCard[]) => [...new Map(items.map(item => [item.imdbCode, item])).values()].filter(item => !contentRestriction(item)).slice(0, 18).map(item => tvCard({ ...item, ...(art[item.imdbCode] ? { heroArt: art[item.imdbCode] } : {}) }, locale));
  const hot = unique(trending.length ? trending : selectVodSection(valid, "recent-films"));
  const rows = [
    { id: "trending", title: locale === "fa" ? "در کانون توجه" : "In the spotlight", items: hot },
    { id: "series", title: locale === "fa" ? "سریال‌های تماشایی" : "Series worth your time", items: unique(selectVodSection(valid, "best-series")) },
    { id: "films", title: locale === "fa" ? "امتیازهای درخشان IMDb" : "Highly rated on IMDb", items: unique(selectVodSection(valid, "top-imdb")) },
    { id: "animation", title: locale === "fa" ? "دنیای انیمیشن" : "Animation", items: unique(selectVodSection(valid, "animation")) },
  ].filter(row => row.items.length);
  // Prefer dimension-validated landscape art, never a tiny provider thumbnail.
  const proven = unique(valid.filter(item => Boolean(art[item.imdbCode]))).find(item => item.backdrop && item.available);
  const hero = hot.find(item => art[item.id] && item.available) ?? proven ?? rows.flatMap(row => row.items).find(item => item.backdrop && item.available) ?? hot[0];
  return { rows, hero };
});
