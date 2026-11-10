import type { VodCard } from "./types";

type WeeklyEntry = { title: string; year: number; type: string; rank: number };
/** Match the published weekly list without inventing absent title pages. */
export function matchWeeklyPicks(items: VodCard[], entries: WeeklyEntry[]) {
  const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return [...entries].sort((a, b) => a.rank - b.rank).flatMap(entry => {
    const candidates = items.filter(item => normalize(item.title) === normalize(entry.title) && item.type === entry.type && item.year === entry.year)
      .sort((a, b) => Number(/^tt\d+$/.test(b.imdbCode)) - Number(/^tt\d+$/.test(a.imdbCode)) || b.linksCount - a.linksCount);
    const card = candidates[0];
    return card ? [{ ...card, imdbRating: (card.imdbRating ?? 0) <= 1 && !card.imdbVotes ? null : card.imdbRating }] : [];
  });
}

export function recentlyUpdatedTitles(items: VodCard[], now = Date.now(), limit = 18) {
  const stamp = (item: VodCard) => Date.parse(item.catalogUpdatedAt || item.sourceUpdatedAt || "");
  return items.filter(item => item.linksCount > 0 && Number.isFinite(stamp(item)) && stamp(item) <= now && (item.posterUrl || item.backdropUrl))
    .sort((a, b) => stamp(b) - stamp(a) || (b.imdbRating ?? 0) - (a.imdbRating ?? 0)).slice(0, limit);
}
