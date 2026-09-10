import { sizedImageUrl } from "./image-url";

export function categoryImageCandidates(item: { backdropUrl: string | null; posterUrl: string | null }): string[] {
  return [...new Set([item.backdropUrl, item.posterUrl].flatMap(raw => {
    if (!raw) return [];
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" || url.username || url.password) return [];
      // TMDB backdrops support w300/w780, unlike poster-only sizes such as w500.
      const small = url.hostname === "image.tmdb.org"
        ? raw.replace(/\/(?:original|w\d+)\//, "/w300/")
        : sizedImageUrl(raw, 360);
      return small === raw ? [raw] : [small!, raw];
    } catch { return []; }
  }))];
}
