import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { VodCard } from "./types";
import { isValidatedHeroArtwork, type HeroArtwork } from "./hero-art";
export type TrendingTitle = VodCard & { heroArt?: HeroArtwork | null; popularity: { rank: number; kind: "movie" | "series"; observedAt: string; sourceUrl: string; current: boolean } };
type Chart = { observedAt: string; sourceUrl: string; capture: "direct" | "search-cache"; items: { rank: number; card: VodCard }[] };
let cache: { file: string; modifiedAt: number; charts: Partial<Record<"movie" | "series", Chart>> } | null = null;
let artCache: { file: string; modifiedAt: number; artwork: Record<string, HeroArtwork> } | null = null;

// Artwork remains useful during a chart outage, but never supplies a popularity rank.
export async function loadHeroArtwork(): Promise<Record<string, HeroArtwork>> {
  const file = path.resolve(process.env.VOD_DATA_DIR || path.join(process.cwd(), 'public/data'), 'imdb-hero-art.json');
  try {
    const info = await stat(file);
    if (!artCache || artCache.file !== file || artCache.modifiedAt !== info.mtimeMs) {
      const payload = JSON.parse(await readFile(file, 'utf8'));
      if (payload.version !== 1 || !payload.artwork || typeof payload.artwork !== 'object' || Array.isArray(payload.artwork)) return {};
      artCache = { file, modifiedAt: info.mtimeMs, artwork: payload.artwork };
    }
    return Object.fromEntries(Object.entries(artCache.artwork).filter(([, art]) => isValidatedHeroArtwork(art)));
  } catch { return {}; }
}

export function selectTrendingTitles(charts: Partial<Record<"movie" | "series", Chart>>, now = Date.now(), limit = 10): TrendingTitle[] {
  const calendar = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" });
  const groups = (["movie", "series"] as const).map((kind) => {
    const chart = charts[kind];
    const age = now - Date.parse(chart?.observedAt ?? "");
    if (!chart || !Number.isFinite(age) || age < 0 || age > 30 * 86400_000 || !Array.isArray(chart.items)) return [];
    let source: URL;
    try { source = new URL(chart.sourceUrl); } catch { return []; }
    if (source.hostname !== "www.imdb.com" || source.protocol !== "https:" || source.pathname !== (kind === "movie" ? "/chart/moviemeter/" : "/chart/tvmeter/")) return [];
    const current = chart.capture === "direct" && age < 86400_000 && calendar.format(now) === calendar.format(Date.parse(chart.observedAt));
    return [...chart.items].filter((entry) => entry && Number.isInteger(entry.rank) && entry.rank > 0 && entry.rank <= 100 && entry.card?.imdbCode && entry.card.type === kind && (entry.card.posterUrl || entry.card.backdropUrl))
      .sort((a, b) => a.rank - b.rank)
      .map(({ card, rank }) => ({ ...card, popularity: { rank, kind, observedAt: chart.observedAt, sourceUrl: chart.sourceUrl,
        current } }));
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
export async function loadImdbTrending(limit = 10): Promise<TrendingTitle[]> {
  const dir = process.env.VOD_DATA_DIR || path.join(process.cwd(), "public/data");
  const file = path.resolve(dir, "imdb-trending.json");
  try {
    const info = await stat(file);
    if (!cache || cache.file !== file || cache.modifiedAt !== info.mtimeMs) {
      const payload = JSON.parse(await readFile(file, "utf8"));
      if (payload.version !== 1 || !payload.charts) return [];
      cache = { file, modifiedAt: info.mtimeMs, charts: payload.charts };
    }
    const artwork = await loadHeroArtwork();
    return selectTrendingTitles(cache.charts, Date.now(), limit).map(item => ({ ...item,
      heroArt: isValidatedHeroArtwork(artwork[item.imdbCode]) ? artwork[item.imdbCode] : null,
    }));
  } catch { return []; }
}
