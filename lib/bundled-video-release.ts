import type { VodCard, VodCatalogIndex, VodItem, VodLink } from './types';
import { contentRestriction } from './content-restrictions.mjs';
import { isGenericSourceTitle } from './title-display';
import { normalizeCardFacets } from './catalog-facets.mjs';
import { alternativeMediaKey, sourceLinkExpiry } from './alternative-source-links.mjs';
import { isAwaitingTitleLinks } from './title-availability';

export type VideoReleaseBundle = { observedAt: string; items: VodItem[]; newTitleIds?: string[] };
const identity = (item: { id: string; imdbCode?: string }) => item.imdbCode || item.id;
const unique = (values: (string | null | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))];
const later = (a?: string | null, b?: string | null) => (Date.parse(a || '') || 0) >= (Date.parse(b || '') || 0) ? a : b;
const bundles = new WeakMap<VideoReleaseBundle, Map<string, VodItem>>();
function itemsById(bundle: VideoReleaseBundle) {
  let map = bundles.get(bundle);
  if (!map) { map = new Map(bundle.items.filter(item => !contentRestriction(item)).map(item => [identity(item), item])); bundles.set(bundle, map); }
  return map;
}

/** Add reviewed sources without replacing unrelated live metadata or erasing history. */
export function mergeVideoRelease(item: VodItem | null, id: string, bundle: VideoReleaseBundle): VodItem | null {
  if (contentRestriction(item || id)) return item;
  const incoming = itemsById(bundle).get(item ? identity(item) : id);
  if (!incoming) return item;
  const rejected = new Set(((item as VodItem & { unavailableDownloadLinks?: { url: string; verification?: { status?: number; contentType?: string } }[] })?.unavailableDownloadLinks || [])
    .filter(link => [404, 410].includes(link.verification?.status || 0) || /html/i.test(link.verification?.contentType || '')).map(link => link.url));
  const linkKey = (link: VodLink) => alternativeMediaKey(link) || link.url;
  const links = new Map((item?.links || []).map(link => [linkKey(link), link]));
  let refreshed = false;
  for (const link of incoming.links) {
    if (rejected.has(link.url) || sourceLinkExpiry(link) <= Date.now()) continue;
    const old = links.get(linkKey(link));
    // Do not reintroduce an old rotating signature over a newer live one.
    if (old && sourceLinkExpiry(old) > sourceLinkExpiry(link)) continue;
    refreshed ||= Boolean(old && old.url !== link.url);
    links.set(linkKey(link), old?.url === link.url ? { ...link, ...old } : link);
  }
  const changed = refreshed || links.size > (item?.links.length || 0);
  return { ...incoming, ...item,
    title: item?.title && !isGenericSourceTitle(item.title) ? item.title : incoming.title,
    persianTitle: item?.persianTitle && !isGenericSourceTitle(item.persianTitle) ? item.persianTitle : incoming.persianTitle,
    year: item?.year ?? incoming.year, imdbRating: item?.imdbRating ?? incoming.imdbRating, imdbVotes: item?.imdbVotes ?? incoming.imdbVotes,
    overview: item?.overview || incoming.overview, persianOverview: item?.persianOverview || incoming.persianOverview,
    posterUrl: item?.posterUrl || incoming.posterUrl, backdropUrl: item?.backdropUrl || incoming.backdropUrl,
    links: [...links.values()], groups: unique([...(item?.groups || []), ...[...links.values()].map(link => link.group)]),
    qualities: unique([...(item?.qualities || []), ...[...links.values()].map(link => link.quality)]),
    genres: unique([...(item?.genres || []), ...(incoming.genres || [])]),
    countries: unique([...(item?.countries || []), ...(incoming.countries || [])]),
    languages: unique([...(item?.languages || []), ...(incoming.languages || [])]),
    curatedSourcePages: unique([...(item?.curatedSourcePages || []), ...(incoming.curatedSourcePages || []), incoming.sourcePageUrl]),
    sourceUpdatedAt: later(item?.sourceUpdatedAt, incoming.sourceUpdatedAt),
    catalogUpdatedAt: changed || !item ? later(item?.catalogUpdatedAt, bundle.observedAt) : item.catalogUpdatedAt,
  };
}

