import type { VodCard } from "@/lib/types";
import { sizedImageUrl } from "@/lib/image-url";

// These are landscape keyframes, rather than posters, reserved for the
// current chart titles whose catalog source only supplied a portrait image.
// These source renditions keep the desktop hero sharp at large widths and are
// served from hosts that are reachable by the site runtime.
const HIGH_RES_HERO_ART: Record<string, string> = {
  tt33764258: "https://images.hdqwalls.com/download/the-odyssey-movie-ly-3440x1440.jpg",
  tt26545992: "https://img.tv-radar.com/t/p/original/eYvhRHD06mNUJAfAMyRVwtxIWQx.jpg",
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
  // Keep original landscape files for large desktop screens. The normal image
  // helper caps TMDB at 1280px, which is useful for rails but softens a
  // full-width 1440px hero.
  if (/^https:\/\/image\.tmdb\.org\//i.test(url)) return url;
  return sizedImageUrl(url, width) ?? url;
}
