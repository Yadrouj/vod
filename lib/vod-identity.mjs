import { createHash } from 'node:crypto';
import { alternativeMediaKey, sourceLinkExpiry } from './alternative-source-links.mjs';

export const vodIdentityId = item => String(item.imdbCode || item.id || '').toLowerCase();
export const normalizeVodIdentityType = value => /series|episode|show|tvmini|tvspecial/i.test(String(value || '')) ? 'series' : 'movie';
const textKey = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const unique = values => [...new Set(values.filter(value => value !== null && value !== undefined && value !== ''))];
const hash = value => createHash('sha256').update(value).digest('hex');
function imdbCodes(item) {
  let fromUrl = null;
  try {
    const url = new URL(item.imdbUrl);
    if (url.hostname === 'imdb.com' || url.hostname.endsWith('.imdb.com')) fromUrl = url.pathname.match(/^\/title\/(tt\d{5,12})(?:\/|$)/i)?.[1]?.toLowerCase();
  } catch { /* Missing or non-IMDb publisher URL. */ }
  return unique([item.imdbCode, item.id, fromUrl].filter(value => /^tt\d{5,12}$/i.test(value || '')).map(value => value.toLowerCase()));
}
const boilerplate = value => !value || /^(?:دانلود(?: فیلم| سریال| انیمیشن)?|فیلم|سریال|انیمیشن)$/u.test(String(value).trim()) || (String(value).match(/دانلود/g) || []).length >= 3;
const betterText = (first, second) => boilerplate(first) && !boilerplate(second) ? second : first || second;
const later = (a, b) => (Date.parse(b || '') || 0) > (Date.parse(a || '') || 0) ? b : a;

function pageKey(value) {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
    if (url.pathname === '/' && !['movie', 'id', 'media'].some(key => url.searchParams.has(key))) return null;
    if (/(?:all[_-]?archive|sitemap|\/(?:category|tag|genre|browse|search)\/|\/(?:movies|series|serial)\/?$)/i.test(url.pathname)) return null;
    url.hash = ''; url.searchParams.sort();
    // In particular, preserve FamilyMovie's ?movie= identity parameter.
    return `${url.origin.toLowerCase()}${url.pathname.replace(/\/+$/, '') || '/'}${url.search}`;
  } catch { return null; }
}

function mediaKey(link) {
  if (['trailer', 'subtitle', 'archive'].includes(link.mediaKind) || /(?:^|[._/ -])(?:trailer|teaser|preview|promo|clip)(?:[._/ -]|$)/i.test(link.url || '')) return null;
  try {
    const url = new URL(link.url);
    if (!/^https?:$/.test(url.protocol) || !/\.(?:mkv|mp4|m4v|webm|avi)$/i.test(url.pathname)) return null;
    return hash(alternativeMediaKey(link) || `${url.href}:${link.season ?? ''}:${link.episode ?? ''}`);
  } catch { return null; }
}

/** Compact evidence for a streaming audit: no direct media URLs retained. */
export function vodIdentityDescriptor(item) {
  const codes = imdbCodes(item);
  const tmdb = Number.isSafeInteger(Number(item.tmdbId)) && Number(item.tmdbId) > 0
    ? `${item.tmdbType || (normalizeVodIdentityType(item.type) === 'series' ? 'tv' : 'movie')}:${item.tmdbId}` : null;
  return {
    id: vodIdentityId(item), title: item.title, titles: unique([item.title, item.originalTitle].filter(title => !boilerplate(title))), type: normalizeVodIdentityType(item.type), year: item.year ?? null,
    imdb: codes[0] || null, imdbCodes: codes, tmdb, tmdbCodes: tmdb ? [tmdb] : [],
    aliases: unique([item.id, item.imdbCode].filter(value => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,179}$/i.test(value))).map(value => value.toLowerCase()),
    pages: unique([item.sourcePageUrl, item.f2myPageUrl, item.movieshoPageUrl, ...(item.curatedSourcePages || [])].map(pageKey)),
    media: unique((item.links || []).map(mediaKey)),
    linkKeys: unique((item.links || []).map(link => hash(alternativeMediaKey(link) || link.url))),
    linksCount: item.links?.length || 0,
  };
}

