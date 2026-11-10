import type { VodCard } from "./types";

/** Count titles, not links or the small landing-page preview. */
export function categoryCounts(items: Pick<VodCard, "imdbCode" | "genres">[]) {
  const titles = new Map<string, Set<string>>();
  for (const item of items) {
    for (const raw of item.genres ?? []) {
      const genre = raw.trim();
      if (!genre) continue;
      const ids = titles.get(genre) ?? new Set<string>();
      ids.add(item.imdbCode);
      titles.set(genre, ids);
    }
  }
  return [...titles].map(([genre, ids]) => [genre, ids.size] as const)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
