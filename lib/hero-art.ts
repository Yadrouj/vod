import type { VodCard } from "@/lib/types";
import { sizedImageUrl } from "@/lib/image-url";

// These are landscape keyframes, rather than posters, reserved for the
// current chart titles whose catalog source only supplied a portrait image.
// TMDB's original rendition keeps the desktop hero sharp at large widths.
const HIGH_RES_HERO_ART: Record<string, string> = {
  tt33764258: "https://image.tmdb.org/t/p/original/y5nGxySCfrBIYw1SJF7W11gF3HJ.jpg",
  tt26545992: "https://image.tmdb.org/t/p/original/mdbWfpbWhvxgG3k5MHpo90UgAUe.jpg",
};

function isPortraitNamedAsset(url: string) {
  return /(?:poster|cover|portrait|vertical)/i.test(url);
}

export function heroBackdropUrl(item: Pick<VodCard, "imdbCode" | "backdropUrl" | "posterUrl">) {
  const curated = HIGH_RES_HERO_ART[item.imdbCode];
  if (curated) return curated;
  if (!item.backdropUrl || item.backdropUrl === item.posterUrl || isPortraitNamedAsset(item.backdropUrl)) return null;
  return item.backdropUrl;
}

export function isHeroReady(item: Pick<VodCard, "imdbCode" | "backdropUrl" | "posterUrl">) {
  return Boolean(heroBackdropUrl(item));
}

export function heroImageSrc(url: string, width: number) {
  // Keep TMDB's original landscape file for large desktop screens. The normal
  // image helper caps TMDB at 1280px, which is useful for rails but softens a
  // full-width 1440px hero.
  if (/^https:\/\/image\.tmdb\.org\//i.test(url)) return url;
  return sizedImageUrl(url, width) ?? url;
}
