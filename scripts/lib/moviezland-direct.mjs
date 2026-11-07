import { fileIdentity, titleKey } from '../import-moviezland-links.mjs';
import { contentRestriction } from '../../lib/content-restrictions.mjs';
import { exactPublisherPageMapping } from '../../lib/moviezland-page-match.mjs';
export { exactPublisherPageMapping };

export function mediaUrl(raw) {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' || url.hostname !== 'dl.moviezland.ir' || url.username || url.password || url.port || url.search || url.hash) return null;
    const fileName = decodeURIComponent(url.pathname.split('/').at(-1));
    if (!/\.(?:mkv|mp4|m4v|webm|avi|wmv)$/i.test(fileName)) return null;
    if (/\/(?:anons|trailer|teaser|tizer)\//i.test(url.pathname) || /(?:^|[ ._-])(?:trailer|teaser|tizer|sample|promo|poshte[ ._-]*sahne)(?:[ ._-]|$)/i.test(fileName)) return null;
    return { url: url.href, fileName, directoryUrl: new URL('.', url).href };
  } catch { return null; }
}

export function directFileIdentity(name) {
  const identity = fileIdentity(name);
  if (identity) return identity;
  const episode = name.match(/^(.*?)[ ._-]+(?:E|EP|Episode)[ ._-]*(\d{1,3})(?=[ ._-]|$)/i);
  if (episode) return { key: titleKey(episode[1].replace(/[ ._-]+\d{3,4}p(?:[ ._-]+HD)?$/i, '')), season: 1, episode: +episode[2] };
  // Publisher-specific aliases are explicit; arbitrary trailing numbers aren't episodes.
  const char = name.match(/^(Char_Khooneh|Charkhone)_(\d{1,3})_/i);
  if (char) return { key: titleKey(char[1]), season: 1, episode: +char[2] };
  return null;
}

export function buildDirectPlan(text, catalog, mappings = [], profiles = []) {
  const byKey = new Map();
  const mapped = new Map(mappings.filter(exactPublisherPageMapping).map(item => [item.imdbCode, item]));
  const explicitFiles = new Map();
  for (const profile of profiles) for (const url of profile.fileUrls || []) {
    const entries = explicitFiles.get(url) || new Map();
    entries.set(profile.id, profile); explicitFiles.set(url, entries);
  }
  const all = new Map(catalog.map(item => [item.imdbCode || item.id, item]));
  for (const profile of profiles) {
    const id = profile.imdbCode || profile.id;
    all.set(id, { ...all.get(id), ...profile, imdbCode: id });
  }
  for (const item of all.values()) {
    if (contentRestriction(item)) continue;
    for (const title of [item.title, item.originalTitle, ...(item.aliases || [])].filter(Boolean)) {
      const key = titleKey(title); if (!key) continue;
      const candidates = byKey.get(key) || new Map();
      candidates.set(item.imdbCode || item.id, item); byKey.set(key, candidates);
    }
  }
  const candidates = [], unresolved = [], seen = new Set();
  let rejected = 0;
  for (const raw of text.split(/\r?\n/)) {
    const file = mediaUrl(raw); if (!file) { if (raw.trim()) rejected++; continue; }
    if (seen.has(file.url)) continue; seen.add(file.url);
    const identity = directFileIdentity(file.fileName);
    let matches = identity ? [...(byKey.get(identity.key)?.values() || [])].filter(item => identity.season != null
      ? /series/i.test(item.type) : !/series/i.test(item.type) && item.year === identity.year) : [];
    if (!identity) {
      // Missing-year films may only use a researched, explicit filename alias.
      const bare = file.fileName.replace(/\.(?:mkv|mp4|m4v|webm|avi|wmv)$/i, '').replace(/[ ._-]+(?:\d{3,4}p?|HD)(?:[ ._-].*)?$/i, '');
      const key = titleKey(bare);
      matches = profiles.filter(profile => !/series/i.test(profile.type) && (profile.aliases || []).some(alias => titleKey(alias) === key));
      matches = [...new Map(matches.map(item => [item.id, item])).values()];
    }
    const explicit = [...(explicitFiles.get(file.url)?.values() || [])];
    if (explicit.length) matches = explicit;
    if (matches.length !== 1 || (identity?.episode != null && identity.episode < 1)) {
      unresolved.push({ ...file, identity, reason: matches.length > 1 ? 'ambiguous-title-year' : 'identity-not-confirmed' }); continue;
    }
    const item = matches[0], id = item.imdbCode || item.id;
    if (contentRestriction(item)) continue;
    const quality = file.fileName.match(/(?:2160|1080|720|480|360)p/i)?.[0]?.toLowerCase() || null;
    const group = /dub|farsi/i.test(`${file.fileName} ${file.directoryUrl}`) ? 'Dubbed' : /hardsub/i.test(file.fileName) ? 'HardSub' : /softsub/i.test(file.fileName) ? 'SoftSub' : 'Original';
    const sourceUrl = mapped.get(id)?.movieLandzPage || (explicit.length ? item.sourcePageUrl : file.directoryUrl);
    candidates.push({ id, title: item.title, matchType: explicit.length ? 'exact-publisher-file-url' : identity?.season ? 'exact-title-episode' : identity ? 'exact-title-year' : 'researched-filename-alias',
      link: { ...file, sourceProvider: 'moviezland', sourceUrl, label: `${quality || 'Video'} / ${group} / MovieLandz`, quality, group,
        season: identity?.season ?? null, episode: identity?.episode ?? null, mediaKind: 'video' } });
  }
  return { candidates, unresolved, rejected, uniqueMediaFiles: seen.size };
}

export async function probeMedia(url, episode, fetcher = fetch) {
  const response = await fetcher(url, { headers: { Range: 'bytes=0-31' }, signal: AbortSignal.timeout(12000), redirect: 'error' });
  const reader = response.body?.getReader(); let prefix = Buffer.alloc(0);
  try {
    while (reader && prefix.length < 16) { const part = await reader.read(); if (part.done) break; prefix = Buffer.concat([prefix, Buffer.from(part.value).subarray(0, 32)]); }
  } finally { await reader?.cancel(); }
  if (![200, 206].includes(response.status)) throw new Error(`HTTP ${response.status}`);
  const hex = prefix.subarray(0, 4).toString('hex');
  const format = hex === '1a45dfa3' ? 'matroska' : prefix.toString('ascii', 4, 8) === 'ftyp' ? 'mp4'
    : prefix.toString('ascii', 0, 4) === 'RIFF' ? 'avi' : hex === '3026b275' ? 'wmv' : null;
  if (!format) throw new Error('Not a supported media file signature');
  const range = response.headers.get('content-range');
  const bytes = range ? Number(range.match(/\/(\d+)$/)?.[1]) : response.status === 200 ? Number(response.headers.get('content-length')) : 0;
  if (!Number.isFinite(bytes) || bytes < (episode ? 8 : 80) * 1024 ** 2) throw new Error('Missing or insufficient full media size');
  return { bytes, format, verifiedAt: new Date().toISOString() };
}
