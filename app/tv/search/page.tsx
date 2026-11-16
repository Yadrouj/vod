import { getLocale } from "@/lib/server-locale";
import { loadVodIndex } from "@/lib/vod-index";
import { TVSearch } from "@/components/tv/tv-search";
import { facetOptions } from "@/lib/catalog-facets.mjs";

export default async function TVSearchPage() {
  const [locale, index] = await Promise.all([getLocale(), loadVodIndex()]);
  const genres = [...new Set(index.items.flatMap(item => item.genres))].filter(value => /^[a-zA-Z -]+$/.test(value)).sort();
  const years = [...new Set(index.items.map(item => item.year).filter((year): year is number => year != null && year > 1887 && year <= new Date().getFullYear() + 3))].sort((a, b) => b - a);
  return <TVSearch locale={locale} genres={facetOptions('genre', genres, locale)} years={years} />;
}
