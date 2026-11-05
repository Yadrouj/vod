import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { cleanText, decodeHtmlEntities } from './music-catalog.mjs';

const allowedHosts = new Set(['rozmusic.com', 'musics-fa.com', 'remiixbaz.com']);
const norm = text => String(text || '').normalize('NFKC').replace(/[\u064a\u0649]/gu, '\u06cc').replace(/\u0643/gu, '\u06a9').replace(/\s+/g, ' ').trim();
export function archiveUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && allowedHosts.has(url.hostname) && /^\/(?:tag|artists|singer|playlist)\//.test(url.pathname) ? url.href : null; } catch { return null; }
}

export function parseArchiveList(html, archive, pageUrl) {
  const tracks = [];
  for (const article of html.match(/<article\b[\s\S]*?<\/article>/gi) || []) {
    const heading = article.match(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/i)?.[1] || '';
    const text = norm(cleanText(heading)).replace(/^دانلود\s+(?:آهنگ|اهنگ|موزیک|ترانه)(?:\s+جدید)?\s*/u, '').replace(/\s+(?:به نام|بنام)\s+/gu, ' ');
    // Only rows explicitly credited to this archive's singer. Never footer/related audio.
    const credit = [archive.artist.name, ...(archive.artist.aliases || [])].map(norm).filter(Boolean)
      .find(name => text === name || text.startsWith(name + ' '));
    if (!credit) continue;
    const persianTitle = text.slice(credit.length).replace(/^\s*[-–—:]?\s*/, '').trim();
    if (!persianTitle) continue;
    const sourcePageUrl = decodeHtmlEntities(heading.match(/href=["']([^"']+)["']/i)?.[1] || pageUrl);
    for (const raw of new Set(article.match(/https?:[^"'<>\s]+\.mp3(?:\?[^"'<>\s]*)?/gi) || [])) {
      let url; try { url = new URL(decodeHtmlEntities(raw)); } catch { continue; }
      if (url.protocol !== 'https:') continue;
      let filename; try { filename = decodeURIComponent(url.pathname.split('/').at(-1)); } catch { continue; }
      const parts = filename.replace(/\.mp3$/i, '').replace(/\s*\((?:128|320)\)\s*$/u, '').split(/\s+-\s+/u);
      const englishCredit = parts.length === 2 ? parts[0] : '';
      const title = parts.length === 2 ? parts[1] : persianTitle;
      const artist = { ...archive.artist, aliases: [...new Set([...(archive.artist.aliases || []), ...(englishCredit ? [englishCredit] : [])])] };
      tracks.push({ id: url.href, kind: 'track', title, persianTitle, artist, artists: [artist], sourceUrl: sourcePageUrl,
        sources: [{ url: url.href, kind: 'stream', label: /128/.test(filename) ? '128kbps' : 'MP3',
          provider: ({ 'rozmusic.com': 'rozmusic', 'musics-fa.com': 'musics-fa', 'remiixbaz.com': 'remiixbaz' })[new URL(pageUrl).hostname], sourcePageUrl }] });
    }
  }
  return tracks;
}

export function nextArchivePage(html, current, root) {
  const currentPage = Number(new URL(current).pathname.match(/\/page\/(\d+)/)?.[1] || 1);
  const rootPath = decodeURI(new URL(root).pathname).replace(/\/$/, '');
  for (const match of html.matchAll(/(?:href)=["']([^"']+)["']/gi)) {
    try {
      const url = new URL(decodeHtmlEntities(match[1]), current);
      if (url.origin !== new URL(root).origin) continue;
      const pathname = decodeURI(url.pathname).replace(/\/$/, '');
      if (pathname === `${rootPath}/page/${currentPage + 1}`) return url.href;
    } catch { /* malformed links cannot extend a crawl */ }
  }
  return null;
}

async function atomic(file, data) { await mkdir(path.dirname(file), { recursive: true }); const tmp = file + '.tmp'; await writeFile(tmp, JSON.stringify(data, null, 2) + '\n'); await rename(tmp, file); }
async function main() {
  const library = JSON.parse(await readFile('public/data/melodify-library.json', 'utf8'));
  const verified = JSON.parse(await readFile('lib/data/melodify-source-replacements.json', 'utf8'));
  const file = '.media-cache/music/artist-archive-source.json';
  let state; try { state = JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; state = { tracks: [], pages: {}, archives: {} }; }
  const archives = new Map();
  for (const track of library.tracks.filter(t => !verified[t.id])) {
    const url = archiveUrl(track.artist.sourceUrl);
    if (url && !archives.has(url)) archives.set(url, { url, artist: track.artist });
  }
  const tracks = new Map(state.tracks.map(t => [t.id, t]));
  const deadline = Date.now() + Number(process.env.ARCHIVE_RECOVERY_BUDGET_MS || 360000);
  const maxPages = Number(process.env.ARCHIVE_RECOVERY_MAX_PAGES || 8);
  const queue = [...archives.values()]; let cursor = 0, nextRequest = 0;
  async function save() { state.updatedAt = new Date().toISOString(); state.tracks = [...tracks.values()]; await atomic(file, state); }
  // One checkpoint writer, two bounded fetch workers; no catalog mutation.
  let saving = Promise.resolve(); const checkpoint = () => saving = saving.then(save);
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (cursor < queue.length && Date.now() < deadline) {
      const archive = queue[cursor++]; let pageUrl = archive.url, count = 0;
      while (pageUrl && count < maxPages && Date.now() < deadline) {
        count++;
        const cached = state.pages[pageUrl];
        if (cached?.ok) { pageUrl = cached.next; continue; }
        const start = Math.max(Date.now(), nextRequest); nextRequest = start + 650;
        await new Promise(resolve => setTimeout(resolve, Math.max(0, start - Date.now())));
        try {
          const response = await fetch(pageUrl, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'SarvNema music archive recovery/1.0 (+https://sarvnema.ir)' } });
          if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
          if (!archiveUrl(response.url) || new URL(response.url).hostname !== new URL(pageUrl).hostname) { await response.body?.cancel(); throw new Error('Archive redirected outside its public source'); }
          const html = await response.text(); const rows = parseArchiveList(html, archive, pageUrl);
          for (const row of rows) tracks.set(row.id, row);
          const next = nextArchivePage(html, pageUrl, archive.url);
          state.pages[pageUrl] = { ok: true, tracks: rows.length, next, checkedAt: new Date().toISOString() };
          pageUrl = next;
        } catch (error) { state.pages[pageUrl] = { ok: false, error: error.message }; break; }
      }
      state.archives[archive.url] = { pages: count, hasMore: Boolean(pageUrl) };
      console.log(JSON.stringify({ archives: cursor, total: queue.length, pages: Object.keys(state.pages).length, tracks: tracks.size }));
      await checkpoint();
    }
  }));
  await checkpoint();
  console.log(JSON.stringify({ archivesVisitedThisRun: cursor, archives: queue.length,
    archivesWithMorePages: Object.values(state.archives).filter(a => a.hasMore).length,
    pages: Object.keys(state.pages).length, tracks: tracks.size }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
