import { createHash } from 'node:crypto';
import { cleanText, decodeHtmlEntities, normalizeComparable, slugify, canonicalizeTrackArtists } from './music-catalog.mjs';

export const MELOOBIT_ROOT = 'https://meloobit.ir';
export const MELOOBIT_ARCHIVE = `${MELOOBIT_ROOT}/category/${encodeURIComponent('آهنگ')}/`;
export const MELOOBIT_DOWNLOAD_ROOT = 'https://sv2.mybia2music.com/s2/Music/';
const audio = /\.(mp3|m4a|aac|flac|ogg|wav)$/i;
const video = /\.(mp4|mkv|webm)$/i;
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map(m => [m[1].toLowerCase(), decodeHtmlEntities(m[3])]));
const tags = html => [...html.matchAll(/<(?:a|div|button|audio|source|video|img)\b[^>]*>/gi)].map(m => attrs(m[0]));
export function siteUrl(value, base = MELOOBIT_ROOT) {
  try {
    const u = new URL(decodeHtmlEntities(value), base);
    if (u.hostname !== 'meloobit.ir' || !['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.port) return null;
    u.protocol = 'https:'; u.hash = ''; u.search = '';
    return u.href;
  } catch { return null; }
}
export function downloadUrl(value, base = MELOOBIT_DOWNLOAD_ROOT) {
  try {
    if (/(?:^|\/)\.\.(?:\/|$)/.test(decodeURIComponent(value ?? ''))) return null;
    const u = new URL(decodeHtmlEntities(value), base);
    if (u.hostname !== 'sv2.mybia2music.com' || !['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.port
      || !u.pathname.startsWith('/s2/Music/') || /[\\\x00-\x1f]/.test(decodeURIComponent(u.pathname))) return null;
    u.protocol = 'https:'; u.hash = ''; u.search = '';
    u.pathname = u.pathname.split('/').map(p => encodeURIComponent(decodeURIComponent(p))).join('/');
    return u.href;
  } catch { return null; }
}
const filename = value => { try { return decodeURIComponent(new URL(value).pathname.split('/').at(-1)); } catch { return ''; } };
export function mediaIdentity(value) {
  return normalizeComparable(filename(value).replace(/\.(mp3|m4a|aac|flac|ogg|wav|mp4|mkv|webm)$/i, '')
    .replace(/\[(?:128|192|256|320)(?:\s*kbps)?\]/gi, '')
    .replace(/(?:\s|[._-])(?:128|192|256|320)\s*(?:kbps)?$/i, '')
    .replace(/(?:\s|[._-])(?:360|480|720|1080)(?:p)?$/i, ''));
}
const mediaKind = url => video.test(new URL(url).pathname) ? 'video' : audio.test(new URL(url).pathname) ? 'track' : null;
export function mediaSource(value, label = '') {
  const url = downloadUrl(value);
  if (!url || !mediaKind(url)) return null;
  const name = filename(url);
  const quality = (label.match(/\b(128|192|256|320|360|480|720|1080)\b/) ?? name.match(/(?:\[|\s|[._-])(128|192|256|320|360|480|720|1080)(?:p|\s*kbps)?(?:\]|\s|\.|$)/i))?.[1] ?? null;
  return { url, label: quality ? `${quality}${mediaKind(url) === 'video' ? 'p' : ' kbps'}` : 'کیفیت اصلی', quality,
    kind: 'download', provider: 'meloobit', basePath: new URL('.', url).href, available: false };
}
export function matchingIndexSources(html, directory, track) {
  const keys = new Set(track.sources.map(s => `${mediaKind(s.url)}:${mediaIdentity(s.url)}`));
  return tags(html).flatMap(a => {
    if (!a.href) return [];
    const s = mediaSource(downloadUrl(a.href, directory));
    return s && keys.has(`${mediaKind(s.url)}:${mediaIdentity(s.url)}`) ? [s] : [];
  });
}
const dateCache = new Map();
export function persianPublicationDate(text) {
  if (dateCache.has(text)) return dateCache.get(text);
  const months = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  const value = text.replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
  const m = value.match(/(\d{1,2})\s+(\S+)\s+(1[34]\d{2})/);
  if (!m || !months.includes(m[2]) || Number(m[1]) < 1 || Number(m[1]) > 31) return null;
  const month = months.indexOf(m[2]), day = Number(m[1]), year = Number(m[3]);
  const approximate = Date.UTC(year + 621, 2, 21, 12) + (month < 6 ? month * 31 : 186 + (month - 6) * 30) * 86400000 + (day - 1) * 86400000;
  const format = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
  let result = null;
  for (let offset = -3; offset <= 3; offset++) {
    const date = new Date(approximate + offset * 86400000);
    const p = Object.fromEntries(format.formatToParts(date).map(part => [part.type, part.value]));
    if (Number(p.year) === year && Number(p.month) === month + 1 && Number(p.day) === day) { result = date.toISOString().slice(0,10) + 'T00:00:00+03:30'; break; }
  }
  dateCache.set(text, result); return result;
}
function parseArticle(html, sourceUrl) {
  const elements = tags(html);
  const player = elements.find(t => t['data-song'] && t['data-artist']);
  if (!player) return null;
  const url = siteUrl(player['data-permalink'] || sourceUrl || elements.find(a => a.href && /title/.test(Object.keys(a).join(' ')))?.href);
  if (!url || /\/(category|tag|page|wp-)\//.test(new URL(url).pathname)) return null;
  const sourceMap = new Map();
  for (const a of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const source = mediaSource(attrs(a[1]).href, cleanText(a[2]));
    if (source) sourceMap.set(source.url, source);
  }
  for (const t of elements) for (const value of [t['data-music'], t.src]) {
    const s = mediaSource(value); if (s && !sourceMap.has(s.url)) sourceMap.set(s.url, s);
  }
  const primary = mediaSource(player['data-music']);
  const sources = [...sourceMap.values()].filter(s => !primary || mediaIdentity(s.url) === mediaIdentity(primary.url)).map(s => ({ ...s, sourcePageUrl: url }));
  if (!sources.length) return null;
  const english = mediaIdentity(sources[0].url);
  const file = filename(sources[0].url).replace(/\.[^.]+$/, '').replace(/\s*\[\d+\]/g, '').replace(/\s+(360|480|720|1080)p?$/, '');
  const credits = file.split(/\s+[–—-]\s+/);
  const englishArtist = credits.length > 1 ? credits.shift() : '';
  const title = credits.length && englishArtist ? credits.join(' - ') : cleanText(player['data-song']);
  const artistName = cleanText(player['data-artist']);
  const artistLink = elements.find(a => a.href && siteUrl(a.href)?.includes('/tag/') && decodeURIComponent(a.href).includes(slugify(artistName)));
  const artist = { name: artistName, slug: slugify(englishArtist || artistName), aliases: [slugify(artistName)], sourceUrl: siteUrl(artistLink?.href) || `${MELOOBIT_ROOT}/tag/${encodeURIComponent(slugify(artistName))}/` };
  const image = elements.find(a => a.src && a.src.includes('/wp-content/uploads/'));
  const date = cleanText(html.match(/<span[^>]*class=["'][^"']*graytxt2[^"']*["'][^>]*>([^<]+)<\/span>/i)?.[1] || '');
  const categories = [...html.matchAll(/<a\b([^>]*href=["'][^"']*\/category\/[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi)].map(m => cleanText(m[2])).filter(Boolean);
  const moods = categories.filter(c => c !== 'آهنگ');
  const persianTitle = cleanText(player['data-song']);
  if (/ریمیکس|remix/i.test(title + ' ' + persianTitle)) moods.push('ریمیکس');
  if (/میکس|رادیو|dj |mix|podcast/i.test(title + ' ' + persianTitle + ' ' + englishArtist)) moods.push('میکس و دی‌جی ست');
  const parts = decodeURIComponent(new URL(sources[0].url).pathname).split('/').filter(Boolean);
  const kind = sources.some(s => mediaKind(s.url) === 'video') ? 'video' : 'track';
  const track = { id: `meloobit-${createHash('sha1').update(decodeURIComponent(new URL(url).pathname)).digest('hex').slice(0,14)}`, kind, title, persianTitle,
    englishArtist, artist, artists: [artist], coverUrl: siteUrl(image?.src) || downloadUrl(player['data-cover']) || null,
    description: `${persianTitle} از ${artistName}؛ منبع: ملوبیت.`, sourceUrl: url, matchKey: english,
    publishedAt: persianPublicationDate(date), displayDate: date || null, category: kind === 'video' ? 'موزیک ویدیو' : 'موسیقی فارسی', moods: [...new Set(moods)],
    folder: { root: kind === 'video' ? 'Music Video' : 'Music', year: /^1[34]\d{2}$/.test(parts[2]) ? parts[2] : null, month: parts[3] || null, day: parts[4] || null }, sources: sources.filter(s => mediaKind(s.url) === kind) };
  return canonicalizeTrackArtists(track, url);
}
export function parseMeloobitListing(html, pageUrl = MELOOBIT_ROOT) {
  const articles = html.match(/<article\b[\s\S]*?<\/article>/gi) ?? [];
  // Promotional selections repeat on every page; don't mistake them for history.
  return articles.filter(a => !/^<article[^>]*class=["']post\s/i.test(a)).map(a => parseArticle(a, undefined)).filter(Boolean)
    .filter(t => siteUrl(t.sourceUrl, pageUrl));
}
export function parseMeloobitDetail(html, previous) {
  const article = (html.match(/<article\b[\s\S]*?<\/article>/gi) ?? []).find(a => /data-song=/.test(a));
  const parsed = article && parseArticle(article, previous.sourceUrl);
  if (!parsed || parsed.id !== previous.id) throw new Error('Detail does not match the requested song');
  const published = html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)/i)?.[1];
  return { ...previous, ...parsed, addedAt: previous.addedAt, publishedAt: published && Number.isFinite(Date.parse(published)) ? published : previous.publishedAt,
    sources: mergeSources(previous.sources, parsed.sources), detailCheckedAt: new Date().toISOString() };
}
export function parseMeloobitCollections(html) {
  const definitions = [{ id: 'meloobit-selected', title: 'منتخب ملوبیت', html: (html.match(/<article\b[^>]*class=["']post\s[\s\S]*?<\/article>/gi) ?? []).join('') }];
  for (const [key,title] of [['week','هفته'],['month','ماه'],['year','سال']]) {
    const block = html.match(new RegExp(`<ul\\b[^>]+id=["']${key}["'][^>]*>([\\s\\S]*?)<\\/ul>`, 'i'))?.[1];
    if (block) definitions.push({ id: `meloobit-${key}`, title: `محبوب‌های ${title} ملوبیت`, html: block });
  }
  return definitions.map(d => ({ id: d.id, title: d.title, sourceUrl: `${MELOOBIT_ROOT}/`, urls: [...new Set(tags(d.html).map(t => siteUrl(t['data-permalink'] || t.href)).filter(u => u && !/\/(tag|category|page)\//.test(u)))].slice(0,40) })).filter(d => d.urls.length);
}
export function mergeSources(previous = [], incoming = []) {
  const map = new Map(previous.map(s => [s.url,s]));
  for (const source of incoming) {
    const old = map.get(source.url);
    map.set(source.url, { ...old, ...source, ...(old?.checkedAt && !source.checkedAt ? { checkedAt: old.checkedAt, available: old.available } : {}) });
  }
  return [...map.values()];
}
function trackKeys(track) {
  const artists = [track.artist?.name, track.artist?.slug, ...(track.artist?.aliases ?? []), track.englishArtist].filter(Boolean);
  return [...new Set([track.matchKey, ...artists.flatMap(a => [track.title,track.persianTitle].map(t => `${a} ${t}`)),
    ...(track.sources ?? []).filter(s => /^https?:/.test(s.url)).map(s => mediaIdentity(s.url))].filter(Boolean).map(v => `${track.kind}:${normalizeComparable(v)}`))];
}
/** Exact complete artist+song identities only; never fuzzy-match a download. */
export function mergeMeloobitTracks(tracks, incoming, previous = tracks) {
  const result = new Map(tracks.map(t => [t.id, t]));
  const identities = new Map(tracks.flatMap(t => trackKeys(t).map(k => [k,t.id])));
  const previousIds = new Map(previous.flatMap(t => trackKeys(t).map(k => [k,t.id])));
  for (const track of incoming) {
    const keys = trackKeys(track), id = keys.map(k => identities.get(k)).find(Boolean);
    const old = id && result.get(id);
    if (!old && !track.sources?.some(s => s.available === true)) continue;
    const selectedId = old?.id || keys.map(k => previousIds.get(k)).find(Boolean) || track.id;
    const merged = old ? { ...old, sources: mergeSources(old.sources, track.sources.filter(s => s.checkedAt || s.available === true)),
      coverUrl: old.coverUrl || track.coverUrl, moods: [...new Set([...(old.moods ?? []), ...(track.moods ?? [])])], addedAt: old.addedAt || track.addedAt }
      : { ...track, id: selectedId, sources: track.sources.filter(s => s.available === true) };
    result.set(selectedId, merged);
    for (const key of [...keys, ...trackKeys(merged)]) identities.set(key, selectedId);
  }
  return [...result.values()];
}
export function meloobitPlaylists(tracks, collections = [], date = new Date()) {
  const usable = tracks.filter(t => t.sources?.some(s => s.provider === 'meloobit' && s.available !== false));
  const definitions = [{ id:'meloobit-new', title:'تازه‌های ملوبیت', items:usable.filter(t => t.kind === 'track').sort((a,b) => String(b.publishedAt ?? '').localeCompare(String(a.publishedAt ?? ''))).slice(0,60) },
    ...collections.map(c => ({ ...c, items:c.urls.flatMap(url => { const t=usable.find(t => t.sourceUrl === url || t.sources.some(s => s.provider === 'meloobit' && s.sourcePageUrl === url)); return t ? [t] : []; }) })),
    { id:'meloobit-mixes', title:'میکس و دی‌جی ست ملوبیت', items:usable.filter(t => t.moods?.includes('میکس و دی‌جی ست')).slice(0,100) }];
  return definitions.filter(d => d.items.length).map(d => ({ id:d.id, title:d.title, scope:'persian', mood:'meloobit', description: d.sourceUrl ? 'انتخاب‌های صفحهٔ اصلی ملوبیت؛ فقط نسخه‌های بررسی‌شدهٔ موجود در آرشیو.' : 'گلچین آرشیو ملوبیت با لینک مستقیم بررسی‌شده و پخش پیوسته.',
    trackIds:[...new Set(d.items.map(t => t.id))], covers:[...new Set(d.items.map(t => t.coverUrl).filter(Boolean))].slice(0,4), artistCount:new Set(d.items.map(t => t.artist.slug)).size, selection:'meloobit-source', updatedAt:date.toISOString() }));
}
