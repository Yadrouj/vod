import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alternativeMediaKey, applyAlternativeSourceUpdates, isDonyayeSource, mergeAlternativeSourceUpdates, sourceLinkExpiry } from '../lib/alternative-source-links.mjs';
import { contentRestriction } from '../lib/content-restrictions.mjs';
import { parseSeasonEpisode } from './moviesho-source-lib.mjs';

const approvedHost = host => /(?:^|\.)(?:moviesho\.com|upera\.tv|abrtech\.top|tmk51\.ir\.cdn\.ir|yserver675mufdv\.top|zxupload6137hgv\.fun|cartoonet\.ir)$/i.test(host);
const approvedPage = link => {
  try {
    const host = new URL(link.sourceUrl).hostname;
    return ({ moviesho: /(?:^|\.)moviesho\.com$/i, familymovie: /(?:^|\.)familymovie\.tr$/i,
      f2my: /(?:^|\.)f2my\.top$/i, zardfilm: /(?:^|\.)zardfilm\.in$/i })[link.sourceProvider]?.test(host) === true;
  } catch { return false; }
};

export async function probeAlternativeMedia(url, { fetchImpl = fetch, timeoutMs = 7000 } = {}) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (let redirect = 0; redirect < 5; redirect++) {
      const target = new URL(url);
      if (!/^https?:$/.test(target.protocol) || target.username || target.password || !approvedHost(target.hostname)) return { state: 'unapproved-host' };
      const response = await fetchImpl(url, { redirect: 'manual', signal: controller.signal, headers: { Range: 'bytes=0-1023', 'user-agent': 'SarvNema-Link-Refresh/1.0' } });
      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) { await response.body?.cancel(); url = new URL(location, url).href; continue; }
      if (![200, 206].includes(response.status)) { await response.body?.cancel(); return { state: 'unverified', status: response.status }; }
      const reader = response.body?.getReader(); let prefix = Buffer.alloc(0);
      if (reader) try { while (prefix.length < 16) {
        const chunk = await reader.read(); if (chunk.done) break;
        prefix = Buffer.concat([prefix, Buffer.from(chunk.value).subarray(0, 16 - prefix.length)]);
      } } finally { await reader.cancel(); }
      const verified = prefix.subarray(0, 4).toString('hex') === '1a45dfa3' || prefix.toString('ascii', 4, 8) === 'ftyp';
      return { state: verified ? 'verified' : 'unverified', status: response.status, checkedAt: new Date().toISOString() };
    }
    return { state: 'redirect-limit' };
  } catch (error) { return { state: 'unverified', error: error.message }; }
  finally { clearTimeout(timer); controller.abort(); }
}