export function compatibleVodIdentity(a, b) {
  if ((a.imdbCodes?.length || 0) > 1 || (b.imdbCodes?.length || 0) > 1 || (a.tmdbCodes?.length || 0) > 1 || (b.tmdbCodes?.length || 0) > 1) return false;
  if (a.imdb && b.imdb && a.imdb !== b.imdb) return false;
  if (a.tmdb && b.tmdb && a.tmdb !== b.tmdb) return false;
  const titles = new Set((a.titles || [a.title]).map(textKey).filter(title => title.length > 1));
  return a.type === b.type && a.year != null && a.year === b.year && (b.titles || [b.title]).some(title => titles.has(textKey(title)));
}

export function vodIdentityEvidence(a, b) {
  if (a.id === b.id) return { kind: 'same-id' };
  if (!compatibleVodIdentity(a, b)) return null;
  if (a.imdb && a.imdb === b.imdb) return { kind: 'imdb', value: a.imdb };
  if (a.tmdb && a.tmdb === b.tmdb) return { kind: 'tmdb', value: a.tmdb };
  const page = a.pages.find(value => b.pages.includes(value));
  if (page) return { kind: 'publisher-page', value: page };
  const media = new Set(b.media);
  if (a.media.some(value => media.has(value))) return { kind: 'exact-media' };
  return null; // Similar spelling, title/year alone and shared artwork are insufficient.
}

