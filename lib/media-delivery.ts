import verifiedSourceBases from "./data/verified-source-bases.json";

/** Alternative delivery endpoints for an identical file, not other episodes or
 * invented download paths. Only the observed, bundled CDN mapping is allowed. */
export function mediaDeliveryRoutes(source?: { url: string } | null): string[] {
  if (!source?.url) return [];
  try {
    const url = new URL(source.url);
    if (url.username || url.password || !/\.(?:mkv|mp4|m4v|webm)$/i.test(url.pathname)) return [source.url];
    for (const repair of Object.values(verifiedSourceBases.bases)) {
      const bases = [repair.baseUrl, ...repair.replaces, ...repair.fallbackBases];
      const matched = bases.map(value => new URL(value)).find(base => base.origin === url.origin && url.pathname.startsWith(base.pathname));
      if (!matched) continue;
      const relative = url.pathname.slice(matched.pathname.length).replace(/^\/+/, "") + url.search;
      return [...new Set([source.url, ...repair.fallbackBases.map(base => new URL(relative, base).href)])];
    }
  } catch { /* Keep malformed/unregistered URLs unchanged; never guess a host. */ }
  return [source.url];
}
