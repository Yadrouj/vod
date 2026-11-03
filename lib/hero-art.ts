import type { VodCard } from "@/lib/types";
import { sizedImageUrl } from "@/lib/image-url";

// This module is also imported by the client carousel. Runtime file access and
// credentials belong in the refresh script / server loader, never here.
export type HeroArtwork = { url: string; width: number; height: number; validatedAt: string; sourceUrl: string; provider: "catalog" | "tmdb" };
type HeroVisual = Pick<VodCard, "imdbCode" | "backdropUrl" | "posterUrl"> & { heroArt?: HeroArtwork | null };

export function isValidatedHeroArtwork(art: HeroArtwork | null | undefined): art is HeroArtwork {
  if (!art || !Number.isInteger(art.width) || !Number.isInteger(art.height) || art.width < 1920 || art.height < 800 ||
    art.width / art.height < 1.5 || art.width / art.height > 2.6 || !Number.isFinite(Date.parse(art.validatedAt))) return false;
  if (typeof art.url !== "string") return false;
  if (/^\/media\//.test(art.url)) return !/[\\?#]/.test(art.url) && !art.url.split("/").some(part => part === ".." || /%/i.test(part));
  try {
    const url = new URL(art.url);
    return url.protocol === "https:" && !url.port && !url.username && !url.password && !url.search && !url.hash &&
      (url.hostname === "m.media-amazon.com" || url.hostname === "image.tmdb.org");
  } catch { return false; }
}

function isPortraitNamedAsset(url: string) {
  return /(?:poster|cover|portrait|vertical)/i.test(url);
}

export function heroBackdropUrl(item: HeroVisual) {
  // Chart cards explicitly carry null when no landscape has been verified.
  // Never substitute a poster or an unverified wallpaper for a daily hero.
  if ("heroArt" in item) return isValidatedHeroArtwork(item.heroArt) ? item.heroArt.url : null;
  if (!item.backdropUrl || item.backdropUrl === item.posterUrl || isPortraitNamedAsset(item.backdropUrl)) return null;
  return item.backdropUrl;
}

export function isHeroReady(item: HeroVisual) {
  return Boolean(heroBackdropUrl(item));
}

export function heroImageSrc(url: string, width: number) {
  // Keep original landscape files for large desktop screens. The normal image
  // helper caps TMDB at 1280px, which is useful for rails but softens a
  // full-width 1440px hero.
  if (/^https:\/\/image\.tmdb\.org\//i.test(url)) return url;
  return sizedImageUrl(url, width) ?? url;
}
