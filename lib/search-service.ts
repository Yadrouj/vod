import { aiSearch } from "./ai-search";
import { normalizeSearchQuery, TtlLruCache } from "./runtime-cache";
import type { VodCard } from "./types";
import { loadVodIndex } from "./vod-index";
import { selectRankedSuggestions, type SearchKind } from "./vod-search-order";

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

type SearchDocument = {
  item: VodCard;
  title: string;
  imdbCode: string;
  haystack: string;
};

const suggestionCache = new TtlLruCache<string, Suggestion[]>(1_500, 15 * 60_000);
const aiResultCache = new TtlLruCache<string, AiSearchPayload[]>(1_000, 30 * 60_000);
let documentsPromise: Promise<SearchDocument[]> | null = null;
let documentsVersion = "";

export async function searchSuggestions(query: string, limit = 8, kind: SearchKind = "all") {
  const normalized = normalizeSearchQuery(query);
  const documents = await loadSearchDocuments();
  const cacheKey = `${normalized}:${limit}:${kind}`;
  const cached = suggestionCache.get(cacheKey);
  if (cached) return { items: cached, cache: "HIT" as const };

  const matches: Array<{ item: VodCard; matchRank: number }> = [];

  for (const document of documents) {
    if (document.title.startsWith(normalized) || document.imdbCode.startsWith(normalized)) {
      matches.push({ item: document.item, matchRank: 0 });
    } else if (document.haystack.includes(normalized)) {
      matches.push({ item: document.item, matchRank: 1 });
    }
  }

  const currentYear = new Date().getUTCFullYear();
  const items = selectRankedSuggestions(matches.map(({ item }) => item), limit, kind)
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

  suggestionCache.set(cacheKey, items);
  return { items, cache: "MISS" as const };
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

async function loadSearchDocuments() {
  const index = await loadVodIndex();
  if (!documentsPromise || documentsVersion !== index.generatedAt) {
    documentsVersion = index.generatedAt;
    suggestionCache.clear();
    aiResultCache.clear();
    documentsPromise = Promise.resolve(
      index.items.map((item) => {
      const title = normalizeSearchQuery(item.title);
      const imdbCode = normalizeSearchQuery(item.imdbCode);
      return {
        item,
        title,
        imdbCode,
        haystack: normalizeSearchQuery(
          [
            item.title,
            item.persianTitle,
            item.imdbCode,
            ...item.genres,
            ...item.countries,
            ...item.languages,
            ...(item.persianGenres ?? []),
            ...(item.persianCountries ?? []),
            ...(item.persianLanguages ?? []),
          ].filter(Boolean).join(" "),
        ),
      };
      }),
    );
  }
  return documentsPromise;
}
