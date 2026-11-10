import type { VodCard } from "./types";

/** One archive pass, preserving original order and per-genre title deduplication. */
export function categoryCardBuckets<T extends Pick<VodCard, 'imdbCode' | 'genres'>>(items: T[], eligible: (item: T) => boolean) {
  const buckets = new Map<string, T[]>();
  const seen = new Map<string, Set<string>>();
  for (const item of items) {
    if (!eligible(item)) continue;
    for (const raw of item.genres ?? []) {
      const key = raw.toLowerCase();
      const ids = seen.get(key) ?? new Set<string>();
      if (ids.has(item.imdbCode)) continue;
      ids.add(item.imdbCode); seen.set(key, ids);
      const bucket = buckets.get(key) ?? [];
      bucket.push(item); buckets.set(key, bucket);
    }
  }
  return buckets;
}

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
