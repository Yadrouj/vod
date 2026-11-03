import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

const MAX_BYTES = 12_000_000;
const OFFICIAL_IMAGE_HOSTS = new Set(['image.tmdb.org', 'm.media-amazon.com']);

export function isLandscape({ width, height } = {}) {
  return Number.isInteger(width) && Number.isInteger(height) && width >= 1920 && height >= 800 && width / height >= 1.5 && width / height <= 2.6;
}

export function originalImageUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.port || url.username || url.password || !OFFICIAL_IMAGE_HOSTS.has(url.hostname)) return null;
    url.search = ''; url.hash = '';
    if (url.hostname === 'image.tmdb.org') {
      if (!/^\/t\/p\/(original|w\d+)\/[\w-]+\.(jpg|png|webp)$/i.test(url.pathname)) return null;
      url.pathname = url.pathname.replace(/\/(original|w\d+)\//, '/original/');
    } else {
      if (!url.pathname.startsWith('/images/')) return null;
      url.pathname = url.pathname.replace(/\._V1_[^/]*(?=\.[a-z0-9]+$)/i, '._V1_');
    }
    return url.toString();
  } catch { return null; }
}

async function boundedBody(response, maximum = MAX_BYTES) {
  if (Number(response.headers.get('content-length')) > maximum) {
    await response.body?.cancel(); throw new Error('Response exceeds artwork byte budget');
  }
  if (!response.body) throw new Error('Empty artwork response');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) throw new Error('Response exceeds artwork byte budget');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}

export async function validateHeroImage(value, { root = process.cwd(), fetcher = fetch, now = Date.now } = {}) {
  // Keep optional native image tooling from preventing a chart-only refresh.
  const { default: sharp } = await import('sharp');
  let bytes; let url;
  if (typeof value === 'string' && value.startsWith('/media/') && !value.includes('\\')) {
    const publicRoot = await realpath(path.join(root, 'public'));
    const file = await realpath(path.resolve(publicRoot, `.${decodeURIComponent(value)}`));
    const relative = path.relative(publicRoot, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Artwork outside public directory');
    const info = await stat(file);
    if (!info.isFile() || info.size > MAX_BYTES) throw new Error('Invalid local artwork size');
    bytes = await readFile(file); url = value;
  } else {
    url = originalImageUrl(value);
    if (!url) throw new Error('Artwork is not a local or official image URL');
    const response = await fetcher(url, {
      redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { Accept: 'image/jpeg,image/png,image/webp', 'User-Agent': 'SarvNema/1.0 (hero artwork validation)' },
    });
    if (response.status !== 200 || !/^image\/(jpeg|png|webp)(?:;|$)/i.test(response.headers.get('content-type') ?? '')) {
      await response.body?.cancel(); throw new Error(`Artwork HTTP ${response.status} or non-raster response`);
    }
    bytes = await boundedBody(response);
  }
  const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: 'warning' });
  const metadata = await image.metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) !== 1 || !isLandscape(metadata)) throw new Error('Artwork is not a native high-resolution landscape');
  // Decode the entire file too: dimensions in a truncated header are not enough.
  const stats = await image.stats();
  if (stats.entropy < 1) throw new Error('Artwork appears to be a blank placeholder');
  return { url, width: metadata.width, height: metadata.height, validatedAt: new Date(now()).toISOString() };
}

export function tmdbCredentials(env = process.env) {
  return { token: env.TMDB_READ_ACCESS_TOKEN || env.TMDB_API_READ_ACCESS_TOKEN || env.TMDB_ACCESS_TOKEN || '',
    apiKey: env.TMDB_API_KEY || env.NEXT_PUBLIC_TMDB_API_KEY || '' };
}

export async function catalogHeroCandidates(card, { root = process.cwd(), dataDir = process.env.VOD_DATA_DIR || path.join(root, 'public/data') } = {}) {
  // Use already-ingested primary metadata, not a new scrape of IMDb galleries
  // (and not the hundreds-of-MB aggregate catalog).
  const ids = [...new Set([card.imdbCode, card.id])].filter(id => typeof id === 'string' && /^[\w-]+$/.test(id));
  for (const id of ids) {
    try {
      const file = path.join(dataDir, 'titles', `${id}.json`);
      if ((await stat(file)).size > 2_000_000) continue;
      const title = JSON.parse(await readFile(file, 'utf8'));
      if (title.imdbCode !== card.imdbCode) continue;
      return (title.imdbImages ?? []).filter(image => isLandscape(image) && image.width * image.height <= 40_000_000 && originalImageUrl(image.url))
        .sort((a, b) => Math.abs(a.width / a.height - 16 / 9) - Math.abs(b.width / b.height - 16 / 9) || b.width - a.width)
        .slice(0, 3).map(image => ({ url: image.url, provider: 'catalog', sourceUrl: /^rm\d+$/.test(image.image_id ?? '')
          ? `https://www.imdb.com/title/${card.imdbCode}/mediaviewer/${image.image_id}/` : `https://www.imdb.com/title/${card.imdbCode}/` }));
    } catch { /* Per-title files are optional and may be rebuilding. */ }
  }
  return [];
}

