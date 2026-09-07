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

/** Reserve room for both types before truncating; never let one hide the other. */
export function selectRankedSuggestions<T extends RankedTitle>(matches: T[], limit: number, kind: SearchKind = "all"): T[] {
  const byId = new Map<string, T>();
  for (const item of [...matches].sort(compareImdbRank)) if (!byId.has(item.imdbCode)) byId.set(item.imdbCode, item);
  const unique = [...byId.values()];
  limit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 8;
  if (kind !== "all") return unique.filter((item) => searchTitleKind(item.type) === kind).slice(0, limit);
  const movies = unique.filter((item) => searchTitleKind(item.type) === "movie");
  const series = unique.filter((item) => searchTitleKind(item.type) === "series");
  const movieCount = Math.min(movies.length, Math.max(Math.ceil(limit / 2), limit - series.length));
  return [...movies.slice(0, movieCount), ...series.slice(0, limit - movieCount)];
}