export async function refreshAlternativeSources(sources, { titleDir, initial, probe = probeAlternativeMedia, limit = 800,
  deadline = Infinity, concurrency = 4, onProgress = () => {} } = {}) {
  let updates = mergeAlternativeSourceUpdates(initial, null);
  const report = { comparedTitles: 0, matchedTitles: 0, candidates: 0, probes: 0, verified: 0, unverified: 0,
    restrictedSkipped: 0, alreadyCurrent: 0, expiredSkipped: 0, budgetExhausted: false, titles: [], checks: [] };
  const buckets = new Map();
  for (const incoming of sources.flatMap(source => source.items || [])) {
    const id = incoming.imdbCode || incoming.id;
    if (!/^tt\d{5,12}$/.test(id)) continue;
    if (contentRestriction(incoming)) { report.restrictedSkipped++; continue; }
    let raw; try { raw = JSON.parse(await readFile(path.join(titleDir, `${id}.json`), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if ((raw.imdbCode || raw.id) !== id || contentRestriction(raw)) continue;
    report.comparedTitles++;
    if (!raw.links?.some(isDonyayeSource)) continue;
    report.matchedTitles++;
    const current = applyAlternativeSourceUpdates(raw, updates);
    const existing = new Set(current.links.map(link => link.url));
    const bucket = buckets.get(id) || new Map();
    for (const link of incoming.links || []) {
      if (!alternativeMediaKey(link) || !approvedPage(link) || !approvedHost(new URL(link.url).hostname)) continue;
      if (sourceLinkExpiry(link) < Date.now() + 6 * 60 * 60_000) { report.expiredSkipped++; continue; }
      if (/series/i.test(raw.type)) {
        const parsed = parseSeasonEpisode(link.fileName || link.url);
        // Public API episode fields must agree with the real release name.
        if (!parsed.season || !parsed.episode || parsed.season !== link.season || parsed.episode !== link.episode) continue;
      } else if (link.season || link.episode) continue;
      if (existing.has(link.url)) { report.alreadyCurrent++; continue; }
      bucket.set(link.url, link);
    }
    if (bucket.size) buckets.set(id, bucket);
  }
  // Round-robin prevents a large series from consuming the whole budget before
  // other films/series get even one alternative.
  const lists = [...buckets].map(([id, links]) => ({ id, links: [...links.values()] })), queue = [];
  for (let i = 0; lists.some(bucket => bucket.links.length > i); i++) for (const bucket of lists) {
    if (bucket.links[i]) queue.push({ id: bucket.id, link: bucket.links[i] });
  }
  report.candidates = queue.length;
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(4, concurrency)) }, async () => {
    while (cursor < queue.length) {
      if (report.probes >= limit || Date.now() >= deadline) { report.budgetExhausted = true; return; }
      const { id, link } = queue[cursor++]; report.probes++;
      const result = await probe(link.url);
      report.checks.push({ itemId: id, url: link.url, ...result });
      if (result.state !== 'verified') { report.unverified++; continue; }
      const verified = { ...link, verifiedAt: result.checkedAt || new Date().toISOString() };
      updates = mergeAlternativeSourceUpdates(updates, { version: 1, items: { [id]: { links: [verified] } } });
      report.verified++;
      if (!report.titles.includes(id)) report.titles.push(id);
      if (report.verified % 50 === 0) onProgress({ probes: report.probes, verified: report.verified, titles: report.titles.length });
    }
  }));
  return { updates, report };
}

async function main() {
  const sourceFile = process.argv[2]; if (!sourceFile) throw new Error('Usage: refresh-alternative-sources.mjs SOURCE_JSON [OUTPUT_JSON] [REPORT_JSON]');
  const dataDir = path.resolve(process.env.VOD_DATA_DIR || 'public/data');
  const output = process.argv[3] || path.join(dataDir, 'alternative-source-links.json');
  const read = async file => JSON.parse(await readFile(file, 'utf8'));
  const bundled = await read(new URL('../lib/data/alternative-source-links.json', import.meta.url));
  const previous = await read(output).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  const source = await read(sourceFile); if (!Array.isArray(source.items)) throw new Error('Invalid source snapshot; alternatives preserved');
  const result = await refreshAlternativeSources([source], { titleDir: path.join(dataDir, 'titles'), initial: mergeAlternativeSourceUpdates(bundled, previous),
    limit: Math.min(4000, Math.max(1, Number(process.env.ALTERNATIVE_SOURCE_PROBE_LIMIT) || 800)),
    deadline: Math.min(Number(process.env.MAINTENANCE_DEADLINE) || Infinity, Date.now() + (Number(process.env.ALTERNATIVE_SOURCE_BUDGET_MS) || 240000)),
    onProgress: value => console.log(JSON.stringify({ phase: 'alternative-media-verification', ...value })) });
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`; await writeFile(temporary, JSON.stringify(result.updates, null, 2)); await rename(temporary, output);
  if (process.argv[4]) await writeFile(process.argv[4], JSON.stringify(result.report, null, 2));
  console.log(JSON.stringify({ ...result.report, checks: undefined, output }));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch(error => { console.error(error); process.exitCode = 1; });
