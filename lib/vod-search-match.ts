import type { VodCard } from "./types";
import { TypoSearchIndex } from "./typo-search";

const indexes = new WeakMap<VodCard[], TypoSearchIndex<VodCard>>();
export function matchVodSearch(items: VodCard[], query: string) {
  let index = indexes.get(items);
  if (!index) {
    index = new TypoSearchIndex(items.map(item => ({
      item,
      names: [item.title, item.persianTitle ?? ""],
      text: [item.title, item.persianTitle, item.imdbCode, ...item.genres, ...item.countries, ...item.languages,
        ...(item.persianGenres ?? []), ...(item.persianCountries ?? []), ...(item.persianLanguages ?? [])].filter(Boolean).join(" "),
    })));
    indexes.set(items, index);
  }
  return index.search(query);
}
