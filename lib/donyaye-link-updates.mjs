const HOST = /^dls\d*\.(?:aparatchi-dlcenter|varzeshha3-uploader)\.top$/i;
const VIDEO = /\.(?:mkv|mp4|m4v|avi|webm|mov|wmv|ts)$/i;

export function donyayeLinkKey(value) {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || !HOST.test(url.hostname)) return null;
    const marker = url.pathname.toLowerCase().indexOf('/donyayeserial/');
    if (marker < 0 || !VIDEO.test(url.pathname)) return null;
    // Preserve file-name case and query strings; neither is interchangeable.
    return decodeURI(url.pathname.slice(marker)).normalize('NFC') + url.search;
  } catch { return null; }
}

export function validDonyayeUpdate(link, itemId) {
  const key = donyayeLinkKey(link?.url);
  return Boolean(key && key.includes(`/${itemId}/`) && link.verifiedAt && Number.isFinite(Date.parse(link.verifiedAt)));
}

export function mergeDonyayeUpdateSets(base, incoming) {
  if (incoming?.version !== 1 || !incoming.items || typeof incoming.items !== 'object') return base;
  const items = { ...(base?.items || {}) };
  for (const [id, patch] of Object.entries(incoming.items)) {
    if (!/^tt\d{5,12}$/.test(id) || !patch || typeof patch !== 'object') continue;
    const previous = items[id] || {};
    const links = new Map((previous.links || []).map(link => [donyayeLinkKey(link.url), link]));
    for (const link of patch.links || []) if (validDonyayeUpdate(link, id)) links.set(donyayeLinkKey(link.url), link);
    const replacements = new Map((previous.replacements || []).map(row => [row.fromUrl, row]));
    for (const row of patch.replacements || []) {
      if (validDonyayeUpdate(row.link, id) && donyayeLinkKey(row.fromUrl) === donyayeLinkKey(row.link.url)) replacements.set(row.fromUrl, row);
    }
    const checks = new Map((previous.checks || []).map(row => [row.url, row]));
    for (const row of patch.checks || []) {
      if (donyayeLinkKey(row.url) && ['missing', 'verified'].includes(row.state)
        && Number.isFinite(Date.parse(row.checkedAt))) {
        const old = checks.get(row.url);
        if (!old || Date.parse(row.checkedAt) >= Date.parse(old.checkedAt)) checks.set(row.url, row);
      }
    }
    items[id] = { links: [...links.values()], replacements: [...replacements.values()], checks: [...checks.values()] };
  }
  return { version: 1, checkedAt: incoming.checkedAt || base?.checkedAt || null, items };
}

export function applyDonyayeLinkUpdates(item, updates, now = Date.now()) {
  const id = item?.imdbCode || item?.id;
  const patch = updates?.version === 1 ? updates.items?.[id] : null;
  if (!patch || !Array.isArray(item.links)) return item;
  const replacements = new Map((patch.replacements || []).filter(row => validDonyayeUpdate(row.link, id)
    && donyayeLinkKey(row.fromUrl) === donyayeLinkKey(row.link.url)).map(row => [row.fromUrl, row.link]));
  const rewrite = link => {
    const replacement = replacements.get(link.url);
    return replacement ? { ...link, ...replacement, sourceOriginalUrl: link.sourceOriginalUrl || link.url } : link;
  };
  // Quarantine confirmed 404s temporarily; keep original catalog data intact.
  // Nightly verification can restore them. 403/timeouts never create a ban.
  const missing = new Set((patch.checks || []).filter(row => row.state === 'missing' && donyayeLinkKey(row.url)
    && now >= Date.parse(row.checkedAt) && now - Date.parse(row.checkedAt) < 7 * 86400000).map(row => row.url));
  const links = item.links.map(rewrite).filter(link => !missing.has(link.url));
  const extras = item.f2myExtraLinks?.map(rewrite).filter(link => !missing.has(link.url));
  const identities = new Set([...links, ...(extras || [])].map(link => donyayeLinkKey(link.url)).filter(Boolean));
  for (const link of patch.links || []) {
    if (!validDonyayeUpdate(link, id)) continue;
    const key = donyayeLinkKey(link.url);
    // Later source refreshes win: an addition must not overwrite their host.
    if (identities.has(key) || missing.has(link.url)) continue;
    links.push({ ...link }); identities.add(key);
  }
  return { ...item, links, ...(extras ? { f2myExtraLinks: extras } : {}),
    groups: [...new Set([...(item.groups || []), ...links.map(link => link.group).filter(Boolean)])],
    qualities: [...new Set([...(item.qualities || []), ...links.map(link => link.quality).filter(Boolean)])] };
}

export function resolveDonyayeDownloadUrl(url, updates, now = Date.now()) {
  if (!donyayeLinkKey(url) || updates?.version !== 1) return url;
  const id = /\/(tt\d{5,12})\//i.exec(new URL(url).pathname)?.[1];
  const entries = id ? [[id, updates.items?.[id]]] : Object.entries(updates.items || {});
  for (const [itemId, patch] of entries) {
    if (!patch) continue;
    const replacement = (patch.replacements || []).find(row => row.fromUrl === url && validDonyayeUpdate(row.link, itemId)
      && donyayeLinkKey(row.link.url) === donyayeLinkKey(url));
    if (replacement) return replacement.link.url;
    if ((patch.checks || []).some(row => row.url === url && row.state === 'missing'
      && now >= Date.parse(row.checkedAt) && now - Date.parse(row.checkedAt) < 7 * 86400000)) return null;
  }
  return url;
}
