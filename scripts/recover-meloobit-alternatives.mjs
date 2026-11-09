import { readFile } from 'node:fs/promises';
import { recoveryCandidates, isMp3Prefix } from './melodify-source-recovery.mjs';
import { writeJsonAtomic } from './atomic-json.mjs';

const index = JSON.parse(await readFile('public/data/music-index.json', 'utf8'));
const targets = index.tracks.filter(track => track.sources.some(source => source.provider === 'meloobit'));
const candidates = recoveryCandidates({ tracks: targets }, index);
let verified;
try { verified = JSON.parse(await readFile('lib/data/music-source-replacements.json', 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; verified = {}; }
const checks = [];
const cache = new Map();
const deadline = Date.now() + 240000;
for (const track of candidates) {
  if (Date.now() >= deadline) break;
  for (const source of track.sources.filter(source => source.provider !== 'meloobit')) {
    if (!cache.has(source.url)) {
      let ok = false;
      try {
        const response = await fetch(source.url, { headers: { Range: 'bytes=0-4095' }, signal: AbortSignal.timeout(10000) });
        const reader = response.body?.getReader();
        try {
          const prefix = await reader?.read();
          ok = [200, 206].includes(response.status) && !/text|html|json/i.test(response.headers.get('content-type') || '') && Boolean(prefix?.value && isMp3Prefix(prefix.value));
        } finally { await reader?.cancel(); }
      } catch { /* Keep existing sources when a candidate cannot be verified. */ }
      cache.set(source.url, ok);
      checks.push({ url: source.url, ok });
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (cache.get(source.url)) {
      (verified[track.id] ||= []).push({ ...source, available: true, checkedAt: new Date().toISOString(), kind: 'stream' });
      break;
    }
  }
}
await writeJsonAtomic('lib/data/music-source-replacements.json', verified);
await writeJsonAtomic('.media-cache/music-recovery/meloobit-report.json', { checkedAt: new Date().toISOString(), targets: targets.length, recovered: Object.keys(verified).length, checks });
console.log(JSON.stringify({ targets: targets.length, recovered: Object.keys(verified).length, probes: checks.length }));
