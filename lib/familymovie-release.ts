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

/** Refresh only this publisher's existing catalogue entries, never user URLs. */
export async function refreshFamilyMovieRelease(item: VodItem): Promise<VodItem> {
  let page: URL;
  try { page = new URL(item.sourcePageUrl || ''); } catch { return item; }
  if (page.hostname !== 'familymovie.tr' || page.pathname !== '/' || page.username || page.password || page.port) return item;
  const id = page.searchParams.get('movie');
  if (!id || !/^[a-zA-Z0-9_-]{1,120}$/.test(id)) return item;
  // Existing fresh release files need no extra request before playback.
  if (item.links.some(link => link.mediaKind !== 'trailer' && sourceLinkExpiry(link) > Date.now() + 6 * 3600_000)) return item;
  const key = item.sourcePageUrl!;
  if (failures.get(key)) return item;
  let links = cache.get(key);
  if (!links) {
    let request = pending.get(key);
    if (!request) {
      request = (async () => {
        const response = await fetch(`https://familymovie.tr/api/media/single?id=${encodeURIComponent(id)}`, {
          redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000), headers: { accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Publisher unavailable');
        const detail = await response.json();
        if (detail.id !== id || sourceIdentity(detail) !== sourceIdentity(item) || !Array.isArray(detail.downloads)) throw new Error('Publisher identity mismatch');
        const fresh = detail.downloads.slice(0, 1000).map((download: unknown) => normalizeDownload(download, { provider: 'familymovie', pageUrl: key })).filter(Boolean) as VodLink[];
        cache.set(key, fresh); revision++;
        return fresh;
      })().finally(() => pending.delete(key));
      pending.set(key, request);
    }
    try { links = await request; } catch { failures.set(key, true); return item; }
  }
  if (!links.length) return item;
  const existing = item.links.filter(link => link.sourceProvider !== 'familymovie');
  return { ...item, links: [...links, ...existing], groups: [...new Set([...links, ...existing].map(link => link.group))], qualities: [...new Set([...links, ...existing].map(link => link.quality).filter(Boolean))] as string[] };
}
