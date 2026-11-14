import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { writeJsonAtomic } from './atomic-json.mjs';
import { mergeMeloobitTracks } from './meloobit-source.mjs';
import { canonicalizeTrackArtists, buildArtists, normalizeComparable } from './music-catalog.mjs';
import { isMp3Prefix } from './melodify-source-recovery.mjs';
import { contentRestriction } from '../lib/content-restrictions.mjs';
import { streamVodArchiveItems } from './vod-json-stream.mjs';
import { alternativeMediaKey } from '../lib/alternative-source-links.mjs';
import { publicUrl, sourceIdentity } from './public-vod-sources.mjs';

const read = async (file, fallback) => {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return fallback; }
};
const unique = values => [...new Set(values.filter(Boolean))];
const idOf = item => item.imdbCode || item.id;

export function combineVideoSources(sources) {
  const items = new Map();
  for (const source of sources) for (const item of source.items || []) {
    if (!idOf(item) || contentRestriction(item)) continue;
    const old = items.get(idOf(item));
    const links = [...new Map([...(old?.links || []), ...(item.links || [])].filter(link => /^https?:\/\//.test(link.url)).map(link => [link.url, link])).values()];
    items.set(idOf(item), { ...old, ...item, links,
      groups: unique([...(old?.groups || []), ...(item.groups || []), ...links.map(link => link.group)]),
      qualities: unique([...(old?.qualities || []), ...(item.qualities || []), ...links.map(link => link.quality)]),
      curatedSourcePages: unique([...(old?.curatedSourcePages || []), ...(item.curatedSourcePages || []), old?.sourcePageUrl, item.sourcePageUrl]),
    });
  }
  return [...items.values()];
}

// A title/year coincidence is not enough evidence to attach somebody else's
// files. Keep an existing ID (or the best evidenced new profile) and hold other
// ambiguous new IDs for review, rather than publishing duplicate search cards.
export function selectVideoUpdates(items, existing) {
  const known = new Set(existing.map(idOf)), groups = new Map();
  for (const item of items) {
    const key = sourceIdentity(item), group = groups.get(key) || [];
    group.push(item); groups.set(key, group);
  }
  const selected = [], heldBack = [];
  for (const group of groups.values()) {
    const present = group.filter(item => known.has(idOf(item)));
    const imdb = group.filter(item => /^tt\d+$/.test(idOf(item)));
    const keep = group.length === 1 || imdb.length > 1 ? group : present.length ? present
      : [imdb[0] || group.find(item => item.persianTitle && !/^familymovie-/.test(idOf(item))) || group[0]];
    selected.push(...keep);
    for (const item of group) if (!keep.includes(item)) heldBack.push({ id: idOf(item), title: item.title, reason: 'Same title/year, distinct source ID; files not cross-attached without identity evidence' });
  }
  return { selected, heldBack };
}

export async function verifyMusicSources(tracks, { fetchImpl = fetch, gapMs = 350, timeoutMs = 8000, workers = 3 } = {}) {
  const checks = new Map(); let nextStart = 0;
  const check = source => {
    if (!checks.has(source.url)) checks.set(source.url, (async () => {
      // Meloobit's bounded source scraper already inspected the file signature.
      if (source.available === true && Date.now() - Date.parse(source.checkedAt) >= 0 && Date.now() - Date.parse(source.checkedAt) < 86400000) return { available: true, checkedAt: source.checkedAt, reused: true };
      const start = Math.max(Date.now(), nextStart); nextStart = start + gapMs;
      await new Promise(resolve => setTimeout(resolve, Math.max(0, start - Date.now())));
      const checkedAt = new Date().toISOString(); let reader;
      try {
        const response = await fetchImpl(source.url, { redirect: 'error', headers: { Range: 'bytes=0-4095', 'Accept-Encoding': 'identity', 'User-Agent': 'SarvNemaCatalogBot/1.0' }, signal: AbortSignal.timeout(timeoutMs) });
        reader = response.body?.getReader();
        const prefix = await reader?.read();
        const bytes = Buffer.from(prefix?.value || []);
        const available = [200, 206].includes(response.status) && !/text|html|json|xml|image\//i.test(response.headers.get('content-type') || '')
          && Boolean(isMp3Prefix(bytes) || bytes.toString('ascii', 4, 8) === 'ftyp');
        return { available, checkedAt, status: response.status };
      } catch { return { available: false, checkedAt, reason: 'unreachable-or-timeout' }; }
      finally { await reader?.cancel().catch(() => {}); }
    })());
    return checks.get(source.url);
  };
  const verified = []; let cursor = 0;
  await Promise.all(Array.from({ length: workers }, async () => {
    while (cursor < tracks.length) {
      const track = tracks[cursor++]; const sources = [];
      for (const source of track.sources || []) {
        if (!publicUrl(source.url)) continue;
        const result = await check(source);
        if (result.available) sources.push({ ...source, ...result, kind: 'stream', sourcePageUrl: source.sourcePageUrl || track.sourceUrl });
      }
      if (sources.length) verified.push(canonicalizeTrackArtists({ ...track, sources }, track.sourceUrl));
    }
  }));
  return { tracks: verified, checks: await Promise.all([...checks].map(async ([url, result]) => ({ url, ...await result }))) };
}

export function compatibleMusicAttribution(track, candidates) {
  const identities = value => new Set(canonicalizeTrackArtists(value, value.sourceUrl).artists
    .flatMap(artist => [artist.slug, artist.name, ...(artist.aliases || [])]).map(normalizeComparable).filter(Boolean));
  const actual = identities(track);
  return candidates.some(candidate => [...identities(candidate)].some(value => actual.has(value)));
}

async function main() {
  const day = process.argv.find(arg => arg.startsWith('--date='))?.slice(7);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) throw new Error('Use --date=YYYY-MM-DD');
  const root = `.media-cache/refresh-${day}`;
  const observedAt = new Date().toISOString();
  const incoming = combineVideoSources(await Promise.all(['public/source.json', 'curated-source.json', 'series-source.json'].map(file => read(path.join(root, file), { items: [] }))));
  const baseIndex = await read('public/data/vod-index.json', { items: [] });
  const { selected: video, heldBack } = selectVideoUpdates(incoming, baseIndex.items);
  const known = new Set(baseIndex.items.map(idOf));
  const videoReport = { titles: video.length, movies: video.filter(item => !/series/i.test(item.type)).length,
    series: video.filter(item => /series/i.test(item.type)).length, newTitles: video.filter(item => !known.has(idOf(item))).length,
    links: video.reduce((n, item) => n + item.links.length, 0), episodeSlots: new Set(video.flatMap(item => item.links.filter(link => link.season && link.episode).map(link => `${idOf(item)}:${link.season}:${link.episode}`))).size,
    addedLinks: 0, refreshedSignedLinks: 0, existingTitlesReviewed: 0, heldBackTitles: heldBack.length };
  const byId = new Map(video.map(item => [idOf(item), item]));
  await streamVodArchiveItems('public/data/vod-catalog.json', item => {
    const fresh = byId.get(idOf(item)); if (!fresh) return;
    videoReport.existingTitlesReviewed++;
    const urls = new Map(item.links.map(link => [alternativeMediaKey(link) || link.url, link.url]));
    videoReport.addedLinks += fresh.links.filter(link => !urls.has(alternativeMediaKey(link) || link.url)).length;
    videoReport.refreshedSignedLinks += fresh.links.filter(link => urls.has(alternativeMediaKey(link) || link.url) && urls.get(alternativeMediaKey(link) || link.url) !== link.url).length;
  });
  videoReport.addedLinks += video.filter(item => !known.has(idOf(item))).reduce((n, item) => n + item.links.length, 0);

  const musicSources = await Promise.all(['music/meloobit-source.json', 'music/musics-fa-checked.json', 'roz-source.json'].map(file => read(path.join(root, file), { tracks: [] })));
  const candidates = [...new Map(musicSources.flatMap(source => Array.isArray(source) ? source : source.tracks || []).map(track => [track.id, track])).values()];
  if (process.argv.includes('--reuse-verified')) {
    const previous = new Map((await read(path.join(root, 'music-verification.json'), [])).map(check => [check.url, check]));
    for (const track of candidates) track.sources = track.sources.map(source => {
      const checked = previous.get(source.url);
      return checked?.available && Date.now() - Date.parse(checked.checkedAt) < 86400000 ? { ...source, available: true, checkedAt: checked.checkedAt } : source;
    });
  }
  const verified = await verifyMusicSources(candidates);
  const base = await read('public/data/music-index.json', { tracks: [], artists: [] });
  const combined = mergeMeloobitTracks(base.tracks, verified.tracks);
  const incomingUrls = new Set(verified.tracks.flatMap(track => track.sources.map(source => source.url)));
  const oldById = new Map(base.tracks.map(track => [track.id, track]));
  const heldBackMusic = [];
  const tracks = combined.filter(track => track.sources.some(source => incomingUrls.has(source.url)))
    .filter(track => {
      const urls = new Set(track.sources.map(source => source.url));
      const candidates = verified.tracks.filter(candidate => candidate.id === track.id || candidate.sources.some(source => urls.has(source.url)));
      if (compatibleMusicAttribution(track, candidates)) return true;
      heldBackMusic.push({ id: track.id, title: track.title, reason: 'Existing artist attribution conflicts with checked source; no unrelated singer substitution' });
      return false;
    })
    .map(track => ({ ...track, sources: track.sources.filter(source => incomingUrls.has(source.url) && source.available === true), addedAt: oldById.get(track.id)?.addedAt || observedAt }));
  const oldArtists = new Map(base.artists.map(artist => [artist.slug, artist]));
  const artists = buildArtists(tracks).map(artist => ({ ...oldArtists.get(artist.slug), ...artist }));
  const newTrackIds = tracks.filter(track => !oldById.has(track.id)).map(track => track.id);
  if (!video.length || video.length > 500 || !tracks.length || tracks.length > 180) throw new Error('Empty or unexpectedly large batch; inspect source reports');
  await writeJsonAtomic(`lib/data/media-refresh-${day}-vod.json`, { version: 1, observedAt, items: video, newTitleIds: video.filter(item => !known.has(idOf(item))).map(idOf) });
  await writeJsonAtomic(`lib/data/media-refresh-${day}-music.json`, { version: 1, observedAt, tracks, artists, newTrackIds });
  const report = { observedAt, video: videoReport, music: { candidates: candidates.length, verified: tracks.length, added: newTrackIds.length,
    enriched: tracks.length - newTrackIds.length, artists: artists.length, heldBackAttributions: heldBackMusic.length, mediaChecked: verified.checks.length, mediaAvailable: verified.checks.filter(check => check.available).length } };
  await writeJsonAtomic(path.join(root, 'music-verification.json'), verified.checks);
  await writeJsonAtomic(path.join(root, 'held-back-video-identities.json'), heldBack);
  await writeJsonAtomic(path.join(root, 'held-back-music-attributions.json'), heldBackMusic);
  await writeJsonAtomic(path.join(root, 'summary.json'), report);
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error); process.exitCode = 1; });
