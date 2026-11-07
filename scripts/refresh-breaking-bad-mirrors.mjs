import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { plainText } from './moviesho-source-lib.mjs';
import { probeAlternativeMedia } from './refresh-alternative-sources.mjs';
import { writeJsonAtomic } from './atomic-json.mjs';

export const SOURCE = 'https://www.moviesho.com/series/breaking-bad-2008/';
const ID = 'tt0903747';
const COUNTS = [7, 13, 13, 13, 16];
const SEASONS = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم'];

export function parseBreakingBadMirrors(html) {
  const links = new Map();
  for (const block of html.split(/<div\b[^>]*class=["']dl-season-links["'][^>]*>/i).slice(1)) {
    const header = plainText(block.split(/<div\b[^>]*class=["']dl-body/i)[0]);
    const sourceSeason = SEASONS.findIndex(name => new RegExp(`فصل\\s+${name}(?:\\s|$)`, 'u').test(header)) + 1;
    if (!sourceSeason) continue;
    const season = sourceSeason === 6 ? 5 : sourceSeason;
    for (const row of block.split(/<div\b[^>]*class=["']dl-items\b[^"']*["'][^>]*>/i).slice(1)) {
      const info = row.match(/class=["']download-info["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];
      const sourceEpisode = Number(plainText(info || '').match(/قسمت\s+(\d{1,2})/u)?.[1]);
      const episode = sourceEpisode + (sourceSeason === 6 ? 8 : 0);
      if (!sourceEpisode || episode > COUNTS[season - 1]) continue;
      for (const [, raw] of row.matchAll(/href=["']([^"']+)["']/gi)) {
        let url; try { url = new URL(raw.replaceAll('&amp;', '&')); } catch { continue; }
        if (url.protocol !== 'https:' || url.hostname !== 'traffic.upera.tv' || !/^\/\d+-0-(?:480|720|1080)\.mp4$/.test(url.pathname)) continue;
        const quality = `${url.pathname.match(/-(\d+)\.mp4$/)[1]}p`;
        links.set(`${season}:${episode}:${quality}`, { url: url.href, season, episode, quality, group: /دوبله فارسی/u.test(header) ? 'Dubbed' : 'Files',
          sourceProvider: 'moviesho', sourceUrl: SOURCE, mediaKind: 'video', size: null, release: null,
          fileName: url.pathname.slice(1), label: `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')} / ${quality} / Moviesho`,
          episodeEvidence: { kind: 'publisher-season-row', sourceSeason, sourceEpisode,
            ...(sourceSeason === 6 ? { correction: 'Final eight episodes of season five, not a sixth season', reference: 'https://www.amcglobalmedia.com/2011/08/14/amc-renews-breaking-bad/' } : {}) } });
      }
    }
  }
  return [...links.values()];
}

async function main() {
  const output = process.argv[2] || `${process.env.VOD_DATA_DIR || 'public/data'}/series-source-links.json`;
  const response = await fetch(SOURCE, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Publisher HTTP ${response.status}`);
  const candidates = parseBreakingBadMirrors(await response.text());
  const episodes = new Set(candidates.map(link => `${link.season}:${link.episode}`));
  if (episodes.size !== 62 || candidates.length !== 186) throw new Error('Unexpected publisher layout or incomplete series; preserving existing links');
  const links = [], failures = []; let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < candidates.length) {
      const link = candidates[cursor++];
      const result = await probeAlternativeMedia(link.url);
      if (result.state === 'verified') links.push({ ...link, verifiedAt: result.checkedAt });
      else failures.push({ url: link.url, season: link.season, episode: link.episode, ...result });
    }
  }));
  if (new Set(links.map(link => `${link.season}:${link.episode}`)).size !== 62) throw new Error(`Not every episode has a verified mirror (${failures.length} failures); preserving existing links`);
  links.sort((a, b) => a.season - b.season || a.episode - b.episode || parseInt(b.quality) - parseInt(a.quality));
  let previous = { version: 1, items: {} };
  try { previous = JSON.parse(await readFile(output, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await writeJsonAtomic(output, { version: 1, items: { ...previous.items, [ID]: { links } } });
  await writeJsonAtomic('.media-cache/vod-sync/breaking-bad-mirrors-report.json', { checkedAt: new Date().toISOString(), source: SOURCE, verifiedFiles: links.length, episodes: 62, seasons: 5, failures });
  console.log(JSON.stringify({ output, verifiedFiles: links.length, episodes: 62, seasons: 5, failures: failures.length }));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error); process.exitCode = 1; });
