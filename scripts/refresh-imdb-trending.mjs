import { readFile, mkdir, open, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { acquireWorkerLock, runWorkerCli } from './lib/worker-lock.mjs';
import { CHART_URLS, fetchImdbChartSnapshot, matchChartToCatalog } from './lib/imdb-charts.mjs';
import { refreshHeroArt } from './lib/imdb-hero-art.mjs';
async function readJson(file) { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; } }
async function atomicJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  const handle = await open(temp, 'wx');
  try {
    try { await handle.writeFile(`${JSON.stringify(value)}\n`); await handle.sync(); } finally { await handle.close(); }
    await rename(temp, file);
  } finally { await unlink(temp).catch(() => {}); }
}

export const acquireImdbRefreshLock = acquireWorkerLock;

export async function refreshImdbTrending({ root = process.cwd(), force = false, bootstrap = false, artOnly = false, dryRun = false,
  dataDir = process.env.VOD_DATA_DIR || path.join(root, 'public/data'),
  stateDir = path.resolve(dataDir) === path.resolve(root, 'public/data') ? path.join(root, 'data') : dataDir,
  now = Date.now, fetchChart = fetchImdbChartSnapshot, refreshArt = refreshHeroArt, artOptions = {} } = {}) {
  const destination = path.join(dataDir, 'imdb-trending.json');
  const artFile = path.join(dataDir, 'imdb-hero-art.json');
  const statusFile = path.join(stateDir, 'imdb-trending-status.json');
  const lockPath = path.join(stateDir, 'imdb-trending.lock');
  const lock = await acquireImdbRefreshLock(lockPath);
  if (!lock) return { skipped: 'IMDb refresh locked by a live, malformed, or unverified owner' };
  try {
    const lastStatus = await readJson(statusFile);
    const attemptAge = now() - Date.parse(lastStatus?.attemptedAt ?? '');
    if (!force && !bootstrap && !artOnly && attemptAge >= 0 && attemptAge < 6 * 3600_000) return { skipped: 'IMDb charts checked recently' };
    const previous = await readJson(destination);
    const catalog = await readJson(path.join(dataDir, 'vod-index.json'));
    if (!Array.isArray(catalog?.items)) throw new Error('Catalog index missing');
    const seed = bootstrap ? await readJson(path.join(stateDir, 'imdb-chart-bootstrap.json')) ?? await readJson(path.join(root, 'data/imdb-chart-bootstrap.json')) : null;
    const charts = { ...(previous?.charts ?? {}) };
    const outcomes = {};
    let changed = false;
    for (const kind of ['movie', 'series']) {
      try {
        if (artOnly) { outcomes[kind] = { state: 'retained', reason: 'Artwork-only refresh; source observation unchanged' }; continue; }
        if (bootstrap && charts[kind]) { outcomes[kind] = { state: 'retained', reason: 'Existing chart never overwritten by bootstrap' }; continue; }
        const cached = seed?.charts?.[kind];
        const snapshot = bootstrap ? { ...cached, capture: 'search-cache', entries: cached?.entries?.map(entry => ({ ...entry, kind })) } : await fetchChart(kind);
        const observedAt = Date.parse(snapshot.observedAt);
        if (!Number.isFinite(observedAt) || observedAt > now() || !Array.isArray(snapshot.entries)) throw new Error('Missing or invalid source observation');
        if (Number.isFinite(Date.parse(charts[kind]?.observedAt)) && observedAt < Date.parse(charts[kind].observedAt)) throw new Error('Older upstream observation; previous chart retained');
        const items = matchChartToCatalog(snapshot.entries, catalog.items).slice(0, 100);
        if (!items.length) throw new Error('No unambiguous catalog matches; previous chart retained');
        charts[kind] = { sourceUrl: snapshot.sourceUrl ?? CHART_URLS[kind], observedAt: snapshot.observedAt, capture: snapshot.capture, items };
        outcomes[kind] = { state: 'updated', entries: snapshot.entries.length, matched: items.length, capture: snapshot.capture, observedAt: snapshot.observedAt };
        changed = true;
      } catch (error) { outcomes[kind] = { state: 'retained', error: error.message }; }
    }
    if (changed && !dryRun) await atomicJson(destination, { version: 1, charts });
    // Artwork may improve during an upstream outage, without re-dating charts.
    let art;
    try {
      const priorArt = await readJson(artFile);
      const result = await refreshArt(charts, priorArt?.version === 1 ? priorArt.artwork : {}, { root, dataDir, now, ...artOptions });
      art = { tmdbConfigured: result.tmdbConfigured, outcomes: result.outcomes };
      if (!dryRun && Object.keys(result.artwork).length && JSON.stringify(result.artwork) !== JSON.stringify(priorArt?.artwork)) {
        await atomicJson(artFile, { version: 1, artwork: result.artwork });
      }
    } catch (error) { art = { state: 'retained', error: error.message }; }
    const status = { attemptedAt: new Date(now()).toISOString(), ...(dryRun ? { dryRun: true } : {}), ...(lock.recovered ? { lockRecovered: true } : {}), outcomes, art };
    if (!dryRun && !artOnly) await atomicJson(statusFile, status);
    return status;
    // A blocked upstream is non-fatal to the rest of daily catalog maintenance.
  } finally { await lock.release(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.loadEnvFile('.env.local'); } catch { /* Supervisor may inject credentials. */ }
  const limit = Number(process.argv.find(arg => arg.startsWith('--art-limit='))?.split('=')[1]);
  const cliDataDir = path.resolve(process.env.VOD_DATA_DIR || 'public/data');
  const cliStateDir = cliDataDir === path.resolve('public/data') ? 'data' : cliDataDir;
  runWorkerCli(path.join(cliStateDir, 'imdb-trending.lock'), () => refreshImdbTrending({ force: process.argv.includes('--force'), bootstrap: process.argv.includes('--bootstrap-cache'),
    artOnly: process.argv.includes('--art-only'), dryRun: process.argv.includes('--dry-run'),
    artOptions: Number.isInteger(limit) && limit > 0 ? { maxTitles: Math.min(100, limit) } : {},
  })).then(status => { if (status) console.log(JSON.stringify(status, null, 2)); }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
