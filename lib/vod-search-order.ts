export type SearchKind = "all" | "movie" | "series";
type RankedTitle = { imdbCode: string; type: string; imdbRating: number | null; imdbVotes?: number | null; year: number | null };

export function searchTitleKind(type: string): "movie" | "series" {
  return /series|episode|show|tvmini/i.test(type) ? "series" : "movie";
}

export function compareImdbRank(a: RankedTitle, b: RankedTitle) {
  const rating = (value: number | null) => Number.isFinite(value) && value !== null && value > 0 && value <= 10 ? value : -1;
  return rating(b.imdbRating) - rating(a.imdbRating)
    || (b.imdbVotes ?? 0) - (a.imdbVotes ?? 0)
    || (b.year ?? 0) - (a.year ?? 0)
    || a.imdbCode.localeCompare(b.imdbCode);
}

/** Rank the complete matching pool before truncating; type filtering is opt-in. */
export function selectRankedSuggestions<T extends RankedTitle>(matches: T[], limit: number, kind: SearchKind = "all"): T[] {
  const byId = new Map<string, T>();
  for (const item of [...matches].sort(compareImdbRank)) if (!byId.has(item.imdbCode)) byId.set(item.imdbCode, item);
  const unique = [...byId.values()];
  limit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 8;
  return unique.filter((item) => kind === "all" || searchTitleKind(item.type) === kind).slice(0, limit);
}
