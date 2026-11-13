import path from 'node:path';
import { parseWorldBoxOffice } from './lib/world-box-office.mjs';
import { writeJsonAtomic } from './atomic-json.mjs';

const year = Number(new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Tehran' }).format(new Date()));
const url = `https://www.boxofficemojo.com/year/world/${year}/`;
const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { accept: 'text/html' } });
if (!response.ok) throw new Error(`Box Office Mojo returned ${response.status}; existing snapshot retained`);
const result = parseWorldBoxOffice(await response.text(), year);
await writeJsonAtomic(path.join(process.env.VOD_DATA_DIR || 'public/data', 'world-box-office.json'), result);
console.log(JSON.stringify({ films: result.films.length, year, observedAt: result.observedAt }));
