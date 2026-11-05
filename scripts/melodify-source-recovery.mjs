import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const normalize = value => String(value || '').normalize('NFKC').toLowerCase()
  .replace(/[\u064a\u0649]/gu, '\u06cc').replace(/\u0643/gu, '\u06a9')
  .replace(/[^\p{L}\p{N}]/gu, '');
const artists = track => (track.artists || [track.artist]).flatMap(a => [a.name, a.slug, ...(a.aliases || [])]).map(normalize).filter(Boolean);
const titles = track => {
  const names = (track.artists || [track.artist]).flatMap(a => [a.name, ...(a.aliases || [])]).filter(Boolean);
  const variants = [track.title, track.persianTitle].filter(Boolean).flatMap(title => {
    const text = title.normalize('NFKC').trim();
    // Some provider headings include the exact credited singer before the title.
    // Strip only a whole, separated prefix, never arbitrary words/substrings.
    return [text, ...names.flatMap(name => text.startsWith(name + ' ') || text.startsWith(name + ' - ')
      ? [text.slice(name.length).replace(/^\s*[-–—:]?\s*/, '')] : [])];
  });
  return [...new Set(variants.map(normalize).filter(Boolean))];
};
const keys = track => artists(track).flatMap(artist => titles(track).map(title => `${track.kind}:${artist}:${title}`));

/** Exact whole artist/title identities only. No substring or fuzzy substitutions. */
export function recoveryCandidates(library, base) {
  const index = new Map();
  for (const track of base.tracks) for (const key of keys(track)) {
    const matches = index.get(key) || []; matches.push(track); index.set(key, matches);
  }
  return library.tracks.map(track => {
    const matches = [...new Set(keys(track).flatMap(key => index.get(key) || []))];
    const sources = new Map();
    for (const match of matches) for (const source of match.sources) {
      if (source.provider === 'melodify' || source.available === false || !/^https:\/\//i.test(source.url)
        || !/\.mp3(?:$|\?)/i.test(source.url)) continue;
      sources.set(source.url, { ...source, sourcePageUrl: match.sourceUrl });
    }
    return { id: track.id, title: track.persianTitle || track.title, artist: track.artist.name, sources: [...sources.values()] };
  });
}

export function isMp3Prefix(bytes) {
  return bytes.length >= 3 && (Buffer.from(bytes.subarray(0, 3)).toString() === 'ID3'
    || [...bytes.subarray(0, Math.min(bytes.length - 1, 512))].some((v, i) => v === 255 && (bytes[i + 1] & 0xe0) === 0xe0));
}

async function probe(url) {
  try {
    const response = await fetch(url, { headers: { Range: 'bytes=0-4095', 'Accept-Encoding': 'identity' }, signal: AbortSignal.timeout(12000) });
    const reader = response.body?.getReader();
    const prefix = reader ? await reader.read() : {};
    await reader?.cancel();
    const type = response.headers.get('content-type') || '';
    return (response.status === 200 || response.status === 206) && !/text|json|html|xml/i.test(type) && prefix.value && isMp3Prefix(prefix.value)
      ? { ok: true, status: response.status, type } : { ok: false, status: response.status, type };
  } catch { return { ok: false, reason: 'unreachable-or-timeout' }; }
}

async function main() {
  const library = JSON.parse(await readFile('public/data/melodify-library.json', 'utf8'));
  const base = JSON.parse(await readFile('public/data/music-index.json', 'utf8'));
  const extraFile = process.argv.find(arg => arg.startsWith('--source-index='))?.slice('--source-index='.length);
  if (extraFile) base.tracks.push(...JSON.parse(await readFile(extraFile, 'utf8')).tracks);
  const candidates = recoveryCandidates(library, base);
  const reportDir = '.media-cache/music-recovery'; await mkdir(reportDir, { recursive: true });
  await writeFile(path.join(reportDir, 'library.txt'), candidates.map(t => `${t.id}\t${t.artist}\t${t.title}`).join('\n') + '\n');
  const verified = process.argv.includes('--continue-verified')
    ? JSON.parse(await readFile('lib/data/melodify-source-replacements.json', 'utf8')) : {};
  const checks = new Map();
  let cursor = 0, nextStart = 0;
  const check = url => {
    if (!checks.has(url)) {
      const start = Math.max(Date.now(), nextStart); nextStart = start + 250;
      checks.set(url, (async () => { await new Promise(resolve => setTimeout(resolve, start - Date.now())); return probe(url); })());
    }
    return checks.get(url);
  };
  const pending = candidates.filter(track => track.sources.length && !verified[track.id]?.length);
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < pending.length) {
    const track = pending[cursor++];
    for (const source of track.sources) {
      const result = await check(source.url);
      if (result.ok) { (verified[track.id] ||= []).push({ ...source, available: true, checkedAt: new Date().toISOString() }); break; }
    }
    if (track.sources.length) console.log(JSON.stringify({ id: track.id, candidates: track.sources.length, verified: verified[track.id]?.length || 0 }));
    }
  }));
  const summary = { total: candidates.length, matched: candidates.filter(t => t.sources.length).length, verified: Object.keys(verified).length, checkedUrls: checks.size };
  const results = Object.fromEntries(await Promise.all([...checks].map(async ([url, result]) => [url, await result])));
  await writeFile(path.join(reportDir, 'report.json'), JSON.stringify({ summary, candidates, checks: results }, null, 2) + '\n');
  await writeFile(path.join(reportDir, 'verified-links.txt'), candidates.filter(t => verified[t.id]).map(t => `${t.id}\t${t.artist}\t${t.title}\n${verified[t.id].map(s => s.url).join('\n')}`).join('\n\n') + '\n');
  // Regenerate only the bounded replacement bundle, never overwrite the live library/catalog.
  if (process.argv.includes('--write-verified') && Object.keys(verified).length) {
    await writeFile('lib/data/melodify-source-replacements.json', JSON.stringify(verified, null, 2) + '\n');
  }
  console.log(JSON.stringify(summary));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
