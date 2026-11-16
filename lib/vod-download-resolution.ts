import type { VodCard, VodItem } from './types';
import { sourceLinkExpiry } from './alternative-source-links.mjs';
import { contentRestriction } from './content-restrictions.mjs';
import { resolveHistoryMetadata } from './history-metadata';

export type VodDownloadResolution =
  | { status: 'ready'; url: string; refreshed: boolean; itemId?: string }
  | { status: 'unavailable'; itemId?: string }
  | { status: 'restricted' };

type Dependencies = {
  loadCards: () => Promise<VodCard[]>;
  findItem: (id: string) => Promise<VodItem | null>;
  now?: number;
};

/** Exact public file identity, not a fuzzy title/episode/quality replacement.
 * Preserve publisher user IDs and every opaque parameter other than its known
 * rotating expiry/signature. In particular, never strip signatures to download.
 */
export function rotatingDownloadKey(value: string): string | null {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.port
      || !/\.(?:mp4|mkv|m4v|webm|mov|m3u8)$/i.test(url.pathname)) return null;
    for (const key of ['md5', 'expires', 'Expires']) url.searchParams.delete(key);
    url.hash = '';
    url.searchParams.sort();
    return url.href;
  } catch { return null; }
}

/** Old bot/history URLs have no itemId. Use exact local metadata only; publisher
 * requests are made by findItem from stored, trusted catalogue pages, never URL
 * query parameters. A replacement must still identify the exact same file.
 */
export async function resolveVodDownload(
  input: { url: string; title?: string; itemId?: string },
  { loadCards, findItem, now = Date.now() }: Dependencies,
): Promise<VodDownloadResolution> {
  if (contentRestriction(input)) return { status: 'restricted' };
  const expiry = sourceLinkExpiry({ url: input.url });
  if (expiry > now + 60_000) return { status: 'ready', url: input.url, refreshed: false };
  const key = rotatingDownloadKey(input.url);
  if (!key) return { status: 'unavailable' };

  let id = input.itemId && /^[a-z0-9][a-z0-9_-]{1,120}$/i.test(input.itemId) ? input.itemId : undefined;
  if (!id) {
    let cards = await loadCards();
    const file = new URL(input.url).pathname.split('/').at(-1) || '';
    const year = /(?:^|[._ -])((?:19|20)\d{2})(?:[._ -]|$)/.exec(file)?.[1];
    if (year) cards = cards.filter(card => card.year === Number(year));
    if (/S\d{1,2}[._ -]*E\d{1,3}/i.test(file)) cards = cards.filter(card => card.type === 'series');
    id = resolveHistoryMetadata([{ key: 'download', title: input.title, url: input.url }], cards).download?.itemId;
  }
  if (!id) return { status: 'unavailable' };
  if (contentRestriction(id)) return { status: 'restricted' };
  const item = await findItem(id);
  if (!item) return { status: 'unavailable', itemId: id };
  if (contentRestriction(item)) return { status: 'restricted' };
  const matches = item.links.filter(link => link.sourceProvider === 'familymovie'
    && !['trailer', 'subtitle', 'archive'].includes(link.mediaKind || '')
    && rotatingDownloadKey(link.url) === key && sourceLinkExpiry(link) > now + 60_000);
  const urls = [...new Set(matches.map(link => link.url))];
  // No silent switch to another episode, a trailer, language, encode or quality.
  return urls.length === 1 ? { status: 'ready', url: urls[0], refreshed: urls[0] !== input.url, itemId: item.imdbCode }
    : { status: 'unavailable', itemId: item.imdbCode };
}
