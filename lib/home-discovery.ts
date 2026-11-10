import type { VodCard } from "./types";

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
