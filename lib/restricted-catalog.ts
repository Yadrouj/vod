import { contentRestriction, restrictionUrl } from './content-restrictions.mjs';
import type { VodItem } from './types';

/** Preserve download/episode metadata without shipping the original media URLs. */
export function restrictCatalogItem(item: VodItem): VodItem {
  if (!contentRestriction(item)) return item;
  return { ...item, sourcePageUrl: item.sourcePageUrl ? restrictionUrl() : item.sourcePageUrl, links: item.links.map(link => {
    let host = '', filename = link.fileName || '';
    try { const url = new URL(link.url); host = url.hostname.replace(/^www\./, ''); filename ||= decodeURIComponent(url.pathname.split('/').at(-1) || ''); } catch { /* Malformed historical source. */ }
    const url = new URL(restrictionUrl());
    if (filename) url.searchParams.set('file', filename);
    return { ...link, url: url.href, sourceHost: host, sourceUrl: null, sourceOriginalUrl: null, sourceRelativePath: null, sourceBaseId: null };
  }) };
}
