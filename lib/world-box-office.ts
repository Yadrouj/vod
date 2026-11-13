import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseWorldBoxOffice } from '../scripts/lib/world-box-office.mjs';

export type WorldBoxOffice = { version: number; year: number; observedAt: string; sourceUrl: string; currency: string; metric: string;
  films: { rank: number; title: string; worldwideUsd: number; domesticUsd: number | null; internationalUsd: number | null; sourceUrl: string }[] };
let cached: WorldBoxOffice | null = null;
let checked = 0;
let pending: Promise<WorldBoxOffice | null> | null = null;
export async function loadWorldBoxOffice(): Promise<WorldBoxOffice | null> {
  if (checked > Date.now() - 3600_000) return cached;
  if (pending) return pending;
  pending = (async () => {
    try {
      const file = path.join(process.env.VOD_DATA_DIR || 'public/data', 'world-box-office.json');
      try { const value = JSON.parse(await readFile(file, 'utf8')) as WorldBoxOffice; if (value.currency === 'USD' && value.films?.length && Number.isFinite(Date.parse(value.observedAt)) && (!cached || Date.parse(value.observedAt) > Date.parse(cached.observedAt))) cached = value; } catch { /* Retain last-good snapshot. */ }
      const year = Number(new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Tehran' }).format(new Date()));
      const response = await fetch(`https://www.boxofficemojo.com/year/world/${year}/`, { signal: AbortSignal.timeout(7000), next: { revalidate: 3600 } });
      if (response.ok) cached = parseWorldBoxOffice(await response.text(), year) as WorldBoxOffice;
    } catch { /* Retain original observation date; do not pretend an outage is fresh. */ }
    finally { checked = Date.now(); pending = null; }
    return cached;
  })();
  return pending;
}
