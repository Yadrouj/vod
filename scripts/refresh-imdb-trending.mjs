import { readFile, mkdir, open, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { CHART_URLS, fetchImdbChart, matchChartToCatalog } from './lib/imdb-charts.mjs';

const root = process.cwd();
const destination = path.join(root, 'public/data/imdb-trending.json');
const statusFile = path.join(root, 'data/imdb-trending-status.json');
const bootstrap = process.argv.includes('--bootstrap-cache');
const force = process.argv.includes('--force');
async function readJson(file) { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; } }
async function atomicJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  const handle = await open(temp, 'wx');
  try { await handle.writeFile(`${JSON.stringify(value)}\n`); await handle.sync(); } finally { await handle.close(); }
  await rename(temp, file);
}
async function main() {
  const lockPath = path.join(root, 'data/imdb-trending.lock');
  await mkdir(path.dirname(lockPath), { recursive: true });
  let lock;
  try { lock = await open(lockPath, 'wx'); } catch (error) {
    if (error.code === 'EEXIST') { console.log('IMDb refresh already locked; skipped.'); return; }
    throw error;
  }
  try {
    const now = Date.now();
    const lastStatus = await readJson(statusFile);
    if (!force && !bootstrap && now - Date.parse(lastStatus?.attemptedAt ?? '') < 6 * 3600_000) { console.log('IMDb charts checked recently; skipped.'); return; }
    const previous = await readJson(destination);
    const catalog = await readJson(path.join(root, 'public/data/vod-index.json'));
    if (!Array.isArray(catalog?.items)) throw new Error('Catalog index missing');
    const seed = bootstrap ? await readJson(path.join(root, 'data/imdb-chart-bootstrap.json')) : null;
    const charts = { ...(previous?.charts ?? {}) };
    const outcomes = {};
    let changed = false;
    for (const kind of ['movie', 'series']) {
      try {
        const cached = seed?.charts?.[kind];
        if (bootstrap && charts[kind]) { outcomes[kind] = { state: 'retained', reason: 'Existing chart never overwritten by bootstrap' }; continue; }
        const entries = bootstrap ? cached.entries.map((entry) => ({ ...entry, kind })) : await fetchImdbChart(kind);
        const items = matchChartToCatalog(entries, catalog.items).slice(0, 20);
        if (!items.length) throw new Error('No unambiguous catalog matches; previous chart retained');
        charts[kind] = { sourceUrl: cached?.sourceUrl ?? CHART_URLS[kind], observedAt: cached?.observedAt ?? new Date().toISOString(),
          capture: bootstrap ? 'search-cache' : 'direct', items };
        outcomes[kind] = { state: 'updated', entries: entries.length, matched: items.length, capture: charts[kind].capture };
        changed = true;
      } catch (error) { outcomes[kind] = { state: 'retained', error: error.message }; }
    }
    if (changed) await atomicJson(destination, { version: 1, charts });
    const status = { attemptedAt: new Date().toISOString(), outcomes };
    await atomicJson(statusFile, status);
    console.log(JSON.stringify(status, null, 2));
    // A blocked upstream is non-fatal to the rest of daily catalog maintenance.
  } finally { await lock.close(); await unlink(lockPath); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
