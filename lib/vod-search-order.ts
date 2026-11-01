import { searchText } from "./typo-search";

export type SearchKind = "all" | "movie" | "series";
type RankedTitle = { imdbCode: string; type: string; imdbRating: number | null; imdbVotes?: number | null; year: number | null; title?: string; persianTitle?: string | null };

export function searchTitleKind(type: string): "movie" | "series" {
  return /series|episode|show|tvmini/i.test(type) ? "series" : "movie";
}

/** Relevance first; equally close titles use release year, then IMDb score. */
export function compareSearchRank(query: string) {
  const key = searchText(query);
  const scores = new Map<RankedTitle, number>();
  const relevance = (item: RankedTitle) => {
    const cached = scores.get(item); if (cached !== undefined) return cached;
    let score = searchText(item.imdbCode) === key ? -1 : 5;
    for (const title of [item.title, item.persianTitle]) {
      if (!title) continue;
      const name = searchText(title);
      if (name === key) score = Math.min(score, 0);
      else if (name.startsWith(`${key} `)) score = Math.min(score, 1);
      else if (` ${name} `.includes(` ${key} `)) score = Math.min(score, 2);
      else if (name.startsWith(key)) score = Math.min(score, 3);
      else if (name.includes(key)) score = Math.min(score, 4);
    }
    scores.set(item, score); return score;
  };
  return <T extends RankedTitle>(a: T, b: T) => relevance(a) - relevance(b)
    || (b.year ?? 0) - (a.year ?? 0) || compareImdbRank(a,b);
}

export function compareImdbRank(a: RankedTitle, b: RankedTitle) {
  const rating = (value: number | null) => Number.isFinite(value) && value !== null && value > 0 && value <= 10 ? value : -1;
  return rating(b.imdbRating) - rating(a.imdbRating)
    || (b.imdbVotes ?? 0) - (a.imdbVotes ?? 0)
    || (b.year ?? 0) - (a.year ?? 0)
    || a.imdbCode.localeCompare(b.imdbCode);
}

/** Rank the complete matching pool before truncating; type filtering is opt-in. */
export function selectRankedSuggestions<T extends RankedTitle>(matches: T[], limit: number, kind: SearchKind = "all", query = ""): T[] {
  const byId = new Map<string, T>();
  const compare = query ? compareSearchRank(query) : compareImdbRank;
  for (const item of [...matches].sort(compare)) if (!byId.has(item.imdbCode)) byId.set(item.imdbCode, item);
  const unique = [...byId.values()];
  limit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 8;
  return unique.filter((item) => kind === "all" || searchTitleKind(item.type) === kind).slice(0, limit);
}
