import { aiSearch } from "./ai-search";
import { normalizeSearchQuery, TtlLruCache } from "./runtime-cache";
import type { VodCard } from "./types";
import { loadVodIndex } from "./vod-index";

type Suggestion = {
  title: string;
  imdbCode: string;
  year: number | null;
  type: string;
  posterUrl: string | null;
  imdbRating: number | null;
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

export async function searchSuggestions(query: string, limit = 8) {
  const normalized = normalizeSearchQuery(query);
  const cacheKey = `${normalized}:${limit}`;
  const cached = suggestionCache.get(cacheKey);
  if (cached) return { items: cached, cache: "HIT" as const };

  const documents = await loadSearchDocuments();
  const startsWith: VodCard[] = [];
  const contains: VodCard[] = [];

  for (const document of documents) {
    if (document.title.startsWith(normalized) || document.imdbCode.startsWith(normalized)) {
      startsWith.push(document.item);
    } else if (document.haystack.includes(normalized)) {
      contains.push(document.item);
    }
  }

  const items = [...startsWith, ...contains]
    .sort((a, b) => (b.imdbRating ?? 0) - (a.imdbRating ?? 0) || (b.imdbVotes ?? 0) - (a.imdbVotes ?? 0))
    .slice(0, limit)
    .map((item) => ({
      title: item.title,
      imdbCode: item.imdbCode,
      year: item.year,
      type: item.type,
      posterUrl: item.posterUrl,
      imdbRating: item.imdbRating,
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
  documentsPromise ??= loadVodIndex().then((index) =>
    index.items.map((item) => {
      const title = normalizeSearchQuery(item.title);
      const imdbCode = normalizeSearchQuery(item.imdbCode);
      return {
        item,
        title,
        imdbCode,
        haystack: normalizeSearchQuery(
          [item.title, item.imdbCode, ...item.genres, ...item.countries, ...item.languages].join(" "),
        ),
      };
    }),
  );
  return documentsPromise;
}
