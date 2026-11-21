import { cache } from "react";
import { loadVodIndex, selectVodSection } from "./vod-index";
import { TV_COLLECTIONS, selectTVCollection, tvCollectionLabel } from "./tv-collections";
import { loadImdbTrending, loadHeroArtwork } from "./imdb-trending";
import { localizedTitle } from "./title-display";
import { heroBackdropUrl } from "./hero-art";
import { contentRestriction } from "./content-restrictions.mjs";
import { titleSynopsis } from "./title-synopsis";
import { isAwaitingTitleLinks } from "./title-availability";
import { mirroredImageUrl, sizedImageUrl } from "./image-url";
import type { VodCard, VodItem } from "./types";
import type { Locale } from "./i18n";
import type { TVCard } from "./tv-types";

export function tvCard(item: VodCard | VodItem, locale: Locale): TVCard {
  return {
    id: item.imdbCode || item.id, title: localizedTitle(item, locale), original: item.title,
    poster: sizedImageUrl(item.posterUrl, 400), backdrop: mirroredImageUrl(heroBackdropUrl({ ...item, posterUrl: item.posterUrl ?? null, backdropUrl: item.backdropUrl ?? null })),
    year: item.year, rating: item.imdbRating, series: /series|tv/i.test(item.type),
    overview: (titleSynopsis(item, locale) || "").slice(0, 420),
    available: !contentRestriction(item) && ("linksCount" in item ? !isAwaitingTitleLinks(item) : item.links.length > 0),
  };
}

export const tvHome = cache(async (locale: Locale) => {
  const [index, trending, art] = await Promise.all([loadVodIndex(), loadImdbTrending(18), loadHeroArtwork()]);
  const valid = index.items.filter(item => !contentRestriction(item));
  const unique = (items: VodCard[]) => [...new Map(items.map(item => [item.imdbCode || item.id, item])).values()].filter(item => !contentRestriction(item)).slice(0, 16).map(item => tvCard({ ...item, ...(art[item.imdbCode] ? { heroArt: art[item.imdbCode] } : {}) }, locale));
  const hot = unique(trending.length ? trending : selectVodSection(valid, "recent-films"));
  const rows = [
    { id: "trending", title: locale === "fa" ? "در کانون توجه" : "In the spotlight", items: hot, total: hot.length, href: undefined as string | undefined },
    ...TV_COLLECTIONS.map(collection => {
      const selected = selectTVCollection(valid, collection.id);
      return { id: collection.id, title: tvCollectionLabel(collection, locale), items: unique(selected), total: selected.length, href: `/tv/collection/${collection.id}` };
    }),
  ].filter(row => row.items.length);
  // Prefer dimension-validated landscape art, never a tiny provider thumbnail.
  const proven = unique(valid.filter(item => Boolean(art[item.imdbCode]))).find(item => item.backdrop && item.available);
  const hero = hot.find(item => art[item.id] && item.available) ?? proven ?? rows.flatMap(row => row.items).find(item => item.backdrop && item.available) ?? hot[0];
  return { rows, hero };
});
