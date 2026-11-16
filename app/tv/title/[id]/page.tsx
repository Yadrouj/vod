import { notFound } from "next/navigation";
import { findVodItem, normalizeVodType } from "@/lib/catalog";
import { getLocale } from "@/lib/server-locale";
import { tvCard } from "@/lib/tv-catalog";
import { playableLinks } from "@/lib/link-labels";
import { releaseKind } from "@/lib/release-options";
import { contentRestriction } from "@/lib/content-restrictions.mjs";
import { TVTitle } from "@/components/tv/tv-title";
import type { TVVersion } from "@/lib/tv-types";
import { loadHeroArtwork } from "@/lib/imdb-trending";

export default async function TVTitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, locale, art] = await Promise.all([findVodItem(id), getLocale(), loadHeroArtwork()]);
  if (!item) notFound();
  const restricted = Boolean(contentRestriction(item));
  const links = restricted ? [] : playableLinks(item.links, { isSeries: normalizeVodType(item.type) === "series", title: item.title, includeAlternateFiles: true });
  const versions: TVVersion[] = [...new Map(links.map(link => {
    const version = { season: link.season ?? 0, episode: link.episode ?? 0, kind: releaseKind(link.group), quality: link.quality || "Auto" };
    return [JSON.stringify(version), version];
  })).values()];
  return <TVTitle item={tvCard({ ...item, ...(art[item.imdbCode] ? { heroArt: art[item.imdbCode] } : {}) }, locale)} versions={versions} locale={locale} restricted={restricted} />;
}
