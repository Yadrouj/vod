import { decodeHtmlEntities, plainText } from './moviesho-source-lib.mjs';
import { glorytoonUrl } from '../lib/glorytoon-downloads.mjs';

const safeDecode = value => { try { return decodeURIComponent(value); } catch { return value; } };
const digits = value => String(value).replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
const quality = value => /(?:^|[^\d])(2160|1440|1080|720|576|480|360)\s*p?(?!\d)/i.exec(digits(value))?.[1];

export function htmlAnchors(html) {
  const clean = String(html).replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  return [...clean.matchAll(/<a\b([^>]*?)>([\s\S]*?)<\/a\s*>/gi)].map(([, raw, body]) => {
    const attributes = {};
    for (const [, key, double, single, bare] of raw.matchAll(/([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attributes[key.toLowerCase()] = decodeHtmlEntities(double ?? single ?? bare ?? '');
    return { attributes, text: plainText(body) };
  });
}

export function parseGlorytoonDownloads(html, pageUrl, { now = Date.now(), evidence = 'public-anchor' } = {}) {
  const sourceUrl = glorytoonUrl(pageUrl);
  if (!sourceUrl || /cf-chl-|just a moment|attention required|challenge-platform/i.test(html)) return [];
  const links = new Map();
  for (const { attributes, text } of htmlAnchors(html)) {
    if (!Object.hasOwn(attributes, 'download') && !/دانلود|download/i.test(text)) continue;
    const url = glorytoonUrl(attributes.href, 'media', sourceUrl);
    if (!url) continue;
    const fileName = safeDecode(new URL(url).pathname.split('/').at(-1) || '');
    const hint = `${text} ${attributes['data-bs-original-title'] || ''} ${attributes.title || ''}`;
    const trailer = /تریلر|تیزر|trailer|teaser|preview|promo/i.test(`${hint} ${fileName}`);
    const audio = /صوت|audio|sound/i.test(hint)
      || /(?:^|[._ -])(?:PersianSound|FarsiSound|Sound|Audio|DubOnly)(?:[._ -]|$)/i.test(fileName);
    const videoExtension = /\.(?:mkv|mp4|m4v|webm|mov|avi)$/i.test(fileName);
    const audioExtension = /\.(?:mp3|m4a|aac|ac3|dts|mka|flac|ogg|opus|wav)$/i.test(fileName);
    if (!videoExtension && !audioExtension && !(audio && /\.(?:zip|rar|7z)$/i.test(fileName))) continue;
    const kind = trailer ? 'trailer' : audio || audioExtension ? 'dub-audio' : 'video';
    // Do not read the parent folder: Emperor's 1080p file lives in a 720p folder.
    const resolution = kind === 'dub-audio' ? null : quality(fileName) || quality(text) || null;
    const size = /\b[\d.]+\s*(?:GB|MB|KB|GiB|MiB)\b/i.exec(digits(hint))?.[0] || null;
    links.set(url, { url, sourceUrl, fileName, kind, label: text || (kind === 'dub-audio' ? 'صوت دوبله فارسی' : 'دانلود'),
      quality: resolution ? `${resolution}p` : null, size, extractedAt: new Date(now).toISOString(), evidence, availability: 'unverified' });
  }
  return [...links.values()];
}

export function glorytoonCrawlUrl(value, pageUrl = 'https://glorytoon.com/') {
  const address = glorytoonUrl(value, 'page', pageUrl);
  if (!address) return null;
  const url = new URL(address);
  if (url.search || /\.[a-z\d]{2,5}$/i.test(url.pathname)) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (!parts.length) return null;
  const listing = /^(category|genre|page)$/.test(parts[0]);
  const post = parts.length === 1 && !/^(?:login|register|support|donate|rules|contact|about|account|notification|playonline|wp-admin|wp-json|feed|boxoffice|request|search|dmca)$/i.test(parts[0]);
  return listing || post ? address : null;
}

export function discoverGlorytoonPages(html, pageUrl) {
  return [...new Set(htmlAnchors(html).map(({ attributes }) => glorytoonCrawlUrl(attributes.href, pageUrl)).filter(Boolean))];
}

export function matchGlorytoonTitle(html, indexItems) {
  const main = String(html).split(/<(?:aside|footer)\b|class=["'][^"']*(?:related-post|related-movie|suggested)/i)[0];
  const ids = [...new Set([...main.matchAll(/(?:imdb\.com\/title\/)(tt\d{5,12})/gi)].map(match => match[1]))];
  if (ids.length === 1) return indexItems.find(item => (item.imdbCode || item.id) === ids[0] && !/series|episode|show/i.test(item.type || '')) || null;
  if (ids.length) return null;
  const heading = plainText(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(main)?.[1] || '');
  const year = /\b((?:19|20)\d{2})\b/.exec(digits(heading))?.[1];
  if (!year) return null;
  const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const names = heading.replace(new RegExp(`\\(?${year}\\)?`), '').split(/\s+[–—-]\s+/).map(normalize);
  const matches = indexItems.filter(item => item.year === Number(year) && !/series|episode|show/i.test(item.type || '')
    && [item.title, item.originalTitle, item.persianTitle].some(name => name && names.includes(normalize(name))));
  return matches.length === 1 ? matches[0] : null;
}

export async function verifyGlorytoonDownload(link, { fetcher = fetch, now = Date.now(), signal } = {}) {
  if (!glorytoonUrl(link.url, 'media')) throw new Error('Unsupported download host');
  const checked = { ...link, checkedAt: new Date(now).toISOString(), httpStatus: null, failureReason: null };
  try {
    const response = await fetcher(link.url, { redirect: 'manual', headers: { Range: 'bytes=0-1023', 'User-Agent': 'SarvNemaCatalogBot/1.0 (+https://sarvnema.ir)' }, signal });
    checked.httpStatus = response.status;
    if (![200, 206].includes(response.status)) {
      await response.body?.cancel();
      return { ...checked, availability: [404, 410].includes(response.status) ? 'unavailable' : 'unverified', failureReason: `HTTP ${response.status}` };
    }
    const reader = response.body?.getReader();
    const bytes = new Uint8Array(1024);
    let length = 0;
    try {
      while (reader && length < bytes.length) {
        const chunk = await reader.read(); if (chunk.done) break;
        const take = chunk.value.subarray(0, bytes.length - length); bytes.set(take, length); length += take.length;
      }
    } finally { await reader?.cancel(); }
    const text = new TextDecoder().decode(bytes.subarray(0, length));
    const binary = length >= 8 && (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
      || text.slice(4, 8) === 'ftyp' || text.startsWith('ID3') || bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0
      || /^(?:RIFF|fLaC|OggS)/.test(text) || bytes[0] === 0x0b && bytes[1] === 0x77);
    return { ...checked, availability: binary ? 'available' : 'unverified', failureReason: binary ? null : 'Response is not a recognized media header' };
  } catch (error) {
    return { ...checked, availability: 'unverified', failureReason: error.cause?.code || error.code || error.message };
  }
}
