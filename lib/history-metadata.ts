import type { VodCard } from "./types";
export type HistoryReference = { key: string; itemId?: string; title?: string; url?: string };
export type HistoryMetadata = { itemId: string; title: string; image: string | null; type: string };
const normalize = (value: string) => value.toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const indexes = new WeakMap<VodCard[], { byId: Map<string, VodCard>; byTitle?: Map<string, VodCard[]> }>();
export function resolveHistoryMetadata(refs: HistoryReference[], cards: VodCard[]) {
  const result: Record<string, HistoryMetadata> = Object.create(null);
  let index = indexes.get(cards);
  if (!index) { index = { byId: new Map(cards.map((card) => [card.imdbCode, card])) }; indexes.set(cards, index); }
  for (const ref of refs.slice(0, 20)) {
    let item = ref.itemId ? index.byId.get(ref.itemId) : undefined;
    if (!item) {
      if (!index.byTitle) {
        index.byTitle = new Map();
        for (const card of cards) for (const title of new Set([card.title, card.persianTitle].filter(Boolean))) {
          const key = normalize(title!);
          index.byTitle.set(key, [...(index.byTitle.get(key) ?? []), card]);
        }
      }
      let file = "";
      try { file = decodeURIComponent(new URL(ref.url ?? "").pathname.split("/").pop() ?? "").split(/S\d{1,2}[. _-]*E\d{1,3}|(?:19|20)\d{2}|(?:480|720|1080|2160)p/i)[0]; } catch { /* no URL inference */ }
      const titles = [normalize((ref.title ?? "").replace(/\s*·\s*S\d+E\d+.*$/i, "")), normalize(file)].filter((title) => title.length > 2 && !/^(?:قسمت|episode)\s*\d*$/i.test(title));
      const matches = titles.flatMap((title) => index.byTitle!.get(title) ?? []);
      const unique = [...new Map(matches.map((card) => [card.imdbCode, card])).values()];
      if (unique.length === 1) item = unique[0]; // Never guess between remakes.
    }
    if (item) result[ref.key] = { itemId: item.imdbCode, title: item.persianTitle || item.title, image: item.backdropUrl || item.posterUrl, type: item.type };
  }
  return result;
}
