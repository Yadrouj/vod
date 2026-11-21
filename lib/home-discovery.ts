import type { VodCard } from "./types";
import type { TrendingTitle } from "./imdb-trending";
import { rankDiscovery } from "./discovery-ranking";

/** Live catalogue selection, not a build-time import or a fabricated IMDb chart. */
export function weeklyDiscovery(items: VodCard[], trends: TrendingTitle[], now = Date.now(), limit = 18) {
  const eligible = items.filter(item => item.linksCount > 0 && (item.posterUrl || item.backdropUrl));
  const byId = new Map(eligible.map(item => [item.imdbCode, item]));
  const direct = trends.filter(item => {
    const age = now - Date.parse(item.popularity.observedAt);
    return item.popularity.current && age >= 0 && age < 86400_000 && byId.has(item.imdbCode);
  }).map(item => byId.get(item.imdbCode)!);
  if (direct.length >= 4) return { items: direct.slice(0, limit), basis: "imdb" as const };
  const week = eligible.filter(item => {
    const age = now - Date.parse(item.catalogUpdatedAt || item.sourceUpdatedAt || "");
    return age >= 0 && age <= 7 * 86400_000;
  });
  const year = new Date(now).getUTCFullYear();
  const pool = week.length >= 4 ? week : eligible.filter(item => (item.year ?? 0) >= year - 1 && (item.year ?? 0) <= year);
  const ranked = rankDiscovery(pool, { now }, limit);
  return { items: ranked.length ? ranked : rankDiscovery(eligible, { now }, limit), basis: week.length >= 4 ? "catalog-week" as const : "catalog" as const };
}

type WeeklyEntry = { title: string; year: number; type: string; rank: number };
/** Match the published weekly list without inventing absent title pages. */
export function matchWeeklyPicks(items: VodCard[], entries: WeeklyEntry[]) {
  const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const key = (title: string, type: string, year: number | null) => JSON.stringify([normalize(title), type, year]);
  const requested = new Set(entries.map(entry => key(entry.title, entry.type, entry.year)));
  const best = new Map<string, VodCard>();
  for (const item of items) {
    const id = key(item.title, item.type, item.year);
    if (!requested.has(id)) continue;
    const previous = best.get(id);
    const preference = previous ? Number(/^tt\d+$/.test(item.imdbCode)) - Number(/^tt\d+$/.test(previous.imdbCode)) || item.linksCount - previous.linksCount : 1;
    if (preference > 0) best.set(id, item);
  }
  return [...entries].sort((a, b) => a.rank - b.rank).flatMap(entry => {
    const card = best.get(key(entry.title, entry.type, entry.year));
    return card ? [{ ...card, imdbRating: (card.imdbRating ?? 0) <= 1 && !card.imdbVotes ? null : card.imdbRating }] : [];
  });
}

export function recentlyUpdatedTitles(items: VodCard[], now = Date.now(), limit = 18) {
  return items.map(item => ({ item, stamp: Date.parse(item.catalogUpdatedAt || item.sourceUpdatedAt || '') }))
    .filter(({ item, stamp }) => item.linksCount > 0 && Number.isFinite(stamp) && stamp <= now && (item.posterUrl || item.backdropUrl))
    .sort((a, b) => b.stamp - a.stamp || (b.item.imdbRating ?? 0) - (a.item.imdbRating ?? 0)).slice(0, limit).map(entry => entry.item);
}
