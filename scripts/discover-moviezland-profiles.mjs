import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { writeJsonAtomic } from './atomic-json.mjs';
import { mediaUrl, directFileIdentity, exactPublisherPageMapping } from './lib/moviezland-direct.mjs';
import { contentRestriction } from '../lib/content-restrictions.mjs';

const input = process.argv[2];
if (!input) throw new Error('Pass the user-supplied movie_urls.txt');
let rateLimited = false;
let nextRequestAt = 0;
let requestQueue = Promise.resolve();
const pace = () => (requestQueue = requestQueue.then(async () => {
  const delay = Math.max(0, nextRequestAt - Date.now());
  if (delay) await new Promise(resolve => setTimeout(resolve, delay));
  nextRequestAt = Date.now() + 350;
}));
const files = new Map((await readFile(input, 'utf8')).split(/\r?\n/).map(mediaUrl).filter(Boolean).map(file => [file.url, file]));
const previous = JSON.parse(await readFile('.media-cache/vod-sync/moviezland-direct-report.json', 'utf8'));
const existingByUrl = new Map(previous.matches.map(row => [row.publisherFile, row.imdbCode]));
const catalog = JSON.parse(await readFile('public/data/vod-index.json', 'utf8')).items;
const mapping = JSON.parse(await readFile('lib/data/movielandz-donyaye-match.json', 'utf8')).matches;
const byPage = new Map(mapping.filter(exactPublisherPageMapping).map(row => [row.movieLandzPage.toLowerCase().replace(/\/$/, ''), row.imdbCode]));
const curated = (await Promise.all(['iranian', 'regional'].map(async group => JSON.parse(await readFile(`lib/data/moviezland-${group}-profiles.json`, 'utf8'))))).flat();
const known = new Map([...catalog, ...curated].map(item => [item.imdbCode || item.id, item]));
const normalize = value => String(value).normalize('NFKC').replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const xml = await fetchText('https://movielandz.com/sitemap.xml');
const maps = [...xml.matchAll(/<loc>([^<]+)/g)].map(match => match[1]).filter(url => /\/post-sitemap\d*\.xml$/.test(url));
const pages = new Set();
for (const map of maps) {
  const body = await fetchText(map);
  for (const [, raw] of body.matchAll(/<loc>([^<]+)/g)) {
    // Scope is the supplied media list; exact file anchors below are the join.
    // Inspect the complete post sitemap, not only English/transliterated slugs.
    pages.add(raw);
  }
}
let cache = {};
try { cache = JSON.parse(await readFile('.media-cache/vod-sync/moviezland-profile-discovery-cache.json', 'utf8')); } catch { /* First discovery. */ }
const profiles = [], rejected = [], failures = []; const urls = [...pages]; let cursor = 0, completed = 0;
let saves = Promise.resolve();
const checkpoint = () => (saves = saves.then(() => writeJsonAtomic('.media-cache/vod-sync/moviezland-profile-discovery-cache.json', cache)));
console.log(JSON.stringify({ selectedPages: urls.length, inputMedia: files.size }));
await Promise.all(Array.from({ length: 5 }, async () => {
  while (cursor < urls.length) {
    if (rateLimited) return;
    const page = urls[cursor++];
    try {
      if (cache[page]?.version !== 3) cache[page] = { ...await inspect(page), version: 3 };
      const result = cache[page];
      if (result.profile) profiles.push(result.profile); else rejected.push({ page, reason: result.reason });
    } catch (error) { failures.push({ page, error: error.message }); if (error.message.startsWith('HTTP 429')) rateLimited = true; }
    completed++;
    if (completed % 40 === 0) { console.log(JSON.stringify({ completed, total: urls.length, profiles: profiles.length, failures: failures.length })); await checkpoint(); }
  }
}));
await checkpoint();
const counts = new Map();
for (const profile of profiles) counts.set(profile.id, (counts.get(profile.id) || 0) + 1);
// Multiple publisher pages for one identity must be reviewed, not overwrite each other.
const unique = profiles.map(profile => ({ ...profile, persianTitle: profile.persianTitle.replace(/\s+زیرنویس$/u, '').trim() }))
  .filter(profile => counts.get(profile.id) === 1 && !/دانلود|کیفیت|رایگان|زیرنویس/u.test(profile.persianTitle));
