import { aiSearch } from "./ai-search";
import { normalizeSearchQuery, TtlLruCache } from "./runtime-cache";
import type { VodCard } from "./types";
import { loadVodIndex } from "./vod-index";
import { selectRankedSuggestions, type SearchKind } from "./vod-search-order";
import { matchVodSearch } from "./vod-search-match";
import type { SearchMatches } from "./typo-search";

type Suggestion = {
  title: string;
  imdbCode: string;
  year: number | null;
  type: string;
  posterUrl: string | null;
  imdbRating: number | null;
  updatedAt: string | null;
  isFresh: boolean;
};

export type AiSearchPayload = {
  item: Pick<VodCard, "title" | "imdbCode" | "backdropUrl" | "posterUrl">;
  score: number;
  reasons: string[];
};

type SuggestionResult = SearchMatches<Suggestion>;
const suggestionCache = new TtlLruCache<string, SuggestionResult>(1_500, 15 * 60_000);
const aiResultCache = new TtlLruCache<string, AiSearchPayload[]>(1_000, 30 * 60_000);
let suggestionItems: VodCard[] | null = null;

export async function searchSuggestions(query: string, limit = 8, kind: SearchKind = "all") {
  const normalized = normalizeSearchQuery(query);
  const index = await loadVodIndex();
  if (suggestionItems !== index.items) {
    suggestionItems = index.items;
    suggestionCache.clear(); aiResultCache.clear();
  }
  const cacheKey = `${normalized}:${limit}:${kind}`;
  const cached = suggestionCache.get(cacheKey);
  if (cached) return { ...cached, cache: "HIT" as const };
  const matches = matchVodSearch(index.items, query);

  const currentYear = new Date().getUTCFullYear();
  const items = selectRankedSuggestions(matches.items, limit, kind)
    .map((item) => ({
      title: item.title,
      imdbCode: item.imdbCode,
      year: item.year,
      type: item.type,
      posterUrl: item.posterUrl,
      imdbRating: item.imdbRating,
      updatedAt: item.catalogUpdatedAt ?? item.sourceUpdatedAt ?? null,
      isFresh: (item.year ?? 0) >= currentYear,
    }));

  const result = { ...matches, items };
  suggestionCache.set(cacheKey, result);
  return { ...result, cache: "MISS" as const };
}

export async function searchWithAi(query: string, limit = 10) {
  const normalized = normalizeSearchQuery(query);
  const cacheKey = `${normalized}:${limit}`;
  const cached = aiResultCache.get(cacheKey);
  if (cached) return { items: cached, cache: "HIT" as const };

  const index = await loadVodIndex();
  const items = aiSearch(index.items, normalized, limit).map(({ item, score, reasons }) => ({
    item: {
      title: item.title,
      imdbCode: item.imdbCode,
      backdropUrl: item.backdropUrl,
      posterUrl: item.posterUrl,
    },
    score,
    reasons,
  }));

  aiResultCache.set(cacheKey, items);
  return { items, cache: "MISS" as const };
}
