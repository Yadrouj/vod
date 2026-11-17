import { contentRestriction } from './content-restrictions.mjs';

export function glorytoonUrl(value, kind = 'page', base = 'https://glorytoon.com/') {
  try {
    if (typeof value !== 'string' || !value.trim() || /[<>"\\]/.test(value)) return null;
    const url = new URL(value, base);
    const hosts = kind === 'media' ? ['dl.glorycartoon.com'] : ['glorytoon.com', 'www.glorytoon.com'];
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port || !hosts.includes(url.hostname)) return null;
    if (/%(?:22|3c|3e|5c)/i.test(url.pathname)) return null;
    if (kind === 'page') url.pathname = url.pathname.replace(/%[a-f\d]{2}/gi, code => code.toUpperCase());
    url.hash = '';
    return url.href;
  } catch { return null; }
}

// Supplemental publisher files deliberately never enter item.links: a separate
// dub track (including an MKA/MKV container) must not become a movie source.
export function glorytoonDownloadsForItem(bundle, item) {
  if (bundle?.version !== 1 || contentRestriction(item) || /series|episode|show/i.test(item?.type || '')) return [];
  const patch = bundle.items?.[item?.imdbCode || item?.id];
  if (!patch || patch.year !== item.year || !Array.isArray(patch.downloads)) return [];
  const result = new Map();
  for (const link of patch.downloads) {
    if (!glorytoonUrl(link?.url, 'media') || !glorytoonUrl(link?.sourceUrl)
      || !['video', 'dub-audio', 'trailer'].includes(link.kind)
      || !['unverified', 'available', 'unavailable'].includes(link.availability)
      || !Number.isFinite(Date.parse(link.extractedAt)) || contentRestriction(link)) continue;
    result.set(link.url, link);
  }
  return [...result.values()];
}

export function mergeGlorytoonDownloads(base, incoming) {
  const items = { ...(base?.version === 1 ? base.items : {}) };
  if (incoming?.version !== 1 || !incoming.items) return { version: 1, items };
  for (const [id, patch] of Object.entries(incoming.items)) {
    if (!/^tt\d{5,12}$/.test(id) || !Number.isInteger(patch?.year)) continue;
    const links = new Map(glorytoonDownloadsForItem({ version: 1, items }, { imdbCode: id, year: patch.year }).map(link => [link.url, link]));
    for (const link of glorytoonDownloadsForItem(incoming, { imdbCode: id, year: patch.year })) {
      const previous = links.get(link.url);
      // Discovery is not a health check. Re-extracting a button must not erase
      // an earlier network result or manufacture a successful verification.
      links.set(link.url, previous && !link.checkedAt ? { ...link,
        availability: previous.availability, checkedAt: previous.checkedAt,
        failureReason: previous.failureReason, httpStatus: previous.httpStatus } : link);
    }
    items[id] = { ...items[id], ...patch, downloads: [...links.values()] };
  }
  return { version: 1, items };
}
