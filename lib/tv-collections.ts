import type { VodCard } from './types';
import type { Locale } from './i18n';
import { matchesFacet } from './catalog-facets.mjs';
import { releaseKind } from './release-options';
import { isAwaitingTitleLinks } from './title-availability';
import { contentRestriction } from './content-restrictions.mjs';

type Collection = {
  id: string; fa: string; en: string; type?: 'movie' | 'series';
  country?: string; genre?: string; dubbed?: boolean; anime?: boolean; order?: 'rating' | 'updated';
};

export const TV_COLLECTIONS: readonly Collection[] = [
  { id: 'latest-series', fa: 'جدیدترین سریال‌ها', en: 'Latest series', type: 'series' },
  { id: 'latest-films', fa: 'جدیدترین فیلم‌ها', en: 'Latest films', type: 'movie' },
  { id: 'new-dubbed', fa: 'دوبله‌های تازهٔ آرشیو', en: 'Fresh Persian dubs', dubbed: true, order: 'updated' },
  { id: 'turkish-films', fa: 'فیلم‌های ترکی', en: 'Turkish cinema', country: 'Turkey', type: 'movie' },
  { id: 'turkish-series', fa: 'سریال‌های ترکی', en: 'Turkish series', country: 'Turkey', type: 'series' },
  { id: 'indian-films', fa: 'سینمای هند', en: 'Indian cinema', country: 'India', type: 'movie' },
  { id: 'iranian-films', fa: 'فیلم‌های ایرانی', en: 'Iranian cinema', country: 'Iran', type: 'movie' },
  { id: 'iranian-series', fa: 'سریال‌های ایرانی', en: 'Iranian series', country: 'Iran', type: 'series' },
  { id: 'korean-series', fa: 'سریال‌های کره‌ای', en: 'Korean series', country: 'South Korea', type: 'series' },
  { id: 'animation', fa: 'دنیای انیمیشن', en: 'Animation', genre: 'Animation' },
  { id: 'anime', fa: 'انیمه', en: 'Anime', anime: true },
  { id: 'documentaries', fa: 'مستندهای دیدنی', en: 'Documentaries', genre: 'Documentary' },
  { id: 'best-series', fa: 'سریال‌های پرامتیاز', en: 'Highly rated series', type: 'series', order: 'rating' },
  { id: 'best-films', fa: 'فیلم‌های پرامتیاز', en: 'Highly rated films', type: 'movie', order: 'rating' },
];

export function tvCollection(id: string) { return TV_COLLECTIONS.find(collection => collection.id === id); }
export function tvCollectionLabel(collection: Collection, locale: Locale) { return locale === 'fa' ? collection.fa : collection.en; }
const rating = (a: VodCard, b: VodCard) => (b.imdbRating ?? 0) - (a.imdbRating ?? 0) || (b.imdbVotes ?? 0) - (a.imdbVotes ?? 0);
const recent = (a: VodCard, b: VodCard) => (b.year ?? 0) - (a.year ?? 0) || rating(a, b);
function sourceTime(item: VodCard) {
  for (const stamp of [item.sourceUpdatedAt, item.catalogUpdatedAt]) {
    const value = Date.parse(stamp || '');
    if (Number.isFinite(value) && value <= Date.now() + 300000) return value;
  }
  return 0;
}
const country = (item: VodCard, value: string) => matchesFacet('country', [...item.countries, ...(item.persianCountries || [])], value);
const genre = (item: VodCard, value: string) => matchesFacet('genre', [...item.genres, ...(item.persianGenres || [])], value);

/** Full compact index, not a home-page sample. Never infer a country from dubbing or a name. */
export function selectTVCollection(items: VodCard[], id: string): VodCard[] {
  const collection = tvCollection(id);
  if (!collection) return [];
  const seen = new Set<string>();
  const selected = items.filter(item => {
    const key = item.imdbCode || item.id;
    if (seen.has(key) || contentRestriction(item)) return false;
    if (collection.type && item.type !== collection.type) return false;
    if (collection.country && !country(item, collection.country)) return false;
    if (collection.genre && !genre(item, collection.genre)) return false;
    if (collection.dubbed && (isAwaitingTitleLinks(item) || !item.groups.some(group => releaseKind(group) === 'dubbed'))) return false;
    if (collection.anime && !genre(item, 'Anime') && !(genre(item, 'Animation') && country(item, 'Japan'))) return false;
    seen.add(key); return true;
  });
  return selected.sort(collection.order === 'rating' ? rating : collection.order === 'updated' ? (a, b) => sourceTime(b) - sourceTime(a) || recent(a, b) : recent);
}

export function tvCollectionPage(items: VodCard[], id: string, requested = '1') {
  const selected = selectTVCollection(items, id), pageSize = 24;
  const totalPages = Math.max(1, Math.ceil(selected.length / pageSize));
  const number = /^\d{1,6}$/.test(requested) ? Number(requested) : 1;
  const page = Math.max(1, Math.min(totalPages, number));
  return { items: selected.slice((page - 1) * pageSize, page * pageSize), total: selected.length, page, totalPages };
}
