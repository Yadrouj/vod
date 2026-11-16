import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { writeJsonAtomic } from './atomic-json.mjs';

export const ARTIST_PAGE = 'https://tiarin.ir/artist/susan-roshan/';
export const BUNDLE_FILE = 'lib/data/tiarin-susan-roshan.json';
const artistName = 'سوزان روشن';
const aliases = ['Susan Roshan', 'susan-roshan', 'سوزان روشن', 'سوزان-روشن'];
const key = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[^\p{L}\p{N}]+/gu, '');
const artistKeys = new Set(aliases.map(key));
const sameArtist = ref => ref && [ref.name, ref.slug, ...(ref.aliases ?? [])].some(value => artistKeys.has(key(value)));
const isArtistTrack = track => (track.artists ?? [track.artist]).some(sameArtist);
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 16);
const decode = value => String(value ?? '').replace(/&(?:amp|quot|apos|lt|gt|#(\d+)|#x([a-f\d]+));/gi, (entity, decimal, hex) => {
  const number = decimal ? Number(decimal) : hex ? parseInt(hex, 16) : null;
  if (number !== null) return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '';
  return ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' })[entity.toLowerCase()] ?? entity;
});
const attributes = tag => Object.fromEntries([...tag.matchAll(/\b([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1].toLowerCase(), decode(match[2] ?? match[3])]));
const text = html => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

function trustedUrl(value, host, pathPattern) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === host && !url.username && !url.password && !url.port && !url.search && !url.hash && pathPattern.test(url.pathname) ? url.href : null;
  } catch { return null; }
}
const releaseUrl = value => trustedUrl(value, 'tiarin.ir', /^\/(?:album|single)\/\d+\/$/);
export const publicAudioUrl = value => trustedUrl(value, 'dl.tiarin.ir', /^\/FRE\/.+\.mp3$/i);
const imageUrl = value => trustedUrl(value, 'tiarin.ir', /^\/wp-content\/uploads\/.+\.(?:jpg|jpeg|png|webp)$/i);

