import iranian from "./data/moviezland-iranian-profiles.json";
import regional from "./data/moviezland-regional-profiles.json";
import publisher from "./data/moviezland-publisher-profiles.json";
import sourceIndex from "./data/moviezland-direct-index.json";
import type { VodCard, VodCatalogIndex, VodItem } from "./types";

type Profile = {
  id: string; title: string; persianTitle: string; year: number | null; type: string;
  countries: string[]; languages: string[]; genres: string[]; overview: string;
  posterUrl: string; sourcePageUrl: string; metadataSources: string[];
  director?: string; directors?: string[]; cast?: string[];
};
const profiles: readonly Profile[] = [...publisher, ...iranian, ...regional];
const sourceCounts: Record<string, { linksCount: number; groups: string[]; qualities: string[]; publisherSourceUrl: string }> = sourceIndex;
const researchedIds = new Set([...iranian, ...regional].map(profile => profile.id));
const byId = new Map(profiles.map(profile => [profile.id, profile]));

export function publisherPosterSource(id: string): string | null {
  const raw = byId.get(id)?.posterUrl;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname.toLowerCase() === "movielandz.com" && !url.username && !url.password
      && !url.port && !url.search && /^\/wp-content\/uploads\/.+\.(?:jpe?g|png|webp)$/i.test(url.pathname) ? url.href : null;
  } catch { return null; }
}

/** A researched, small supplement; never invent IMDb IDs for unlisted works. */
export function moviezlandProfile(id: string): VodItem | null {
  const profile = byId.get(id.toLowerCase());
  if (!profile) return null;
  const directors = profile.directors || (profile.director ? [profile.director] : []);
  const posterUrl = publisherPosterSource(id) ? `/api/publisher-poster/${encodeURIComponent(id)}` : profile.posterUrl;
  return {
    id: profile.id, imdbCode: profile.id, imdbUrl: /^tt\d+$/.test(profile.id) ? `https://www.imdb.com/title/${profile.id}/` : null,
    title: profile.title, originalTitle: profile.title, persianTitle: profile.persianTitle,
    type: profile.type, year: profile.year, imdbRating: null, imdbVotes: null,
    countries: profile.countries, languages: profile.languages, genres: profile.genres,
    overview: profile.overview, persianOverview: profile.overview,
    posterUrl, backdropUrl: posterUrl,
    source: "MovieLandz / researched metadata", sourcePageUrl: profile.sourcePageUrl,
    curatedSourcePages: profile.metadataSources, groups: [], qualities: [], links: [],
    credits: [...directors.map(name => ({ name_text: name, category: "director" })), ...(profile.cast || []).map(name => ({ name_text: name, category: "actor" }))],
  };
}

export function enrichMoviezlandProfile(item: VodItem): VodItem {
  const profile = moviezlandProfile(item.imdbCode || item.id);
  if (!profile) return item;
  return { ...item, title: profile.title, originalTitle: item.originalTitle || profile.title,
    persianTitle: profile.persianTitle, overview: profile.overview, persianOverview: profile.persianOverview,
    countries: profile.countries, languages: profile.languages, genres: profile.genres,
    posterUrl: profile.posterUrl, backdropUrl: item.backdropUrl || profile.posterUrl,
    credits: item.credits?.length ? item.credits : profile.credits,
    sourcePageUrl: item.sourcePageUrl || profile.sourcePageUrl,
    curatedSourcePages: [...new Set([...(item.curatedSourcePages || []), ...(profile.curatedSourcePages || [])])],
  };
}

function toCard(item: VodItem): VodCard {
  return { ...item, genres: item.genres || [], countries: item.countries || [], languages: item.languages || [],
    posterUrl: item.posterUrl || null, backdropUrl: item.backdropUrl || null, runtimeMinutes: item.runtimeMinutes || null,
    overview: item.overview || null, linksCount: item.links.length };
}

export function addMoviezlandProfiles(index: VodCatalogIndex, includeNew = true): VodCatalogIndex {
  const ids = new Set(index.items.map(item => item.imdbCode || item.id));
  const unique = [...new Map(profiles.map(profile => [profile.id, profile])).values()];
  const added = includeNew ? unique.filter(profile => !ids.has(profile.id) && (researchedIds.has(profile.id) || sourceCounts[profile.id]?.linksCount > 0)).map(profile => toCard(moviezlandProfile(profile.id)!)) : [];
  const enrich = (item: VodCard): VodCard => {
    const profile = moviezlandProfile(item.imdbCode || item.id);
    const count = sourceCounts[item.imdbCode || item.id];
    const result = profile ? { ...item, title: profile.title, persianTitle: profile.persianTitle,
      overview: profile.overview || item.overview, persianOverview: profile.persianOverview,
      posterUrl: profile.posterUrl || item.posterUrl, countries: profile.countries || item.countries,
      genres: profile.genres?.length ? profile.genres : item.genres } : item;
    return count ? { ...result, linksCount: Math.max(result.linksCount, count.linksCount),
      qualities: [...new Set([...result.qualities, ...count.qualities])], groups: [...new Set([...result.groups, ...count.groups])] } : result;
  };
  return { ...index, totalTitles: index.totalTitles + added.length, items: [...index.items.map(enrich), ...added.map(enrich)],
    sections: index.sections.map(section => ({ ...section, items: section.items.map(enrich) })) };
}
