export function isDonyayeSource(link) {
  return /donyaye[ _-]?serial|دنیای\s*سریال|(?:aparatchi-dlcenter|varzeshha3-uploader)\.top/i.test(
    `${link?.sourceProvider ?? ''} ${link?.url ?? ''} ${link?.sourceUrl ?? ''} ${link?.sourceOriginalUrl ?? ''}`);
}

export function sourceLinkExpiry(link) {
  try {
    const url = new URL(link.url);
    const seconds = Number(url.searchParams.get('expires') || url.searchParams.get('Expires'));
    const explicit = Date.parse(link.expiresAt);
    const values = [seconds > 0 ? seconds * 1000 : NaN, explicit].filter(Number.isFinite);
    return values.length ? Math.min(...values) : Infinity;
  } catch { return 0; }
}

export function alternativeMediaKey(link) {
  try {
    const url = new URL(link.url);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || isDonyayeSource(link)) return null;
    if (!/\.(?:mp4|mkv|m4v|webm|mov)(?:$)/i.test(url.pathname)
      && !(link.sourceProvider === 'moviezland' && /\.(?:avi|wmv)$/i.test(url.pathname))) return null;
    if (/(?:^|[._/ -])(?:trailer|teaser|preview|promo|clip)(?:[._/ -]|$)/i.test(url.pathname)
      || ['trailer', 'subtitle', 'archive'].includes(link.mediaKind)) return null;
    // Only this provider's documented rotating signatures are interchangeable.
    // Preserve all other query strings and file-name case.
    if (link.sourceProvider === 'familymovie' && sourceLinkExpiry(link) !== Infinity) {
      for (const key of ['md5', 'expires', 'Expires']) url.searchParams.delete(key);
    }
    return `${link.sourceProvider || ''}:${url.origin}${url.pathname}${url.search}:${link.season ?? ''}:${link.episode ?? ''}`;
  } catch { return null; }
}

export function validAlternativeLink(link) {
  return Boolean(alternativeMediaKey(link) && link.sourceUrl && Number.isFinite(Date.parse(link.verifiedAt)));
}

export function mergeAlternativeSourceUpdates(base, incoming) {
  const items = { ...(base?.version === 1 ? base.items : {}) };
  if (incoming?.version !== 1 || !incoming.items || typeof incoming.items !== 'object') return { version: 1, items };
  for (const [id, patch] of Object.entries(incoming.items)) {
    if (!/^(?:tt\d{5,12}|(?:moviezland|nfb|old-iranian)-[a-z0-9][a-z0-9-]{1,100})$/.test(id) || !Array.isArray(patch?.links)) continue;
    const links = new Map((items[id]?.links || []).map(link => [alternativeMediaKey(link), link]));
    for (const link of patch.links) {
      if (!validAlternativeLink(link)) continue;
      const key = alternativeMediaKey(link), previous = links.get(key);
      if (!previous || Date.parse(link.verifiedAt) >= Date.parse(previous.verifiedAt)) links.set(key, link);
    }
    items[id] = { links: [...links.values()] };
  }
  return { version: 1, items };
}

export function applyAlternativeSourceUpdates(item, updates, now = Date.now()) {
  const patch = updates?.version === 1 ? updates.items?.[item.imdbCode || item.id] : null;
  const links = new Map((item.links || []).map(link => [alternativeMediaKey(link) || link.url, link]));
  for (const link of patch?.links || []) {
    if (!validAlternativeLink(link) || sourceLinkExpiry(link) <= now + 60_000) continue;
    // Enrich opaque MP4 records with verified publisher episode metadata.
    if (link.season && link.episode) for (const [oldKey, old] of links) {
      if (old.url === link.url && (!old.season || !old.episode)) links.delete(oldKey);
    }
    const key = alternativeMediaKey(link);
    const previous = links.get(key);
    if (previous && sourceLinkExpiry(previous) > sourceLinkExpiry(link)) continue;
    if (previous && (Date.parse(previous.verifiedAt) || Date.parse(previous.modified) || 0) > Date.parse(link.verifiedAt)) continue;
    links.set(key, { ...previous, ...link });
  }
  // Never make an expired rotating token the preferred source. Original raw
  // records remain on disk, ready for a subsequent daily token refresh.
  const current = [...links.values()].filter(link => sourceLinkExpiry(link) > now + 60_000)
    .sort((a, b) => Number(b.sourceProvider === 'moviezland') - Number(a.sourceProvider === 'moviezland'));
  return { ...item, links: current,
    groups: [...new Set([...(item.groups || []), ...current.map(link => link.group).filter(Boolean)])],
    qualities: [...new Set([...(item.qualities || []), ...current.map(link => link.quality).filter(Boolean)])] };
}
