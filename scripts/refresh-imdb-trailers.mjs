import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeJsonAtomic } from './atomic-json.mjs';
import { acquireWorkerLock, runWorkerCli } from './lib/worker-lock.mjs';
import { hasPlayableTrailer, normalizeImdbVideos, parseImdbTitleTrailers, parseImdbVideoPlayback, selectTrailerTargets } from '../lib/imdb-trailer-data.mjs';

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
}
async function responseText(response, max = 4_000_000) {
  if (response.status !== 200) { await response.body?.cancel(); throw new Error(`Upstream HTTP ${response.status}`); }
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length; if (size > max) throw new Error('IMDb response exceeds size budget'); chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function refreshImdbTrailers({ dataDir = process.env.VOD_DATA_DIR || 'public/data', limit = 100,
  fetcher = fetch, now = Date.now, apiBase = process.env.IMDB_DATA_API_BASE || '' } = {}) {
  const file = path.join(dataDir, 'imdb-trailers.json');
  const lock = await acquireWorkerLock(path.join(dataDir, '.imdb-trailers.lock'));
  if (!lock) throw new Error('A trailer refresh is already running');
  try {
    const index = await readJson(path.join(dataDir, 'vod-index.json'), {});
    const charts = await readJson(path.join(dataDir, 'imdb-trending.json'), {});
    const previous = await readJson(file, { version: 1, items: {} });
    const map = await readJson(path.join(dataDir, 'title-map.json'), {});
    const targets = selectTrailerTargets(index.items ?? [], charts.charts, now(), limit);
    if (!targets.length) throw new Error('No eligible recent movie targets; previous trailer data retained');
    const items = { ...(previous.version === 1 ? previous.items : {}) }, results = [];
    let apiAvailable = false, blocked = null, attempted = 0, consecutiveFailures = 0;
    if (apiBase) {
      try {
        const response = await fetcher(`${apiBase.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(7000), redirect: 'error' });
        apiAvailable = response.ok; await response.body?.cancel();
      } catch { /* Use only the ordinary public IMDb page, never evade its challenge. */ }
    }
    for (const target of targets) {
      const id = target.imdbCode, sourceUrl = `https://www.imdb.com/title/${id}/`;
      const key = map[id] ?? id;
      if (!/^[\w-]+$/.test(key)) throw new Error('Invalid title file mapping');
      const detail = await readJson(path.join(dataDir, 'titles', `${key}.json`), {});
      const old = normalizeImdbVideos([...(items[id]?.videos ?? []), ...(detail.imdbVideos ?? [])]);
      if (old.some(v => hasPlayableTrailer(v, now() + 6 * 3600_000))) {
        items[id] = { ...items[id], videos: old };
        results.push({ ...target, state: 'retained-playable' }); continue;
      }
      if (blocked) { results.push({ ...target, state: 'not-attempted', reason: blocked }); continue; }
      attempted++;
      try {
        let videos = [];
        if (apiAvailable) {
          const response = await fetcher(`${apiBase.replace(/\/$/, '')}/titles/${id}/fetch`, { method: 'POST', signal: AbortSignal.timeout(12000), redirect: 'error' });
          const data = JSON.parse(await responseText(response));
          if (data.imdb_id && data.imdb_id !== id) throw new Error('Metadata API returned a different title');
          videos = normalizeImdbVideos(data.videos);
        } else {
          const response = await fetcher(sourceUrl, { signal: AbortSignal.timeout(12000), redirect: 'error',
            headers: { 'User-Agent': 'SarvNema/1.0 (public trailer metadata)', 'Accept-Language': 'en-US,en;q=0.9' } });
          if ([202, 401, 403, 429].includes(response.status)) {
            blocked = `IMDb HTTP ${response.status}; no challenge or access restriction was bypassed`;
            await response.body?.cancel(); throw new Error(blocked);
          }
          videos = parseImdbTitleTrailers(await responseText(response), id);
          items[id] = { videos: videos.length ? videos : old, checkedAt: new Date(now()).toISOString(), sourceUrl };
          for (let n = 0; n < Math.min(videos.length, 2); n++) {
            if (hasPlayableTrailer(videos[n], now())) continue;
            const page = await fetcher(`https://www.imdb.com/video/${videos[n].video_id}/`, {
              signal: AbortSignal.timeout(12000), redirect: 'error', headers: { 'User-Agent': 'SarvNema/1.0 (public trailer metadata)' },
            });
            if ([202, 401, 403, 429].includes(page.status)) {
              blocked = `IMDb video HTTP ${page.status}; existing references retained`;
              await page.body?.cancel(); break;
            }
            videos[n] = parseImdbVideoPlayback(await responseText(page), videos[n], id);
          }
        }
        items[id] = { videos: videos.length ? videos : old, checkedAt: new Date(now()).toISOString(), sourceUrl };
        results.push({ ...target, state: items[id].videos.some(v => hasPlayableTrailer(v, now())) ? 'playable' : videos.length ? 'reference-only' : 'not-found' });
        consecutiveFailures = 0;
      } catch (error) {
        if (!items[id] && old.length) items[id] = { videos: old };
        results.push({ ...target, state: 'failed', error: error.message });
        if (++consecutiveFailures >= 3) blocked ??= 'Three consecutive upstream failures; remaining targets deferred';
      }
      // A short pause is intentional; this worker never hammers IMDb after a block.
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    const playable = results.filter(r => ['playable', 'retained-playable'].includes(r.state)).length;
    const report = { checkedAt: new Date(now()).toISOString(), requested: limit, selected: targets.length, attempted,
      playable, references: results.filter(r => r.state === 'reference-only').length, apiAvailable,
      state: playable >= limit ? 'completed' : blocked ? 'blocked' : 'partial', blocked, results };
    await writeJsonAtomic(file, { version: 1, items, report });
    return report;
  } finally { await lock.release(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.loadEnvFile('.env.local'); } catch { /* Environment may be injected. */ }
  const limit = Math.min(500, Math.max(1, Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1]) || 100));
  const dataDir = process.env.VOD_DATA_DIR || 'public/data';
  runWorkerCli(path.join(dataDir, '.imdb-trailers.lock'), () => refreshImdbTrailers({ dataDir, limit })).then(report => {
    if (!report) return;
    console.log(JSON.stringify(report, null, 2));
    if (report.state !== 'completed') process.exitCode = 1;
  }).catch(error => { console.error(error); process.exitCode = 1; });
}