const report = { generatedAt: new Date().toISOString(), selectedPages: urls.length, profiles: unique.length,
  rateLimited, remainingPages: urls.slice(cursor),
  ambiguousPages: profiles.filter(profile => counts.get(profile.id) > 1).map(profile => profile.sourcePageUrl), rejected, failures };
await writeJsonAtomic('lib/data/moviezland-publisher-profiles.json', unique);
await writeJsonAtomic('.media-cache/vod-sync/moviezland-profile-discovery-report.json', report);
console.log(JSON.stringify({ ...report, rejected: rejected.length, failures: failures.length }));

async function inspect(page) {
  const html = await fetchText(page);
  const rawTitle = meta(html, 'og:title');
  if (!rawTitle || /کالکشن|مجموعه فیلم|collection/i.test(rawTitle)) return { reason: 'No unambiguous single-work title' };
  const links = [...new Set([...html.matchAll(/href=["']([^"']+)["']/gi)].map(match => {
    try { return mediaUrl(new URL(match[1].replace(/&amp;/g, '&'), page).href)?.url; } catch { return null; }
  }).filter(url => url && files.has(url)))];
  if (!links.length) return { reason: 'No exact user-supplied full-file anchor on publisher page' };
  const type = /سریال/u.test(rawTitle) ? 'series' : 'movie';
  const identities = new Set(links.map(url => existingByUrl.get(url)).filter(Boolean));
  const mappedId = byPage.get(page.toLowerCase().replace(/\/$/, ''));
  if (mappedId) identities.add(mappedId);
  if (identities.size > 1) return { reason: 'Page links map to multiple catalog identities' };
  const title = clean(rawTitle).replace(/^دانلود\s+(?:فیلم|سریال|انیمیشن|انیمه|مستند)(?:\s+(?:ایرانی|ایران|هندی|ترکی|خارجی|جدید|قدیمی|سینمایی))*\s*/u, '')
    .replace(/\s*(?:دوبله فارسی|با لینک مستقیم|با کیفیت|با زیرنویس|زیرنویس فارسی|زیرنویس چسبیده|بدون سانسور|دانلود رایگان|رایگان).*$/u, '')
    .replace(/\b(?:19|20)\d{2}\b/g, '').replace(/[a-zA-Z][a-zA-Z0-9 :.,!?'’\-]*/g, '').replace(/\s+(?:نسخه\s+)?کامل$/u, '').trim();
  if (!/[آ-ی]{2}/u.test(title) || title.length < 2 || title.length > 110 || /^(?:دانلود|فیلم|سریال|انیمیشن|مستند)$/u.test(title)) return { reason: 'Persian title needs manual review' };
  const years = [...rawTitle.matchAll(/\b((?:19|20)\d{2})\b/g)].map(match => +match[1]);
  const year = years.length === 1 ? years[0] : null;
  const local = catalog.filter(item => normalize(item.persianTitle) === normalize(title) && item.type === type && year && item.year === year);
  if (!identities.size && local.length > 1) return { reason: 'Ambiguous existing Persian title/year' };
  const id = [...identities][0] || (local.length === 1 ? local[0].imdbCode : `moviezland-${createHash('sha256').update(page.toLowerCase()).digest('hex').slice(0, 14)}`);
  if (contentRestriction({ id, title, url: page })) return { reason: 'Restricted work' };
  const posterUrl = meta(html, 'og:image');
  if (!posterUrl || !/^https:\/\//i.test(posterUrl)) return { reason: 'No publisher poster' };
  // Existing curated entries already have higher-quality human-verified metadata.
  if (curated.some(profile => profile.id === id)) return { reason: 'Already researched explicitly' };
  const hasEpisode = links.some(url => directFileIdentity(files.get(url).fileName)?.season != null);
  const fileKeys = new Set(links.map(url => directFileIdentity(files.get(url).fileName)?.key).filter(Boolean));
  if (fileKeys.size > 1) return { reason: 'Multiple file-title identities on one page' };
  if (type === 'series' && !hasEpisode) return { reason: 'Series page only exposes non-episodic video (often a trailer)' };
  const image = await fetch(posterUrl, { headers: { Range: 'bytes=0-31' }, signal: AbortSignal.timeout(12000), redirect: 'error' });
  await image.body?.cancel();
  if (![200, 206].includes(image.status) || !/^image\//i.test(image.headers.get('content-type') || '')) return { reason: 'Poster not reachable as an image' };
  const old = known.get(id);
  const genre = /انیمیشن|انیمه/u.test(rawTitle) ? ['Animation'] : /مستند/u.test(rawTitle) ? ['Documentary'] : [];
  const countries = /ایرانی/u.test(rawTitle) || links.some(url => /\/(?:movies|serial)\/irani\//i.test(url)) ? ['Iran']
    : /هندی/u.test(rawTitle) || links.some(url => /\/hendi\//i.test(url)) ? ['India'] : /ترکی/u.test(rawTitle) ? ['Turkey'] : old?.countries || [];
  const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(match => clean(match[1].replace(/<[^>]*>/g, ' ')));
  const plot = paragraphs.find(text => /^خلاصه داستان\s*[:：]/u.test(text))?.replace(/^خلاصه داستان\s*[:：]\s*/u, '').split(/شما می توانید|مووی لند|دانلود فیلم/u)[0].trim();
  const director = paragraphs.find(text => /^کارگردان\s*[:：]/u.test(text))?.replace(/^کارگردان\s*[:：]\s*/u, '').trim();
  const cast = paragraphs.find(text => /^بازیگران\s*[:：]/u.test(text))?.replace(/^بازیگران\s*[:：]\s*/u, '').split(/\s*[،,]\s*/u).filter(name => name.length > 2 && name.length < 80).slice(0, 12);
  const latin = rawTitle.match(/[A-Za-z][A-Za-z0-9 :.,!?'’\-]+/)?.[0]?.replace(/\b(?:19|20)\d{2}\b/g, '').trim();
  return { profile: { id, title: old?.title || (latin && latin.length > 3 ? latin : title), persianTitle: title, type, year: old?.year || year,
    countries, languages: old?.languages || [], genres: old?.genres || genre,
    overview: plot ? plot.split(/\s+/u).slice(0, 65).join(' ') : old?.overview || `اطلاعات و نسخه‌های این اثر از صفحهٔ ناشر MovieLandz تطبیق داده شده‌اند. برای جزئیات بیشتر، صفحهٔ منبع را ببینید.`,
    ...(director && director.length < 120 ? { director } : {}), ...(cast?.length ? { cast } : {}),
    posterUrl, sourcePageUrl: page, metadataSources: [page], aliases: [], fileUrls: links,
    metadataNotes: 'Publisher-derived metadata, exact file URL evidence. No IMDb rating, cast or Gregorian year inferred when absent.' } };
}
function clean(text) { return text.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&#(?:x([a-f0-9]+)|(\d+));/gi, (_, hex, number) => String.fromCodePoint(parseInt(hex || number, hex ? 16 : 10))).replace(/\s+/g, ' ').trim(); }
function meta(html, key) {
  for (const [tag] of html.matchAll(/<meta\b[^>]+>/gi)) {
    if ((tag.match(/(?:property|name)=["']([^"']+)/i)?.[1] || '') !== key) continue;
    return clean(tag.match(/content=["']([^"']*)/i)?.[1] || '');
  }
  return null;
}
async function fetchText(url) {
  const parsed = new URL(url);
  if (parsed.hostname.toLowerCase() !== 'movielandz.com') throw new Error('Unapproved publisher host');
  await pace();
  if (rateLimited) throw new Error('Publisher paused after HTTP 429; retry later');
  const r = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const text = await r.text(); if (text.length > 2000000) throw new Error('Publisher response too large'); return text;
}
