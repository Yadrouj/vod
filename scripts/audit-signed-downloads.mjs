import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { streamVodArchiveItems } from './vod-json-stream.mjs';
import { writeJsonAtomic } from './atomic-json.mjs';
import { sourceLinkExpiry } from '../lib/alternative-source-links.mjs';
import { contentRestriction } from '../lib/content-restrictions.mjs';
import { normalizeDownload, sourceIdentity } from './public-vod-sources.mjs';

/** Read-only network audit. Raw catalogues, publisher credentials and live files
 * are never modified; reports are kept in the ignored media cache.
 */
export async function auditSignedDownloads(file, { limit = 0, fetchImpl = fetch, now = Date.now() } = {}) {
  const report = { observedAt: new Date(now).toISOString(), titles: 0, signedLinks: 0, expiredLinks: 0, affectedTitles: 0, providers: {}, checked: [] };
  const targets = new Map();
  await streamVodArchiveItems(file, item => {
    report.titles++;
    const signed = (item.links || []).filter(link => Number.isFinite(sourceLinkExpiry(link)) && sourceLinkExpiry(link) > 0);
    const expired = signed.filter(link => sourceLinkExpiry(link) <= now);
    report.signedLinks += signed.length; report.expiredLinks += expired.length;
    for (const link of signed) {
      const provider = link.sourceProvider || 'unknown';
      const counts = report.providers[provider] ||= { signed: 0, expired: 0 };
      counts.signed++; if (sourceLinkExpiry(link) <= now) counts.expired++;
    }
    if (!expired.length) return;
    report.affectedTitles++;
    if (contentRestriction(item)) return;
    const publisher = expired.find(link => link.sourceProvider === 'familymovie')?.sourceUrl
      || [item.sourcePageUrl, ...(item.curatedSourcePages || [])].find(url => /^https:\/\/familymovie\.tr\/\?movie=/.test(url || ''));
    let page;
    try { page = new URL(publisher); } catch { return; }
    const publisherId = page.searchParams.get('movie');
    if (page.origin !== 'https://familymovie.tr' || page.pathname !== '/' || !/^[a-z0-9_-]{1,120}$/i.test(publisherId || '')) return;
    if (!targets.has(page.href)) targets.set(page.href, { id: item.imdbCode || item.id, title: item.title, identity: sourceIdentity(item), page: page.href, publisherId,
      hosts: new Set(signed.map(link => new URL(link.url).hostname)) });
  });
  // The reported MobLand failure is always checked first, then a bounded sample.
  const selected = [...targets.values()].sort((a, b) => Number(b.id === 'tt31510819') - Number(a.id === 'tt31510819')).slice(0, Math.max(0, Math.min(1000, limit)));
  for (const target of selected) {
    const result = { id: target.id, title: target.title, publisherPage: target.page, probes: [] };
    try {
      const response = await fetchImpl(`https://familymovie.tr/api/media/single?id=${encodeURIComponent(target.publisherId)}`, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000) });
      if (!response.ok) throw Error(`publisher_http_${response.status}`);
      const detail = await response.json();
      if (detail.id !== target.publisherId || sourceIdentity(detail) !== target.identity || !Array.isArray(detail.downloads)) throw Error('publisher_identity_mismatch');
      const links = detail.downloads.slice(0, 1000).map(download => normalizeDownload(download, { provider: 'familymovie', pageUrl: target.page, minTtlMs: 120_000, now })).filter(Boolean);
      result.freshLinks = links.length;
      const sample = (target.id === 'tt31510819' ? links.filter(link => link.season === 2 && link.episode === 7 && link.quality === '720p' && link.group === 'Dubbed') : links).slice(0, 1);
      for (const link of sample) {
        if (!target.hosts.has(new URL(link.url).hostname)) { result.probes.push({ skipped: 'publisher_changed_host' }); continue; }
        const upstream = await fetchImpl(link.url, { headers: { Range: 'bytes=0-1023' }, redirect: 'manual', signal: AbortSignal.timeout(12_000) });
        const status = upstream.status, type = upstream.headers.get('content-type') || '', range = upstream.headers.get('content-range');
        // Do not download the full media if a server ignores Range.
        if (status !== 206) { await upstream.body?.cancel(); result.probes.push({ status, contentType: type, valid: false }); continue; }
        const bytes = new Uint8Array(await upstream.arrayBuffer());
        const magic = Buffer.from(bytes.slice(0, 4)).toString('hex');
        const media = magic === '1a45dfa3' || Buffer.from(bytes.slice(4, 8)).toString() === 'ftyp';
        result.probes.push({ url: link.url, quality: link.quality, group: link.group, season: link.season, episode: link.episode,
          status, contentType: type, range, bytes: bytes.length, valid: bytes.length <= 1024 && /^(?:video\/|application\/octet-stream)/i.test(type) && media });
      }
    } catch (error) { result.error = error.message; }
    report.checked.push(result);
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2] || 'public/data/vod-catalog.json';
  const output = process.argv[3] || '.media-cache/vod-sync/signed-download-audit.json';
  const limit = Number(process.argv.find(value => value.startsWith('--check='))?.split('=')[1] || 0);
  const report = await auditSignedDownloads(path.resolve(file), { limit });
  await writeJsonAtomic(output, report);
  console.log(JSON.stringify({ output, ...report, checked: report.checked.map(({ probes, ...item }) => ({ ...item, probes: probes.map(({ url, ...probe }) => probe) })) }, null, 2));
}
