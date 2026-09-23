import type { VodCard } from "./types";
import type { TrendingTitle } from "./imdb-trending";

export type AudienceSignal = { likes: number; dislikes: number; comments: number; updatedAt: number };
export type DiscoverySignals = { trends?: TrendingTitle[]; audience?: Record<string, AudienceSignal>; now?: number };

export function withTrendRatings(items: VodCard[], signals: DiscoverySignals) {
  const now = signals.now ?? Date.now();
  const fresh = new Map((signals.trends ?? []).filter(item => {
    const age = now - Date.parse(item.popularity.observedAt);
    return item.popularity.current && age >= 0 && age < 8 * 86400000;
  }).map(item => [item.imdbCode, item]));
  return items.map(item => {
    const update = fresh.get(item.imdbCode);
    return update?.imdbRating != null && update.imdbVotes != null ? { ...item, imdbRating: update.imdbRating, imdbVotes: update.imdbVotes } : item;
  });
}

/** Bayesian rating confidence: a handful of 10/10 votes must not outrank a proven title. */
export function audienceRating(card: Pick<VodCard, "imdbRating" | "imdbVotes">) {
  const votes = Math.max(0, card.imdbVotes ?? 0);
  const rating = Math.max(0, Math.min(10, card.imdbRating ?? 6.5));
  return (rating * votes + 6.5 * 2500) / (votes + 2500);
}

export function discoveryScores(signals: DiscoverySignals = {}) {
  const now = signals.now ?? Date.now();
  const trends = new Map((signals.trends ?? []).map(item => [item.imdbCode, item.popularity]));
  return (card: VodCard) => {
    const trend = trends.get(card.imdbCode);
    const age = trend ? (now - Date.parse(trend.observedAt)) / 86400000 : Infinity;
    const popularity = trend?.current && age >= 0 && age <= 8 ? Math.max(0, 18 * (1 - (trend.rank - 1) / 100) * (1 - age / 10)) : 0;
    const feedback = signals.audience?.[card.imdbCode];
    const feedbackAge = feedback ? (now - feedback.updatedAt) / 86400000 : Infinity;
    const votes = feedback ? feedback.likes + feedback.dislikes : 0;
    // Comments signal interest only. Sentiment comes from the explicit vote, never guessed from text.
    const community = feedback && feedbackAge >= 0 && feedbackAge < 30 ?
      ((feedback.likes - feedback.dislikes) / (votes + 10) * 7 + Math.min(2, Math.log1p(feedback.comments) / 2)) * (1 - feedbackAge / 30) : 0;
    return audienceRating(card) * 5 + popularity + community;
  };
}

export function rankDiscovery(items: VodCard[], signals: DiscoverySignals = {}, limit = 18) {
  const score = discoveryScores(signals);
  const unique = new Map(withTrendRatings(items, signals).filter(item => item.linksCount > 0 && (item.posterUrl || item.backdropUrl)).map(item => [item.imdbCode, item]));
  return [...unique.values()].sort((a, b) => score(b) - score(a) || (b.imdbVotes ?? 0) - (a.imdbVotes ?? 0) || a.imdbCode.localeCompare(b.imdbCode)).slice(0, limit);
}