export async function tmdbBackdrops(card, { fetcher = fetch, credentials = tmdbCredentials() } = {}) {
  if ((!credentials.token && !credentials.apiKey) || !/^tt\d{5,12}$/.test(card.imdbCode)) return [];
  const request = async (pathname) => {
    const url = new URL(`https://api.themoviedb.org/3${pathname}`);
    if (!credentials.token) url.searchParams.set('api_key', credentials.apiKey);
    // Never log URLs or upstream error bodies: they may contain credentials.
    let response;
    try {
      response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(10_000),
        headers: { Accept: 'application/json', ...(credentials.token ? { Authorization: `Bearer ${credentials.token}` } : {}) } });
    } catch { throw new Error('TMDB request failed'); }
    if (response.status !== 200) {
      await response.body?.cancel();
      const error = new Error(`TMDB HTTP ${response.status}; no retries or alternate endpoints`);
      error.status = response.status; throw error;
    }
    try { return JSON.parse((await boundedBody(response, 2_000_000)).toString('utf8')); }
    catch { throw new Error('Invalid or oversized TMDB metadata response'); }
  };
  const found = await request(`/find/${card.imdbCode}?external_source=imdb_id`);
  const kind = card.type === 'movie' ? 'movie' : card.type === 'series' ? 'tv' : null;
  const matches = kind === 'movie' ? found.movie_results : kind === 'tv' ? found.tv_results : [];
  if (!kind || !Array.isArray(matches) || matches.length !== 1 || !Number.isSafeInteger(matches[0].id) || matches[0].id <= 0) return [];
  const sourceUrl = `https://www.themoviedb.org/${kind}/${matches[0].id}`;
  const images = await request(`/${kind}/${matches[0].id}/images?include_image_language=null,en`);
  return (images.backdrops ?? []).filter(image => isLandscape(image) && /^\/[\w-]+\.(jpg|png|webp)$/i.test(image.file_path))
    .sort((a, b) => Number(b.iso_639_1 == null) - Number(a.iso_639_1 == null) || b.width - a.width || (b.vote_count ?? 0) - (a.vote_count ?? 0))
    .slice(0, 3).map(image => ({ url: `https://image.tmdb.org/t/p/original${image.file_path}`, sourceUrl, provider: 'tmdb' }));
}

export async function refreshHeroArt(charts, previous = {}, { root = process.cwd(), dataDir = process.env.VOD_DATA_DIR || path.join(root, 'public/data'), fetcher = fetch, now = Date.now,
  credentials = tmdbCredentials(), validate = validateHeroImage, lookup = tmdbBackdrops, gallery = catalogHeroCandidates, maxTitles = 32,
  budgetMs = 180_000 } = {}) {
  const artwork = { ...previous }; const outcomes = {};
  const groups = ['movie', 'series'].map(kind => [...(charts[kind]?.items ?? [])].sort((a, b) => a.rank - b.rank));
  const cards = []; const seen = new Set();
  for (let i = 0; i < Math.max(...groups.map(group => group.length)); i++) for (const group of groups) {
    const card = group[i]?.card;
    if (card && !seen.has(card.imdbCode) && cards.length < maxTitles) { seen.add(card.imdbCode); cards.push(card); }
  }
  const checked = new Map(); let tmdbBlocked = false;
  const deadline = Date.now() + budgetMs;
  const inspect = candidate => {
    const key = originalImageUrl(candidate) ?? candidate;
    if (!checked.has(key)) checked.set(key, validate(candidate, { root, fetcher, now }));
    return checked.get(key);
  };
  for (const card of cards) {
    if (Date.now() >= deadline) { outcomes[card.imdbCode] = { state: 'deferred', reason: 'Artwork run time budget reached' }; continue; }
    const prior = previous[card.imdbCode];
    // A successful validation is cached, never re-dated just because a job ran.
    const age = now() - Date.parse(prior?.validatedAt ?? '');
    if (prior && isLandscape(prior) && age >= 0 && age < 86400_000) { outcomes[card.imdbCode] = { state: 'cached' }; continue; }
    const errors = []; let selected;
    const tryCandidates = async candidates => {
      for (const candidate of candidates) {
        if (Date.now() >= deadline) return;
        try { selected = { ...await inspect(candidate.url), sourceUrl: candidate.sourceUrl, provider: candidate.provider }; return; }
        catch (error) { errors.push(error.message); }
      }
    };
    // An existing official backdrop is preferable to a new arbitrary image.
    const catalog = [...new Set([prior?.url, card.backdropUrl].filter(Boolean))].slice(0, 2)
      .map(url => ({ url, sourceUrl: prior?.url === url ? prior.sourceUrl : /^tt\d{5,12}$/.test(card.imdbCode) ? `https://www.imdb.com/title/${card.imdbCode}/` : card.sourcePageUrl ?? url,
        provider: prior?.url === url ? prior.provider : 'catalog' }));
    await tryCandidates(catalog);
    if (!selected) await tryCandidates(await gallery(card, { root, dataDir }));
    if (!selected && !tmdbBlocked && Date.now() < deadline) {
      try { await tryCandidates(await lookup(card, { fetcher, credentials })); }
      catch (error) { errors.push(error.message); if ([401, 403, 429].includes(error.status)) tmdbBlocked = true; }
    }
    if (selected) { artwork[card.imdbCode] = selected; outcomes[card.imdbCode] = { state: 'validated', width: selected.width, height: selected.height, provider: selected.provider }; }
    else outcomes[card.imdbCode] = { state: prior ? 'retained' : 'unavailable', errors };
  }
  return { artwork, outcomes, tmdbConfigured: Boolean(credentials.token || credentials.apiKey) };
}
