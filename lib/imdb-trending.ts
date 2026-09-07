import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { VodCard } from "./types";
export type TrendingTitle = VodCard & { popularity: { rank: number; kind: "movie" | "series"; observedAt: string; sourceUrl: string; current: boolean } };
type Chart = { observedAt: string; sourceUrl: string; capture: "direct" | "search-cache"; items: { rank: number; card: VodCard }[] };
const file = path.join(process.cwd(), "public/data/imdb-trending.json");
let cache: { modifiedAt: number; charts: Partial<Record<"movie" | "series", Chart>> } | null = null;

export function selectTrendingTitles(charts: Partial<Record<"movie" | "series", Chart>>, now = Date.now(), limit = 10): TrendingTitle[] {
  const groups = (["movie", "series"] as const).map((kind) => {
    const chart = charts[kind];
    const age = now - Date.parse(chart?.observedAt ?? "");
    if (!chart || !Number.isFinite(age) || age < 0 || age > 30 * 86400_000 || !Array.isArray(chart.items)) return [];
    let source: URL;
    try { source = new URL(chart.sourceUrl); } catch { return []; }
    if (source.hostname !== "www.imdb.com" || source.protocol !== "https:" || source.pathname !== (kind === "movie" ? "/chart/moviemeter/" : "/chart/tvmeter/")) return [];
    return [...chart.items].filter(({ rank, card }) => Number.isInteger(rank) && rank > 0 && rank <= 100 && card?.imdbCode && card.type === kind && (card.posterUrl || card.backdropUrl))
      .sort((a, b) => a.rank - b.rank)
      .map(({ card, rank }) => ({ ...card, popularity: { rank, kind, observedAt: chart.observedAt, sourceUrl: chart.sourceUrl, current: chart.capture === "direct" && age < 8 * 86400_000 } }));
  });
  const seen = new Set<string>();
  const result: TrendingTitle[] = [];
  // Alternate film/TV without comparing ranks from two different charts.
  for (let i = 0; i < Math.max(...groups.map((group) => group.length)); i++) for (const group of groups) {
    const item = group[i];
    if (item && !seen.has(item.imdbCode) && result.length < limit) { seen.add(item.imdbCode); result.push(item); }
  }
  return result;
}
export async function loadImdbTrending(): Promise<TrendingTitle[]> {
  try {
    const info = await stat(file);
    if (!cache || cache.modifiedAt !== info.mtimeMs) {
      const payload = JSON.parse(await readFile(file, "utf8"));
      if (payload.version !== 1 || !payload.charts) return [];
      cache = { modifiedAt: info.mtimeMs, charts: payload.charts };
    }
    return selectTrendingTitles(cache.charts);
  } catch { return []; }
}
