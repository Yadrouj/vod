import { isVideoFile } from "./moviesho-source-lib.mjs";

export function isDirectVideoCandidate(value) {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return false;
    const file = decodeURIComponent(url.pathname);
    if (/(?:^|[\/_. -])(?:trailers?|teasers?|promos?|previews?)(?:[\/_. -]|$)/i.test(file)) return false;
    // A format=mp4 query does not turn an HTML application page into a file.
    return isVideoFile(file) || /\.m3u8$/i.test(file);
  } catch { return false; }
}

export function isExternalDownloadPage(value) {
  try {
    const url = new URL(value);
    return /(?:^|\.)gapfilm\.ir$/i.test(url.hostname) && /\/download\//i.test(url.pathname) && !isDirectVideoCandidate(value);
  } catch { return false; }
}

export function separateExternalDownloadPages(item, verified = new Map()) {
  const external = new Map((item.externalDownloadPages || []).map(link => [link.url, link]));
  const unavailable = new Map((item.unavailableDownloadLinks || []).map(link => [link.url, link]));
  const links = [];
  let moved = 0;
  let rejected = 0;
  for (const link of item.links || []) {
    if (isExternalDownloadPage(link.url)) { external.set(link.url, link); moved++; }
    else {
      const check = verified.get(link.url);
      if (check && (/html/i.test(check.contentType || "") || [404,410].includes(check.status))) {
        unavailable.set(link.url, { ...link, verification: check }); rejected++;
      } else links.push(link);
    }
  }
  if (!moved && !rejected) return { item, moved, rejected };
  return { item: { ...item, links, groups: [...new Set(links.map(link => link.group).filter(Boolean))], qualities: [...new Set(links.map(link => link.quality).filter(Boolean))],
    ...(external.size ? { externalDownloadPages: [...external.values()] } : {}),
    ...(unavailable.size ? { unavailableDownloadLinks: [...unavailable.values()] } : {}) }, moved, rejected };
}
