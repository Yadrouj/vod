// Public name labels only. No runtime page request depends on Wikidata.
import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as pause } from 'node:timers/promises';
const target = new URL('../lib/data/person-name-labels.json', import.meta.url);
const people = JSON.parse(await readFile(new URL('../public/data/vod-people.json', import.meta.url), 'utf8')).people;
const labels = JSON.parse(await readFile(target, 'utf8'));
const limit = Number(process.argv.find(value => value.startsWith('--limit='))?.split('=')[1] || 1000);
const ids = Object.values(people).filter(p => /^nm\d+$/.test(p.id) && !labels[p.id])
  .sort((a, b) => b.items.length - a.items.length).slice(0, limit).map(p => p.id);
let received = 0;
for (let offset = 0; offset < ids.length; offset += 250) {
  const batch = ids.slice(offset, offset + 250);
  const query = `SELECT ?id ?person ?nameFa ?nameEn WHERE { VALUES ?id { ${batch.map(id => JSON.stringify(id)).join(' ')} }
    ?person <http://www.wikidata.org/prop/direct/P345> ?id.
    ?person <http://www.w3.org/2000/01/rdf-schema#label> ?nameFa. FILTER(LANG(?nameFa)="fa")
    OPTIONAL { ?person <http://www.w3.org/2000/01/rdf-schema#label> ?nameEn. FILTER(LANG(?nameEn)="en") } }`;
  const response = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query), {
    headers: { 'User-Agent': 'SarvNema/1.0 (https://sarvnema.ir; public bilingual person labels)' }, signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`Wikidata HTTP ${response.status}; completed batches retained`);
  const rows = (await response.json()).results.bindings;
  const grouped = new Map();
  for (const row of rows) {
    const id = row.id?.value, nameFa = row.nameFa?.value;
    if (!batch.includes(id) || !/[آ-ی]/u.test(nameFa || '')) continue;
    const group = grouped.get(id) || [];
    group.push({ nameFa, name: row.nameEn?.value || people[id].name, source: row.person.value.replace('http:', 'https:') });
    grouped.set(id, group);
  }
  for (const [id, candidates] of grouped) {
    // Ambiguous IMDb IDs must not silently merge namesakes.
    if (candidates.length === 1) { labels[id] = candidates[0]; received++; }
  }
  await writeFile(target, JSON.stringify(Object.fromEntries(Object.entries(labels).sort(([a], [b]) => a.localeCompare(b))), null, 2) + '\n');
  console.log(JSON.stringify({ scanned: offset + batch.length, requested: ids.length, translated: received }));
  await pause(5000);
}
