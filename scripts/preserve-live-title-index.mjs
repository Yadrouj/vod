import { readFile } from 'node:fs/promises';
import { writeJsonAtomic } from './atomic-json.mjs';

// Some server-only publisher profiles live in title files rather than the compact
// scraper catalog. Preserve their search records/aliases during an archive rebuild.
const oldRoot = process.argv[2];
if (!oldRoot) throw new Error('Provide a backed-up public/data directory');
const read = async file => JSON.parse(await readFile(file, 'utf8'));
const [old, current, oldMap, currentMap] = await Promise.all([
  read(`${oldRoot}/vod-index.json`), read('public/data/vod-index.json'),
  read(`${oldRoot}/title-map.json`), read('public/data/title-map.json'),
]);
const known = new Set(current.items.map(item => item.imdbCode || item.id));
const extras = old.items.filter(item => !known.has(item.imdbCode || item.id));
current.items.push(...extras);
current.items.sort((a, b) => (b.imdbRating || 0) - (a.imdbRating || 0) || (b.imdbVotes || 0) - (a.imdbVotes || 0));
current.totalTitles = current.items.length;
current.totalLinks += extras.reduce((total, item) => total + (item.linksCount || 0), 0);
for (const [key, values] of Object.entries(old.filters || {})) {
  if (Array.isArray(values)) current.filters[key] = [...new Set([...(current.filters[key] || []), ...values])];
}
await writeJsonAtomic('public/data/vod-index.json', current);
await writeJsonAtomic('public/data/title-map.json', { ...oldMap, ...currentMap });
console.log(JSON.stringify({ preservedPublisherProfiles: extras.length, indexedTitles: current.totalTitles }));
