import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { writeJsonAtomic } from './atomic-json.mjs';
import { buildDirectPlan, probeMedia } from './lib/moviezland-direct.mjs';

export async function importDirect(input, { audit = false } = {}) {
  if (!input) throw new Error('Usage: node scripts/import-moviezland-direct.mjs movie_urls.txt [--audit]');
  const text = await readFile(input, 'utf8');
  const catalog = JSON.parse(await readFile('public/data/vod-index.json', 'utf8')).items;
  const mapping = JSON.parse(await readFile('lib/data/movielandz-donyaye-match.json', 'utf8')).matches;
  const profiles = (await Promise.all(['iranian', 'regional', 'publisher'].map(async name => {
    try { return JSON.parse(await readFile(`lib/data/moviezland-${name}-profiles.json`, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  }))).flat();
  const plan = buildDirectPlan(text, catalog, mapping, profiles);
  const reportFile = '.media-cache/vod-sync/moviezland-direct-report.json';
  const provenance = { inputSha256: createHash('sha256').update(text).digest('hex'), inputLines: text.split(/\r?\n/).length };
  const summary = { ...provenance, generatedAt: new Date().toISOString(), uniqueMediaFiles: plan.uniqueMediaFiles, rejected: plan.rejected,
    candidates: plan.candidates.length, candidateTitles: new Set(plan.candidates.map(item => item.id)).size, unresolvedFiles: plan.unresolved.length };
  console.log(JSON.stringify(summary));
  if (audit) { await writeJsonAtomic(reportFile, { ...summary, unresolved: plan.unresolved }); return; }
  let cache = {};
  try { cache = JSON.parse(await readFile('.media-cache/vod-sync/moviezland-direct-probes.json', 'utf8')); } catch { /* First verification. */ }
  try {
    const prior = JSON.parse(await readFile(reportFile, 'utf8'));
    for (const failure of prior.failures || []) if (/Missing or insufficient|signature|HTTP 404/.test(failure.error) && !cache[failure.url]?.verifiedAt) {
      cache[failure.url] = { failedAt: prior.generatedAt, error: failure.error };
    }
  } catch { /* A first run has no probe report. */ }
  for (const file of ['lib/data/moviezland-source-links.json', 'lib/data/moviezland-direct-source-links.json']) {
    try {
      for (const entry of Object.values(JSON.parse(await readFile(file, 'utf8')).items || {})) {
        for (const link of entry.links || []) if (link.verifiedAt && !cache[link.url]) cache[link.url] = { verifiedAt: link.verifiedAt, legacyVerified: true };
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const items = {}, failures = [], matches = []; let cursor = 0, processed = 0, verified = 0;
  const concurrency = Math.min(12, Math.max(1, Number(process.env.MOVIEZLAND_PROBE_CONCURRENCY || 8)));
  let saving = Promise.resolve();
  function checkpoint() {
    saving = saving.then(() => writeJsonAtomic('.media-cache/vod-sync/moviezland-direct-probes.json', cache));
    return saving;
  }
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < plan.candidates.length) {
      const candidate = plan.candidates[cursor++], { id, link } = candidate;
      try {
        let result = cache[link.url];
        if (result?.failedAt && Date.parse(result.failedAt) > Date.now() - 86400000) throw new Error(result.error);
        if (!result?.verifiedAt || Date.parse(result.verifiedAt) < Date.now() - 7 * 86400000) result = await probeMedia(link.url, link.episode != null);
        cache[link.url] = result;
        const enriched = { ...link, ...result, size: result.bytes ? `${(result.bytes / 1024 ** 2).toFixed(1)} MiB` : null };
        (items[id] ??= { links: [] }).links.push(enriched); verified++;
        matches.push({ imdbCode: id, title: candidate.title, matchType: candidate.matchType, publisherPage: link.sourceUrl, publisherFile: link.url, season: link.season, episode: link.episode });
      } catch (error) { failures.push({ id, url: link.url, error: error.message }); }
      processed++;
      if (processed % 100 === 0) { console.log(JSON.stringify({ processed, total: plan.candidates.length, verified, failures: failures.length })); await checkpoint(); }
    }
  }));
  await checkpoint();
  if (!verified) throw new Error('No verified files; preserving previous snapshot');
  // Keep the legacy map-only import separate; this user-supplied list expands its scope.
  await writeJsonAtomic('lib/data/moviezland-direct-source-links.json', { version: 1, ...provenance, generatedAt: new Date().toISOString(), items });
  await writeJsonAtomic('lib/data/moviezland-direct-index.json', Object.fromEntries(Object.entries(items).map(([id, item]) => [id, {
    linksCount: item.links.length, qualities: [...new Set(item.links.map(link => link.quality).filter(Boolean))],
    groups: [...new Set(item.links.map(link => link.group).filter(Boolean))], publisherSourceUrl: item.links[0].sourceUrl,
  }])));
  await writeJsonAtomic(reportFile, { ...summary, verifiedFiles: verified, matchedTitles: Object.keys(items).length, matches, failures, unresolved: plan.unresolved });
  console.log(JSON.stringify({ ...summary, verifiedFiles: verified, matchedTitles: Object.keys(items).length, failures: failures.length, report: reportFile }));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) importDirect(process.argv[2], { audit: process.argv.includes('--audit') }).catch(error => { console.error(error); process.exitCode = 1; });
