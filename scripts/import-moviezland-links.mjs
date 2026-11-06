import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { writeJsonAtomic } from './atomic-json.mjs';
import { contentRestriction } from '../lib/content-restrictions.mjs';

export const titleKey = value => String(value).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
export function fileIdentity(name) {
  const episode = name.match(/^(.*?)\bS(\d{1,2})[ ._-]*E(\d{1,3})\b/i);
  if (episode) return { key: titleKey(episode[1].replace(/[ ._-]+(?:19|20)\d{2}[ ._-]*$/, '')), season: +episode[2], episode: +episode[3] };
  const movie = name.match(/^(.*?)[ ._-]+((?:19|20)\d{2})(?:[ ._-]|$)/);
  return movie ? { key: titleKey(movie[1]), year: +movie[2] } : null;
}

export async function importLinks(input) {
  const matches = JSON.parse(await readFile('.media-cache/vod-sync/movielandz-donyaye-match.json', 'utf8')).matches;
  const index = JSON.parse(await readFile('public/data/vod-index.json', 'utf8')).items;
  const catalog = new Map(index.map(item => [item.imdbCode, item]));
  const byKey = new Map();
  for (const match of matches) {
    if (!match.donyayeSerialSourceUrl || contentRestriction(match)) continue;
    const item = catalog.get(match.imdbCode); if (!item) continue;
    const key = titleKey(match.title);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push({ ...match, type: item.type });
  }
  const queue = [], seen = new Set(), files = new Map(), errors = [];
  function directory(raw) {
    try { const url = new URL(raw); if (url.hostname !== 'dl.moviezland.ir' || url.search || !url.pathname.endsWith('/') || !/^\/(?:movies|serial)\//.test(url.pathname)) return;
      if (!seen.has(url.href)) { seen.add(url.href); queue.push(url.href); }
    } catch { /* Ignore asset and malformed URLs in crawler output. */ }
  }
  (await readFile(input, 'utf8')).split(/\r?\n/).forEach(directory);
  let cursor = 0, completed = 0;
  // Process a finite wave at a time so newly discovered nested directories are included.
  while (cursor < queue.length) {
    const wave = queue.slice(cursor, cursor + 6); cursor += wave.length;
    await Promise.all(wave.map(async sourceUrl => {
      try {
        const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(20000), redirect: 'error' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
          const href = row[1].match(/href="([^"]+)"/i)?.[1]; if (!href || href.startsWith('?') || href === '../') continue;
          const url = new URL(href.replaceAll('&amp;', '&'), sourceUrl);
          if (url.hostname !== 'dl.moviezland.ir') continue;
          if (url.pathname.endsWith('/')) { directory(url.href); continue; }
          if (!/\.(?:mkv|mp4|m4v|webm)$/i.test(url.pathname)) continue;
          let name; try { name = decodeURIComponent(url.pathname.split('/').at(-1)); } catch { continue; }
          const size = row[1].match(/class="size"[^>]*>([^<]+)/i)?.[1]?.trim();
          // Small MP4 files in this archive are trailers; require a full-length release size.
          const bytes = size?.match(/^([\d.]+)\s*(GiB|MiB|KiB|B)$/i);
          const amount = bytes ? +bytes[1] * ({ gib: 1024 ** 3, mib: 1024 ** 2, kib: 1024, b: 1 }[bytes[2].toLowerCase()]) : 0;
          if (amount < 80 * 1024 ** 2 || /trailer|teaser|sample|promo/i.test(name)) continue;
          const identity = fileIdentity(name); if (!identity) continue;
          const candidates = (byKey.get(identity.key) || []).filter(item => identity.season
            ? /series/i.test(item.type) : !/series/i.test(item.type) && item.year === identity.year);
          if (candidates.length !== 1) continue;
          const match = candidates[0], quality = name.match(/(?:2160|1080|720|480|360)p/i)?.[0] ?? null;
          const group = /dub|farsi/i.test(name) ? 'Dubbed' : /hardsub/i.test(name) ? 'HardSub' : /softsub/i.test(name) ? 'SoftSub' : 'Original';
          files.set(url.href, { id: match.imdbCode, link: { url: url.href, sourceProvider: 'moviezland', sourceUrl: match.movieLandzPage,
            label: `${quality || 'Video'} / ${group} / MovieLandz`, quality, group, size: size || null, release: name.match(/WEB[ ._-]?DL|BluRay|WEBRip|HDTV/i)?.[0] ?? null,
            season: identity.season ?? null, episode: identity.episode ?? null, fileName: name, mediaKind: 'video', directoryUrl: sourceUrl } });
        }
      } catch (error) { errors.push({ sourceUrl, error: error.message }); }
      completed++;
    }));
    if (completed % 60 < 6) console.log(JSON.stringify({ directories: completed, queued: queue.length, matchedFiles: files.size }));
  }
  const items = {}; let verified = 0;
  const entries = [...files.values()]; cursor = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (cursor < entries.length) {
      const { id, link } = entries[cursor++];
      try {
        const response = await fetch(link.url, { headers: { Range: 'bytes=0-31' }, signal: AbortSignal.timeout(15000), redirect: 'error' });
        const reader = response.body?.getReader();
        let prefix = Buffer.alloc(0);
        try { while (reader && prefix.length < 16) { const part = await reader.read(); if (part.done) break; prefix = Buffer.concat([prefix, Buffer.from(part.value).subarray(0, 32)]); } }
        finally { await reader?.cancel(); }
        if (![200, 206].includes(response.status) || !(prefix.subarray(0, 4).toString('hex') === '1a45dfa3' || prefix.toString('ascii', 4, 8) === 'ftyp')) continue;
        (items[id] ??= { links: [] }).links.push({ ...link, verifiedAt: new Date().toISOString() }); verified++;
      } catch { /* Unreachable files are excluded from the published snapshot. */ }
      if (cursor % 100 === 0) console.log(JSON.stringify({ probed: cursor, candidates: entries.length, verified }));
    }
  }));
  if (!verified) throw new Error('No verified files; retaining the previous published snapshot');
  await writeJsonAtomic('lib/data/moviezland-source-links.json', { version: 1, items });
  const report = { generatedAt: new Date().toISOString(), directories: completed, candidateFiles: entries.length, verifiedFiles: verified, matchedTitles: Object.keys(items).length, errors };
  await writeJsonAtomic('.media-cache/vod-sync/moviezland-import-report.json', report);
  console.log(JSON.stringify(report));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await importLinks(process.argv[2]);
