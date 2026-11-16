import type { VodItem, VodLink } from './types';
import { TtlLruCache } from './runtime-cache';
import { sourceLinkExpiry } from './alternative-source-links.mjs';
import { normalizeDownload, sourceIdentity } from '../scripts/public-vod-sources.mjs';

const cache = new TtlLruCache<string, VodLink[]>(200, 5 * 60_000);
const pending = new Map<string, Promise<VodLink[]>>();
const failures = new TtlLruCache<string, boolean>(200, 60_000);
let revision = 0;
export const familyMovieReleaseRevision = () => `${revision}:${Math.floor(Date.now() / 300_000)}`;
export function cachedFamilyMovieCount(item: { sourcePageUrl?: string | null }) {
  return item.sourcePageUrl ? cache.get(item.sourcePageUrl)?.length : undefined;
}

function publisherPage(item: VodItem): URL | null {
  for (const value of [item.sourcePageUrl, ...(item.curatedSourcePages || [])]) {
    try {
      const page = new URL(value || '');
      if (page.protocol === 'https:' && page.hostname === 'familymovie.tr' && page.pathname === '/' && !page.username && !page.password && !page.port
        && /^[a-zA-Z0-9_-]{1,120}$/.test(page.searchParams.get('movie') || '')) return page;
    } catch { /* Only explicit, trusted publisher pages may refresh a signature. */ }
  }
  return null;
}

/** Refresh only this publisher's existing catalogue entries, never user URLs. */
export async function refreshFamilyMovieRelease(item: VodItem): Promise<VodItem> {
  const page = publisherPage(item);
  if (!page) return item;
  const id = page.searchParams.get('movie');
  if (!id || !/^[a-zA-Z0-9_-]{1,120}$/.test(id)) return item;
  // Catalogue normalization may already have removed expired siblings. A single
  // surviving fresh file cannot prove that the whole release is current; rely on
  // the bounded per-publisher-page cache instead of skipping that refresh.
  const fallbackLinks = item.links.filter(link => link.sourceProvider !== 'familymovie' || sourceLinkExpiry(link) > Date.now() + 60_000);
  const fallback = fallbackLinks.length === item.links.length ? item : withReleaseLinks(item, fallbackLinks);
  const key = page.href;
  if (failures.get(key)) return fallback;
  let links = cache.get(key);
  if (links?.some(link => sourceLinkExpiry(link) <= Date.now() + 60_000)) { cache.delete(key); links = undefined; }
  if (!links) {
    let request = pending.get(key);
    if (!request) {
      request = (async () => {
        const response = await fetch(`https://familymovie.tr/api/media/single?id=${encodeURIComponent(id)}`, {
          redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12000), headers: { accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Publisher unavailable');
        const detail = await response.json();
        if (detail.id !== id || sourceIdentity(detail) !== sourceIdentity(item) || !Array.isArray(detail.downloads)) throw new Error('Publisher identity mismatch');
        const fresh = detail.downloads.slice(0, 1000).map((download: unknown) => normalizeDownload(download, { provider: 'familymovie', pageUrl: key, minTtlMs: 2 * 60_000 })).filter(Boolean) as VodLink[];
        const lifetime = Math.min(5 * 60_000, ...fresh.map(link => sourceLinkExpiry(link) - Date.now() - 60_000));
        cache.set(key, fresh, Math.max(1000, lifetime)); revision++;
        return fresh;
      })().finally(() => pending.delete(key));
      pending.set(key, request);
    }
    try { links = await request; } catch { failures.set(key, true); return fallback; }
  }
  if (!links.length) return fallback;
  const existing = item.links.filter(link => link.sourceProvider !== 'familymovie');
  return withReleaseLinks(item, [...links, ...existing]);
}

function withReleaseLinks(item: VodItem, links: VodLink[]): VodItem {
  return { ...item, links, groups: [...new Set(links.map(link => link.group))], qualities: [...new Set(links.map(link => link.quality).filter(Boolean))] as string[] };
}
