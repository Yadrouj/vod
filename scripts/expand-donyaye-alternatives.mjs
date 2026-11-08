import { readFile } from 'node:fs/promises';
import { streamVodArchiveItems } from './vod-json-stream.mjs';
import { refreshAlternativeSources } from './refresh-alternative-sources.mjs';
import { isDonyayeSource, mergeAlternativeSourceUpdates } from '../lib/alternative-source-links.mjs';
import { writeJsonAtomic } from './atomic-json.mjs';

const source = { items: [] };
let scanned = 0;
await streamVodArchiveItems('public/data/vod-catalog.json', item => {
  scanned++;
  if (!item.links?.some(isDonyayeSource)) return;
  const links = item.links.filter(link => link.sourceProvider && !isDonyayeSource(link));
  if (links.length) source.items.push({ id: item.imdbCode || item.id, links });
});
let initial = { version: 1, items: {} };
for (const name of ['alternative-source-links', 'moviezland-source-links', 'moviezland-direct-source-links', 'series-source-links']) {
  initial = mergeAlternativeSourceUpdates(initial, JSON.parse(await readFile(`lib/data/${name}.json`, 'utf8')));
}
// Give uncovered titles the first probe before additional variants of covered works.
source.items.sort((a, b) => Number(Boolean(initial.items[a.id]?.links.length)) - Number(Boolean(initial.items[b.id]?.links.length)));
console.log(JSON.stringify({ phase: 'scan-complete', scanned, titlesWithOtherSources: source.items.length }));
const result = await refreshAlternativeSources([source], { titleDir: 'public/data/titles', initial,
  limit: Number(process.env.ALTERNATIVE_SOURCE_PROBE_LIMIT || 1200), deadline: Date.now() + Number(process.env.ALTERNATIVE_SOURCE_BUDGET_MS || 360000),
  onProgress: value => console.log(JSON.stringify({ phase: 'verify', ...value })) });
const base = JSON.parse(await readFile('lib/data/alternative-source-links.json', 'utf8'));
const additions = Object.fromEntries(result.report.titles.map(id => [id, { links: result.updates.items[id].links.filter(link => result.report.checks.some(check => check.itemId === id && check.url === link.url && check.state === 'verified')) }]));
await writeJsonAtomic('lib/data/alternative-source-links.json', mergeAlternativeSourceUpdates(base, { version: 1, items: additions }));
await writeJsonAtomic('.media-cache/vod-sync/expanded-alternative-report.json', { checkedAt: new Date().toISOString(), ...result.report });
console.log(JSON.stringify({ ...result.report, checks: undefined }));
