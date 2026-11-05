import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { donyayeLinkKey, applyDonyayeLinkUpdates, mergeDonyayeUpdateSets } from '../lib/donyaye-link-updates.mjs';
import { contentRestriction } from '../lib/content-restrictions.mjs';
import { probeDonyayeMedia } from './donyaye-link-health.mjs';

export async function refreshDonyayeLinks(source, { titleDir, initial, probe = probeDonyayeMedia, limit = 800, observedFailures = [], onProgress = () => {} } = {}) {
  let updates = mergeDonyayeUpdateSets(initial || { version: 1, items: {} }, { version: 1, items: {} });
  const report = { sourceTitles: source.items.length, comparedTitles: 0, probes: 0, added: 0, replaced: 0, keptHealthy: 0,
    unavailableCandidates: 0, restrictedSkipped: 0, quarantined: 0, restored: 0, recheckedHealthy: 0, budgetExhausted: false, checks: [] };
  const cache = new Map();
  const check = async url => {
    if (cache.has(url)) return cache.get(url);
    if (report.probes >= limit) { report.budgetExhausted = true; return { state: 'budget-exhausted' }; }
    report.probes++;
    const result = await probe(url); cache.set(url, result);
    report.checks.push({ url, ...result });
    if (report.probes % 50 === 0) onProgress({ probes: report.probes, added: report.added, replaced: report.replaced, quarantined: report.quarantined });
    return result;
  };
  const incomingItems = new Map(source.items.map(item => [item.imdbCode || item.id, item]));
  const observed = new Map();
  for (const [id, patch] of Object.entries(updates.items || {})) {
    const urls = [...(patch.checks || []).map(row => row.url), ...(patch.links || []).map(link => link.url),
      ...(patch.replacements || []).flatMap(row => [row.fromUrl, row.link.url])];
    if (urls.length) observed.set(id, [...new Set(urls)]);
  }
  for (const row of observedFailures) {
    const id = row.itemId;
    if (!/^tt\d{5,12}$/.test(id) || !donyayeLinkKey(row.url)) continue;
    observed.set(id, [...new Set([...(observed.get(id) || []), row.url])]);
  }
  for (const id of observed.keys()) if (!incomingItems.has(id)) incomingItems.set(id, { imdbCode: id, links: [] });
  for (const incoming of incomingItems.values()) {
    const id = incoming.imdbCode || incoming.id;
    if (!/^tt\d{5,12}$/.test(id)) continue;
    if (contentRestriction(incoming)) { report.restrictedSkipped++; continue; }
    let raw;
    try { raw = JSON.parse(await readFile(path.join(titleDir, `${id}.json`), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    const item = applyDonyayeLinkUpdates(raw, updates);
    const links = [...item.links, ...(item.f2myExtraLinks || [])];
    const byKey = new Map(links.map(link => [donyayeLinkKey(link.url), link]).filter(([key]) => key));
    report.comparedTitles++;
    const patch = { links: [], replacements: [], checks: [] };
    for (const url of observed.get(id) || []) {
      if (![...(raw.links || []), ...(raw.f2myExtraLinks || [])].some(link => link.url === url) && !donyayeLinkKey(url)?.includes(`/${id}/`)) continue;
      let checked = await check(url);
      if (checked.state === 'missing') {
        if (report.probes >= limit) { report.budgetExhausted = true; continue; }
        // Confirm absence independently, not using the URL cache.
        report.probes++; checked = await probe(url);
        report.checks.push({ url, confirmation: true, ...checked });
      }
      if (!['missing', 'verified'].includes(checked.state)) continue;
      patch.checks.push({ url, state: checked.state, checkedAt: checked.checkedAt || new Date().toISOString() });
      if (checked.state === 'verified') {
        if (updates.items?.[id]?.checks?.some(row => row.url === url && row.state === 'missing')) report.restored++;
        else report.recheckedHealthy++;
        continue;
      }
      const candidate = (incoming.links || []).find(link => link.url !== url && donyayeLinkKey(link.url) === donyayeLinkKey(url));
      if (candidate) {
        const healthy = await check(candidate.url);
        if (healthy.state === 'verified') {
          patch.replacements.push({ fromUrl: url, link: { ...candidate, sourceProvider: 'donyayeserial',
            sourceUrl: source.sourceUrl, verifiedAt: healthy.checkedAt || new Date().toISOString() } });
          report.replaced++; continue;
        }
      }
      report.quarantined++;
    }
    for (const link of incoming.links || []) {
      const key = donyayeLinkKey(link.url);
      if (!key || !key.includes(`/${id}/`) || contentRestriction({ itemId: id, url: link.url })) continue;
      const existing = byKey.get(key);
      if (existing?.url === link.url) continue;
      if (existing) {
        const oldCheck = await check(existing.url);
        if (oldCheck.state === 'verified') { report.keptHealthy++; continue; }
        // Network/region/auth failures are not evidence that a file moved.
        if (oldCheck.state !== 'missing') continue;
      }
      const verified = await check(link.url);
      if (verified.state !== 'verified') { report.unavailableCandidates++; continue; }
      const next = { ...link, sourceProvider: 'donyayeserial', sourceUrl: source.sourceUrl, verifiedAt: verified.checkedAt || new Date().toISOString() };
      if (existing) { patch.replacements.push({ fromUrl: existing.url, link: next }); report.replaced++; }
      else { patch.links.push(next); byKey.set(key, next); report.added++; }
    }
    if (patch.links.length || patch.replacements.length || patch.checks.length) updates = mergeDonyayeUpdateSets(updates,
      { version: 1, checkedAt: new Date().toISOString(), items: { [id]: patch } });
  }
  return { updates, report };
}

async function main() {
  const sourceFile = process.argv[2];
  if (!sourceFile) throw new Error('Usage: node scripts/refresh-donyaye-links.mjs SOURCE_JSON [OUTPUT_JSON] [REPORT_JSON]');
  const dataDir = path.resolve(process.env.VOD_DATA_DIR || 'public/data');
  const output = process.argv[3] || path.join(dataDir, 'donyaye-link-updates.json');
  const read = async file => JSON.parse(await readFile(file, 'utf8'));
  const bundled = await read(path.join(path.dirname(fileURLToPath(import.meta.url)), '../lib/data/donyaye-link-updates.json'));
  const previous = await read(output).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  const source = await read(sourceFile);
  if (!Array.isArray(source.items) || !source.items.length) throw new Error('Empty/invalid source snapshot; repairs preserved');
  const failures = process.env.DONYAYE_REPAIR_FAILURES_FILE ? await read(process.env.DONYAYE_REPAIR_FAILURES_FILE) : [];
  const result = await refreshDonyayeLinks(source, { titleDir: path.join(dataDir, 'titles'),
    initial: mergeDonyayeUpdateSets(bundled, previous), observedFailures: failures,
    onProgress: progress => console.log(JSON.stringify({ phase: 'donyaye-media-verification', ...progress })),
    limit: Math.max(1, Math.min(5000, Number(process.env.DONYAYE_REPAIR_PROBE_LIMIT) || 800)) });
  result.updates.sourceUrl = source.sourceUrl;
  result.updates.sourceSnapshotAt = source.scrapedAt || null;
  await mkdir(path.dirname(output), { recursive: true });
  const temp = `${output}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(result.updates, null, 2)); await rename(temp, output);
  if (process.argv[4]) await writeFile(process.argv[4], JSON.stringify(result.report, null, 2));
  console.log(JSON.stringify({ ...result.report, checks: undefined, output }, null, 2));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch(error => { console.error(error); process.exitCode = 1; });
