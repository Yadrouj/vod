import { searchText } from "./typo-search";

export type SearchKind = "all" | "movie" | "series";
type RankedTitle = { imdbCode: string; type: string; imdbRating: number | null; imdbVotes?: number | null; year: number | null; title?: string; persianTitle?: string | null };
export type SearchRankingSignals = { searches?: Record<string, number>; trends?: Record<string, number> };

export function searchTitleKind(type: string): "movie" | "series" {
  return /series|episode|show|tvmini/i.test(type) ? "series" : "movie";
}

/** Rank title matches before mentions/metadata; never pin an individual film. */
export function compareSearchRank(query: string, signals: SearchRankingSignals = {}) {
  const key = searchText(query);
  const withoutArticle = (s: string) => s.replace(/^(?:the|an|a) (?=.)/, "");
  const core = withoutArticle(key);
  const currentYear = new Date().getUTCFullYear();
  const scores = new Map<RankedTitle, number>();
  const relevance = (item: RankedTitle) => {
    const cached = scores.get(item); if (cached !== undefined) return cached;
    let score = searchText(item.imdbCode) === key ? -1 : 5;
    for (const title of [item.title, item.persianTitle]) {
      if (!title) continue;
      const name = searchText(title);
      const titleCore = withoutArticle(name);
      if (name === key || titleCore === core) score = Math.min(score, 0);
      // A nearly completed whole title ("odysse" → "The Odyssey"), not
      // a partial word in a longer title ("2001: A Space Odyssey").
      else if (core.length >= 3 && titleCore.startsWith(core) && /^\p{L}{1,2}$/u.test(titleCore.slice(core.length))) score = Math.min(score, 1);
      else if (titleCore.startsWith(core)) score = Math.min(score, 2);
      else if (name.includes(` ${key}`)) score = Math.min(score, 3);
      else if (name.includes(key)) score = Math.min(score, 4);
    }
    scores.set(item, score); return score;
  };
  const count = (item: RankedTitle) => Math.max(0, signals.searches?.[item.imdbCode] || 0);
  const trend = (item: RankedTitle) => signals.trends?.[item.imdbCode] || Infinity;
  // Up to half an IMDb point over five release years: close-rated new
  // editions surface, but a weak remake cannot bury a much better classic.
  const merit = (item: RankedTitle) => {
    const rating = normalizedRating(item.imdbRating);
    const age = currentYear - (item.year ?? 0);
    return rating < 0 ? -1 : Math.round(rating * 10) + (age >= 0 ? Math.max(0, 5 - age) : 0);
  };
  return <T extends RankedTitle>(a: T, b: T) => relevance(a) - relevance(b)
    || merit(b) - merit(a) || (b.year ?? 0) - (a.year ?? 0)
    || count(b) - count(a) || (b.imdbVotes ?? 0) - (a.imdbVotes ?? 0)
    || trend(a) - trend(b) || a.imdbCode.localeCompare(b.imdbCode);
}

const normalizedRating = (value: number | null) => Number.isFinite(value) && value !== null && value > 0 && value <= 10 ? value : -1;

export function compareImdbRank(a: RankedTitle, b: RankedTitle) {
  const rating = (value: number | null) => Number.isFinite(value) && value !== null && value > 0 && value <= 10 ? value : -1;
  return rating(b.imdbRating) - rating(a.imdbRating)
    || (b.imdbVotes ?? 0) - (a.imdbVotes ?? 0)
    || (b.year ?? 0) - (a.year ?? 0)
    || a.imdbCode.localeCompare(b.imdbCode);
}

/** Rank the complete matching pool before truncating; type filtering is opt-in. */
export function selectRankedSuggestions<T extends RankedTitle>(matches: T[], limit: number, kind: SearchKind = "all", query = "", signals: SearchRankingSignals = {}): T[] {
  const byId = new Map<string, T>();
  const compare = query ? compareSearchRank(query, signals) : compareImdbRank;
  for (const item of [...matches].sort(compare)) if (!byId.has(item.imdbCode)) byId.set(item.imdbCode, item);
  const unique = [...byId.values()];
  limit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 8;
  return unique.filter((item) => kind === "all" || searchTitleKind(item.type) === kind).slice(0, limit);
}