const fullLinks = (links: VodLink[]) => links.filter(link => link.mediaKind !== 'trailer' && !/^(?:trailer|teaser|preview)s?$/i.test(link.group));
function releaseCard(item: VodItem): VodCard {
  return normalizeCardFacets({ id: item.id, imdbCode: item.imdbCode, title: item.title, year: item.year,
    imdbRating: item.imdbRating, imdbVotes: item.imdbVotes,
    type: /series|episode|show/i.test(item.type) ? 'series' : 'movie',
    genres: item.genres || [], countries: item.countries || [], languages: item.languages || [],
    posterUrl: item.posterUrl || null, backdropUrl: item.backdropUrl || item.posterUrl || null,
    runtimeMinutes: item.runtimeMinutes || null, overview: item.overview?.slice(0, 220) || null,
    qualities: item.qualities, groups: item.groups, source: item.source, sourcePageUrl: item.sourcePageUrl,
    persianTitle: item.persianTitle, persianOverview: item.persianOverview?.slice(0, 220),
    persianGenres: item.persianGenres, persianCountries: item.persianCountries, persianLanguages: item.persianLanguages,
    sourceUpdatedAt: item.sourceUpdatedAt, catalogUpdatedAt: item.catalogUpdatedAt,
    linksCount: item.links.length, fullLengthLinksCount: fullLinks(item.links).length,
  });
}

/** Runs once per underlying archive snapshot, not once per search or keystroke. */
export function applyVideoReleaseIndex(index: VodCatalogIndex, bundle: VideoReleaseBundle, includeNew = true): VodCatalogIndex {
  const incoming = itemsById(bundle), present = new Set(index.items.map(identity));
  const merge = (card: VodCard): VodCard => {
    const update = incoming.get(identity(card)); if (!update) return card;
    const fresh = releaseCard(update);
    return normalizeCardFacets({ ...fresh, ...card,
      posterUrl: card.posterUrl || fresh.posterUrl, backdropUrl: card.backdropUrl || fresh.backdropUrl,
      persianTitle: card.persianTitle && !isGenericSourceTitle(card.persianTitle) ? card.persianTitle : fresh.persianTitle,
      qualities: unique([...card.qualities, ...fresh.qualities]), groups: unique([...card.groups, ...fresh.groups]),
      genres: unique([...card.genres, ...fresh.genres]), countries: unique([...card.countries, ...fresh.countries]), languages: unique([...card.languages, ...fresh.languages]),
      linksCount: Math.max(card.linksCount, fresh.linksCount),
      fullLengthLinksCount: Math.max(isAwaitingTitleLinks(card) ? 0 : card.fullLengthLinksCount ?? card.linksCount, fresh.fullLengthLinksCount || 0),
      catalogUpdatedAt: later(card.catalogUpdatedAt, bundle.observedAt), sourceUpdatedAt: later(card.sourceUpdatedAt, update.sourceUpdatedAt),
    });
  };
  const added = includeNew ? [...incoming.values()].filter(item => !present.has(identity(item))).map(releaseCard) : [];
  const fullIndex = index.totalTitles === index.items.length;
  const newIds = new Set(bundle.newTitleIds || []);
  const items = [...index.items.map(merge), ...added];
  return { ...index, items,
    totalTitles: fullIndex ? items.length : index.totalTitles + (Date.parse(index.generatedAt) >= Date.parse(bundle.observedAt) ? 0 : added.filter(item => newIds.has(identity(item))).length),
    updatedAt: later(index.updatedAt, bundle.observedAt) || index.updatedAt,
    sections: index.sections.map(section => ({ ...section, items: section.items.map(merge) })),
  };
}