export function planVodIdentities(descriptors, previous = { groups: [] }) {
  const byId = new Map();
  for (const descriptor of descriptors) {
    if (!descriptor.id) continue;
    const prior = byId.get(descriptor.id);
    byId.set(descriptor.id, prior ? { ...(descriptor.linksCount > prior.linksCount ? descriptor : prior), records: prior.records + 1,
      aliases: unique([...prior.aliases, ...descriptor.aliases]), titles: unique([...prior.titles, ...descriptor.titles]), pages: unique([...prior.pages, ...descriptor.pages]),
      imdbCodes: unique([...prior.imdbCodes, ...descriptor.imdbCodes]), tmdbCodes: unique([...prior.tmdbCodes, ...descriptor.tmdbCodes]),
      media: unique([...prior.media, ...descriptor.media]), linkKeys: unique([...prior.linkKeys, ...descriptor.linkKeys]) } : { ...descriptor, records: 1 });
  }
  const items = [...byId.values()];
  const parent = items.map((_, position) => position);
  const members = new Map(items.map((_, position) => [position, [position]]));
  const evidence = [];
  const root = position => { while (parent[position] !== position) position = parent[position]; return position; };
  const buckets = new Map();
  for (const [position, item] of items.entries()) {
    for (const title of new Set(item.titles.map(textKey))) {
      const key = `${title}\0${item.year}\0${item.type}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(position);
    }
  }
  let unresolved = 0;
  const compared = new Set();
  for (const bucket of buckets.values()) for (let i = 0; i < bucket.length; i++) for (let j = i + 1; j < bucket.length; j++) {
    const a = bucket[i], b = bucket[j];
    const pair = `${a}:${b}`;
    if (compared.has(pair)) continue;
    compared.add(pair);
    const proof = vodIdentityEvidence(items[a], items[b]);
    if (!proof) { unresolved++; continue; }
    const ra = root(a), rb = root(b);
    if (ra === rb) continue;
    // No transitive bridge through an unidentified record may collapse conflicting IDs.
    if (!members.get(ra).every(left => members.get(rb).every(right => compatibleVodIdentity(items[left], items[right])))) continue;
    parent[rb] = ra;
    members.set(ra, [...members.get(ra), ...members.get(rb)]); members.delete(rb);
    evidence.push({ from: items[a].id, to: items[b].id, ...proof });
  }
  const priorIds = new Set(previous.groups.map(group => group.canonicalId));
  const groups = [];
  for (const positions of members.values()) {
    const records = positions.reduce((sum, position) => sum + items[position].records, 0);
    if (records < 2) continue;
    const ordered = positions.map(position => items[position]).sort((a, b) => Number(/^tt\d+$/.test(b.id)) - Number(/^tt\d+$/.test(a.id))
      || Number(priorIds.has(b.id)) - Number(priorIds.has(a.id)) || b.linksCount - a.linksCount || a.id.localeCompare(b.id));
    const canonical = ordered[0];
    const ids = new Set(ordered.map(item => item.id));
    groups.push({ canonicalId: canonical.id, memberIds: [...ids], aliases: unique(ordered.flatMap(item => item.aliases)),
      title: canonical.title, type: canonical.type, year: canonical.year, recordCount: records,
      linksCount: new Set(ordered.flatMap(item => item.linkKeys)).size,
      fullLengthLinksCount: new Set(ordered.flatMap(item => item.media)).size,
      evidence: evidence.filter(proof => ids.has(proof.from) && ids.has(proof.to)) });
  }
  groups.sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));
  return { version: 1, generatedAt: new Date().toISOString(), rawTitles: descriptors.length,
    canonicalTitles: byId.size - groups.reduce((sum, group) => sum + group.memberIds.length - 1, 0), unresolvedPairs: unresolved, groups };
}

/** @param {{groups: Array<{canonicalId: string, memberIds: string[], aliases?: string[], recordCount?: number, linksCount?: number, fullLengthLinksCount?: number}>, rawTitles?: number, canonicalTitles?: number}} manifest */
export function createVodIdentityRegistry(manifest) {
  const byId = new Map();
  for (const group of manifest.groups) {
    if (!group.memberIds.includes(group.canonicalId)) continue;
    for (const id of unique([...group.memberIds, ...(group.aliases || [])])) {
      const old = byId.get(id);
      if (old && old.canonicalId !== group.canonicalId) { byId.set(id, null); continue; }
      if (old === null) continue;
      byId.set(id, group);
    }
  }
  return { manifest, group: id => byId.get(String(id).toLowerCase()) || null,
    canonicalId: id => byId.get(String(id).toLowerCase())?.canonicalId || id };
}

function mergeLinks(first, second) {
  const links = new Map();
  for (const link of [...first, ...second]) {
    const key = alternativeMediaKey(link) || link.url;
    const old = links.get(key);
    if (!old) { links.set(key, link); continue; }
    const preferred = sourceLinkExpiry(link) > sourceLinkExpiry(old) ? link : old;
    const extra = preferred === old ? link : old;
    links.set(key, { ...extra, ...preferred, subtitleUrl: preferred.subtitleUrl || extra.subtitleUrl,
      subtitles: [...new Map([...(old.subtitles || []), ...(link.subtitles || [])].map(subtitle => [subtitle.url, subtitle])).values()] });
  }
  return [...links.values()];
}

/** @param {import('./types').VodItem} primary @param {import('./types').VodItem} donor @returns {import('./types').VodItem} */
export function mergeVodDuplicateItems(primary, donor) {
  const rejected = new Set([...(primary.unavailableDownloadLinks || []), ...(donor.unavailableDownloadLinks || [])]
    .filter(link => [404, 410].includes(link.verification?.status) || /html/i.test(link.verification?.contentType || '')).map(link => link.url));
  const links = mergeLinks(primary.links || [], donor.links || []).filter(link => !rejected.has(link.url));
  const merged = { ...donor, ...primary, links };
  for (const field of ['title', 'persianTitle', 'overview', 'persianOverview', 'persianDescription']) merged[field] = betterText(primary[field], donor[field]);
  for (const field of ['posterUrl', 'backdropUrl', 'logoUrl', 'imdbRating', 'imdbVotes', 'runtimeMinutes', 'imdbUrl', 'tmdbId', 'tmdbType', 'publisherPlayer']) merged[field] = primary[field] ?? donor[field];
  for (const field of ['genres', 'countries', 'languages', 'persianGenres', 'persianCountries', 'persianLanguages']) merged[field] = unique([...(primary[field] || []), ...(donor[field] || [])]);
  for (const field of ['sourceDirectoryLinks', 'f2myExtraLinks']) if (primary[field] || donor[field]) merged[field] = mergeLinks(primary[field] || [], donor[field] || []);
  for (const [field, id] of [['credits', 'name_id'], ['imdbImages', 'url'], ['movieshoImages', 'url'], ['imdbVideos', 'video_id'], ['youtubeVideos', 'videoId']]) {
    if (primary[field] || donor[field]) merged[field] = [...new Map([...(donor[field] || []), ...(primary[field] || [])].map(value => [`${value[id] || JSON.stringify(value)}:${value.category || ''}`, value])).values()];
  }
  merged.curatedSourcePages = unique([...(primary.curatedSourcePages || []), ...(donor.curatedSourcePages || []), primary.sourcePageUrl, donor.sourcePageUrl]);
  merged.groups = unique([...(primary.groups || []), ...(donor.groups || []), ...links.map(link => link.group)]);
  merged.qualities = unique([...(primary.qualities || []), ...(donor.qualities || []), ...links.map(link => link.quality)]);
  merged.sourceUpdatedAt = later(primary.sourceUpdatedAt, donor.sourceUpdatedAt);
  merged.catalogUpdatedAt = later(primary.catalogUpdatedAt, donor.catalogUpdatedAt);
  // Never erase explicitly rejected sources/history when a duplicate is collapsed.
  for (const field of ['unavailableDownloadLinks', 'sourceLinkHistory']) if (primary[field] || donor[field]) merged[field] = [...new Map([...(primary[field] || []), ...(donor[field] || [])].map(link => [link.url, link])).values()];
  return merged;
}

/** @param {import('./types').VodCard[]} cards @param {ReturnType<typeof createVodIdentityRegistry>} registry @returns {import('./types').VodCard[]} */
export function dedupeVodCards(cards, registry) {
  const result = new Map();
  for (const card of cards) {
    const id = registry.canonicalId(vodIdentityId(card));
    const previous = result.get(id);
    const primary = vodIdentityId(card) === id || !previous ? card : previous;
    const donor = primary === card ? previous : card;
    const group = registry.group(id);
    const merged = { ...primary, id, imdbCode: id };
    if (donor) {
      for (const field of ['title', 'persianTitle', 'overview', 'persianOverview']) merged[field] = betterText(primary[field], donor[field]);
      for (const field of ['posterUrl', 'backdropUrl', 'imdbRating', 'imdbVotes', 'runtimeMinutes']) merged[field] = primary[field] ?? donor[field];
      for (const field of ['genres', 'countries', 'languages', 'qualities', 'groups', 'persianGenres', 'persianCountries', 'persianLanguages']) merged[field] = unique([...(primary[field] || []), ...(donor[field] || [])]);
    }
    merged.linksCount = Math.max(primary.linksCount || 0, donor?.linksCount || 0, group?.linksCount || 0);
    if (primary.fullLengthLinksCount !== undefined || donor?.fullLengthLinksCount !== undefined || group?.fullLengthLinksCount !== undefined) merged.fullLengthLinksCount = Math.max(primary.fullLengthLinksCount || 0, donor?.fullLengthLinksCount || 0, group?.fullLengthLinksCount || 0);
    result.set(id, merged);
  }
  return [...result.values()];
}