function releaseDate(value) {
  const parts = value.match(/\b(19\d{2}|20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (!parts) return null;
  const date = `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}`;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().startsWith(date) ? parsed.toISOString() : null;
}

export function parseArtistPage(html) {
  const releases = new Map();
  for (const match of html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/gi)) {
    const article = match[0];
    const performer = text(article.match(/<li\b[^>]*class=["'][^"']*\bindex-ar\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/i)?.[1] ?? '');
    if (!artistKeys.has(key(performer))) continue;
    const url = [...article.matchAll(/<a\b[^>]*>/gi)].map(item => releaseUrl(attributes(item[0]).href)).find(Boolean);
    if (url) releases.set(url, { url, publishedAt: releaseDate(text(article)) });
  }
  const next = [...html.matchAll(/<a\b[^>]*>/gi)].map(item => attributes(item[0])).find(attr => /\bnext\b/i.test(attr.rel ?? ''));
  const nextPage = next ? trustedUrl(next.href, 'tiarin.ir', /^\/artist\/susan-roshan\/page\/\d+\/$/) : null;
  return { releases: [...releases.values()], nextPage };
}

// Persian display names only; retain the publisher's original title for search.
const persianTitles = {
  'Tange Ghoroob': 'تنگ غروب', 'Eshghe Rangi': 'عشق رنگی', 'Delam Gerefteh': 'دلم گرفته', 'Paeez': 'پاییز',
  'Hamkelasi': 'همکلاسی', 'Har Kas Khodaee Dareh': 'هر کس خدایی داره', 'Yaare Man': 'یار من', 'Khooneh': 'خونه',
  'Nafahmidam': 'نفهمیدم', 'Ashegham': 'عاشقم', 'Dozdo Begir': 'دزدو بگیر', 'Khatoon': 'خاتون', 'Shahzadeh': 'شاهزاده',
  'Delbari': 'دلبری', 'Koli': 'کولی', 'Medley': 'مدلی', 'Ghasre Sefeed': 'قصر سفید', 'Ghomar Baz': 'قمارباز',
  'Mardom Azar': 'مردم‌آزار', 'Haghighat': 'حقیقت', 'Del Divooneh': 'دل دیوونه', 'Aria': 'آریا',
  'Daste Dasteh': 'دسته دسته', 'Roohe Shaytoon': 'روح شیطون', 'Aayeneh': 'آینه', 'Hol Shodam': 'هول شدم',
};

export function parseReleasePage(html, release) {
  if (!releaseUrl(release.url)) throw new Error('Untrusted release page');
  const pageTitle = text(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const albumTitle = pageTitle.match(/^آلبوم موسیقی (.+?) از سوزان روشن/)?.[1];
  const candidates = new Map();
  for (const match of html.matchAll(/<li\b[^>]*\bdata-artist\s*=[\s\S]*?<\/li>/gi)) {
    const opening = match[0].match(/^<li\b[^>]*>/i)?.[0] ?? '';
    const attr = attributes(opening);
    if (!artistKeys.has(key(attr['data-artist'])) || attr['data-prem'] || attr['data-price'] || attr['data-buy']) continue;
    const title = attr['data-title']?.trim();
    const source = [...match[0].matchAll(/<[^>]+\bdata-src\s*=[^>]*>/gi)].map(tag => attributes(tag[0]))
      .find(source => publicAudioUrl(source['data-src']) && source['data-type'] === 'audio/mpeg');
    const audio = source && publicAudioUrl(source['data-src']);
    const cover = imageUrl(attr['data-image']);
    if (!title || !audio || !cover) continue;
    candidates.set(audio, { title, persianTitle: persianTitles[title] ?? title, coverUrl: cover, audio, sourceUrl: release.url,
      publishedAt: release.publishedAt, albumTitle: albumTitle ?? null, albumOriginalTitle: attr['data-album'] ?? null });
  }
  return [...candidates.values()];
}

async function fetchPage(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'error' });
  if (!response.ok || !/text\/html/i.test(response.headers.get('content-type') ?? '')) throw new Error(`Publisher page failed: ${response.status}`);
  const html = await response.text();
  if (html.length > 2_000_000) throw new Error('Publisher page exceeded size limit');
  return html;
}

export async function checkAudio(url, fetcher = fetch) {
  if (!publicAudioUrl(url)) return { available: false, reason: 'not-public-audio' };
  let reader;
  try {
    const response = await fetcher(url, { headers: { Range: 'bytes=0-1023' }, redirect: 'error', signal: AbortSignal.timeout(15000) });
    reader = response.body?.getReader();
    const bytes = (response.ok && reader) ? (await reader.read()).value : null;
    const mp3 = bytes && ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
    const available = Boolean(response.ok && /audio\/(?:mpeg|mp3)/i.test(response.headers.get('content-type') ?? '') && mp3);
    return { available, status: response.status, range: response.headers.get('content-range'), reason: available ? null : 'not-mp3-audio' };
  } catch (error) { return { available: false, reason: error.name }; }
  finally { await reader?.cancel().catch(() => {}); }
}

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

export function buildBundle(candidates, archive, previous, observedAt) {
  const originals = archive.tracks.filter(isArtistTrack);
  const existingArtist = archive.artists.find(sameArtist);
  const slug = existingArtist?.slug ?? 'susan-roshan';
  const artist = { name: artistName, slug, aliases: [...new Set([...(existingArtist?.aliases ?? []), ...aliases])], sourceUrl: ARTIST_PAGE };
  const saved = new Map((previous.tracks ?? []).map(track => [track.id, track]));
  const knownIds = new Set(archive.tracks.map(track => track.id));
  const byId = new Map();
  for (const candidate of candidates) {
    const titleKeys = new Set([candidate.title, candidate.persianTitle].map(key));
    const titleMatch = originals.filter(track => [track.title, track.persianTitle].some(title => titleKeys.has(key(title)))
      && (!track.album || !candidate.albumTitle || key(track.album.title) === key(candidate.albumTitle) || key(track.album.title) === key(candidate.albumOriginalTitle)));
    const existing = originals.find(track => track.sources.some(source => source.url === candidate.audio)) ?? (titleMatch.length === 1 ? titleMatch[0] : null);
    const id = existing?.id ?? `tiarin-${hash(`${candidate.sourceUrl}\0${key(candidate.title)}`)}`;
    const albumId = `tiarin-${candidate.sourceUrl.match(/\/(album|single)\/(\d+)\//)[2]}`;
    const year = candidate.publishedAt?.slice(0, 4);
    const track = { id, title: candidate.title, persianTitle: candidate.persianTitle, kind: 'track', artist, artists: [artist], coverUrl: candidate.coverUrl,
      description: `«${candidate.persianTitle}» از سوزان روشن${candidate.albumTitle ? `، از آلبوم «${candidate.albumTitle}»` : ''}. معرفی و منبع پخش: تیارین.${year ? ` سال انتشار درج‌شده در ناشر: ${year}.` : ''}`,
      sourceUrl: candidate.sourceUrl, publishedAt: candidate.publishedAt, addedAt: existing?.addedAt ?? saved.get(id)?.addedAt ?? observedAt,
      category: 'پاپ', moods: ['سوزان روشن', ...(year && Number(year) < 2010 ? ['نوستالژی'] : [])],
      ...(candidate.albumTitle ? { album: { id: albumId, title: candidate.albumTitle, sourceUrl: candidate.sourceUrl, coverUrl: candidate.coverUrl, publishedAt: candidate.publishedAt, genres: ['پاپ'] } } : {}),
      folder: { root: 'Music', year: year ?? null, month: null, day: null },
      sources: [{ url: candidate.audio, label: 'تیارین · پخش عمومی MP3', kind: 'stream', provider: 'tiarin', sourcePageUrl: candidate.sourceUrl, available: true, checkedAt: observedAt }] };
    byId.set(id, track);
  }
  const tracks = [...byId.values()];
  const collection = { id: 'susan-roshan-collection', title: 'سوزان روشن؛ آلبوم‌ها و تک‌آهنگ‌ها', scope: 'persian', mood: 'سوزان روشن',
    description: 'آثار سوزان روشن در فهرست عمومی تیارین؛ با کاور آلبوم، نام فارسی و اصلی آهنگ‌ها و لینک ناشر. این مجموعه با سوسن متفاوت است.',
    trackIds: tracks.map(track => track.id), covers: [...new Set(tracks.map(track => track.coverUrl))].slice(0, 4), artistCount: 1, updatedAt: observedAt, selection: 'curated-mood',
    publisher: { name: 'تیارین', url: ARTIST_PAGE }, artistSlug: slug };
  const albums = new Map();
  for (const track of tracks) {
    if (!track.album) continue;
    if (!albums.has(track.album.id)) albums.set(track.album.id, { ...collection, id: `${track.album.id}-susan-roshan`, title: `${track.album.title}؛ سوزان روشن`,
      description: `آلبوم «${track.album.title}» از سوزان روشن؛ منبع: تیارین.`, trackIds: [], covers: [track.coverUrl], selection: 'artist-album', publisher: { name: 'تیارین', url: track.sourceUrl } });
    albums.get(track.album.id).trackIds.push(track.id);
  }
  const profile = { ...existingArtist, ...artist, trackIds: [...new Set([...(existingArtist?.trackIds ?? []), ...tracks.map(track => track.id)])],
    trackCount: new Set([...(existingArtist?.trackIds ?? []), ...tracks.map(track => track.id)]).size, categories: [...new Set([...(existingArtist?.categories ?? []), 'پاپ', 'سوزان روشن'])],
    coverUrl: tracks[0]?.coverUrl ?? existingArtist?.coverUrl ?? null, profileImageUrl: existingArtist?.profileImageUrl ?? tracks[0]?.coverUrl ?? null,
    bio: existingArtist?.bio ?? 'سوزان روشن (Susan Roshan)، خوانندهٔ پاپ فارسی. این صفحه آثار موجود در آرشیو سرونما و فهرست عمومی تیارین را یک‌جا معرفی می‌کند.', profileSourceUrl: ARTIST_PAGE };
  return { observedAt, tracks, newTrackIds: tracks.filter(track => !knownIds.has(track.id)).map(track => track.id), artists: [profile], collections: [collection, ...albums.values()] };
}

export async function main() {
  const observedAt = new Date().toISOString();
  const releases = new Map();
  const visited = new Set();
  let page = ARTIST_PAGE;
  while (page && visited.size < 3) {
    if (visited.has(page)) throw new Error('Artist pagination loop');
    visited.add(page);
    const parsed = parseArtistPage(await fetchPage(page));
    for (const release of parsed.releases) releases.set(release.url, release);
    page = parsed.nextPage;
  }
  if (page || !releases.size || releases.size > 12) throw new Error('Unexpected artist listing size; review before importing');
  const candidates = [];
  for (const release of releases.values()) {
    const parsed = parseReleasePage(await fetchPage(release.url), release);
    if (!parsed.length) throw new Error(`No public tracks found: ${release.url}`);
    candidates.push(...parsed);
  }
  if (candidates.length > 180) throw new Error('Import exceeds bounded release overlay');
  const checks = [];
  // Sequential small Range requests: no full-file downloads or private/VIP endpoints.
  for (const candidate of candidates) checks.push({ candidate, ...await checkAudio(candidate.audio) });
  const failed = checks.filter(check => !check.available);
  if (failed.length) throw new Error(`Audio checks failed; previous bundle preserved: ${JSON.stringify(failed.map(({ candidate, ...check }) => ({ title: candidate.title, ...check })))}`);
  for (const cover of new Set(candidates.map(candidate => candidate.coverUrl))) {
    const response = await fetch(cover, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(12000) });
    if (!response.ok || !/^image\//i.test(response.headers.get('content-type') ?? '')) throw new Error('Album cover is unavailable; previous bundle preserved');
  }
  const snapshots = await Promise.all(['public/data/music-index.json', 'public/data/melodify-library.json', 'public/data/hosted-music.json', 'lib/data/media-refresh-2026-11-14-music.json']
    .map(file => readJson(file, { tracks: [], artists: [] })));
  const archive = { tracks: [...new Map(snapshots.flatMap(snapshot => snapshot.tracks).map(track => [track.id, track])).values()], artists: snapshots.flatMap(snapshot => snapshot.artists ?? []) };
  const previous = await readJson(BUNDLE_FILE, { tracks: [] });
  const bundle = buildBundle(candidates, archive, previous, observedAt);
  if (!bundle.tracks.length) throw new Error('Refusing to replace collection with empty data');
  bundle.report = { artistPage: ARTIST_PAGE, pages: visited.size, releases: [...releases.values()], audioChecked: checks.length, verified: checks.filter(check => check.available).length, check: 'anonymous HTTPS Range GET + MP3 signature', coversChecked: new Set(candidates.map(candidate => candidate.coverUrl)).size };
  await writeJsonAtomic(BUNDLE_FILE, bundle);
  console.log(JSON.stringify({ file: BUNDLE_FILE, tracks: bundle.tracks.length, newTracks: bundle.newTrackIds.length, collections: bundle.collections.length, artist: bundle.artists[0].slug, ...bundle.report }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
