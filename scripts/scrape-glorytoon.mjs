import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import lockfile from 'proper-lockfile';
import { glorytoonUrl, mergeGlorytoonDownloads } from '../lib/glorytoon-downloads.mjs';
import { discoverGlorytoonPages, glorytoonCrawlUrl, matchGlorytoonTitle, parseGlorytoonDownloads, verifyGlorytoonDownload } from './glorytoon-source.mjs';
import { robotsAllowed } from './public-vod-sources.mjs';

const args = process.argv.slice(2);
const option = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const root = process.cwd();
const cache = path.join(root, '.media-cache/glorytoon');
const output = path.resolve(option('output') || path.join(root, 'public/data/glorytoon-downloads.json'));
const stateFile = path.join(cache, 'state.json');
const reportFile = path.join(cache, 'report.json');
await mkdir(cache, { recursive: true });
const releaseLock = await lockfile.lock(cache, { realpath: false, lockfilePath: path.join(cache, 'run.lock'), stale: 120_000, update: 10_000, retries: 0 });
try {
const readJson = async (file, fallback) => { try { return JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return fallback; throw error; } };
const atomic = async (file, value) => {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`); await rename(temp, file);
};
const empty = { version: 1, items: {} };
let bundle = mergeGlorytoonDownloads(await readJson(path.join(root, 'lib/data/glorytoon-downloads.json'), empty), await readJson(output, empty));
const index = await readJson(path.join(process.env.VOD_DATA_DIR || path.join(root, 'public/data'), 'vod-index.json'), { items: [] });
const state = await readJson(stateFile, { queue: [], checked: [] });
const checked = new Set(args.includes('--retry') ? [] : state.checked);
const seeds = ['https://glorytoon.com/category/انیمیشن', 'https://glorytoon.com/the-emperors-new-groove-glory',
  'https://glorytoon.com/legend-of-the-guardians-2010', 'https://glorytoon.com/ice-age-5-collision-course'];
const queue = [...new Set([...seeds, ...state.queue].map(url => glorytoonCrawlUrl(url)).filter(Boolean))].filter(url => !checked.has(url));
const deferred = [];
const report = { startedAt: new Date().toISOString(), status: 'running', pagesRead: 0, anchorsExtracted: 0, unmatched: [], blocked: [], verification: {} };
const bounded = (value, fallback, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(1, Math.floor(Number(value)))) : fallback;
const pageLimit = bounded(option('pages'), args.includes('--full') ? 1000 : 80, 1000);
const deadline = Date.now() + bounded(option('budget-ms'), 15 * 60_000, 60 * 60_000);
let lastRequest = 0;
let robots = '';

async function checkpoint() {
  report.titles = Object.keys(bundle.items).length;
  report.downloads = Object.values(bundle.items).reduce((sum, item) => sum + item.downloads.length, 0);
  await atomic(output, bundle);
  await atomic(stateFile, { queue: [...new Set([...queue, ...deferred])], checked: [...checked] });
  await atomic(reportFile, report);
}

async function request(url, redirects = 0) {
  if (!glorytoonUrl(url)) throw new Error('Refusing non-publisher page');
  if (Date.now() >= deadline) throw new Error('Time budget reached');
  await delay(Math.max(0, 1000 - (Date.now() - lastRequest)));
  lastRequest = Date.now();
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000),
    headers: { 'User-Agent': 'SarvNemaCatalogBot/1.0 (+https://sarvnema.ir)', Accept: 'text/html,text/plain,application/xml' } });
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel();
    const target = glorytoonUrl(response.headers.get('location'), 'page', url);
    if (!target || redirects >= 3 || /\/(?:login|register|account)(?:\/|$)/i.test(new URL(target).pathname)
      || !robotsAllowed(robots, target)) throw new Error(`Redirect requires review: ${response.status}`);
    return request(target, redirects + 1);
  }
  if (response.status === 404 && new URL(url).pathname === '/robots.txt') { await response.body?.cancel(); return ''; }
  if (!response.ok || response.headers.get('cf-mitigated') === 'challenge') {
    await response.body?.cancel();
    throw Object.assign(new Error(`HTTP ${response.status}${response.headers.get('cf-mitigated') === 'challenge' ? ' (Cloudflare challenge)' : ''}`), { status: response.status });
  }
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length; if (size > 8 * 1024 * 1024) throw new Error('Page exceeds 8 MB'); chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const html = Buffer.concat(chunks).toString('utf8');
  if (/cf-chl-|just a moment|attention required|challenge-platform/i.test(html)) throw new Error('Cloudflare challenge');
  return html;
}

function ingest(html, url, evidence) {
  const downloads = parseGlorytoonDownloads(html, url, { evidence });
  report.anchorsExtracted += downloads.length;
  if (!downloads.length) return;
  const item = matchGlorytoonTitle(html, index.items);
  if (!item) { report.unmatched.push({ url, downloads: downloads.length, reason: 'No unambiguous catalog title/year or IMDb match' }); return; }
  bundle = mergeGlorytoonDownloads(bundle, { version: 1, items: { [item.imdbCode || item.id]: { title: item.title, year: item.year, downloads } } });
}

try {
  const manifestPath = option('import');
  if (manifestPath) {
    const manifest = await readJson(path.resolve(manifestPath), null);
    if (!Array.isArray(manifest?.pages)) throw new Error('Manifest must have a pages array of {url, file}');
    const directory = path.dirname(path.resolve(manifestPath));
    for (const page of manifest.pages) {
      if (!glorytoonUrl(page.url)) throw new Error('Invalid saved page URL');
      const file = path.resolve(directory, page.file);
      if (path.relative(directory, file).startsWith('..') || path.isAbsolute(path.relative(directory, file))) throw new Error('HTML file must be inside manifest directory');
      const html = await readFile(file, 'utf8');
      if (Buffer.byteLength(html) > 8 * 1024 * 1024) throw new Error('Saved page exceeds 8 MB');
      ingest(html, page.url, 'saved-html'); report.pagesRead++;
    }
    await checkpoint();
  }
  if (!args.includes('--offline')) {
    robots = await request('https://glorytoon.com/robots.txt');
    while (queue.length && report.pagesRead < pageLimit && Date.now() < deadline) {
      const url = queue[0];
      if (!robotsAllowed(robots, url)) { queue.shift(); report.blocked.push({ url, reason: 'robots.txt disallows this page' }); continue; }
      let html;
      try { html = await request(url); }
      catch (error) {
        if (![404, 410, 500, 502, 503, 504].includes(error.status)) throw error;
        report.blocked.push({ url, reason: error.message });
        if ([404, 410].includes(error.status)) checked.add(url); else deferred.push(url);
        queue.shift(); await checkpoint(); continue;
      }
      ingest(html, url, 'public-anchor'); report.pagesRead++;
      checked.add(url); queue.shift();
      for (const page of discoverGlorytoonPages(html, url)) if (!checked.has(page) && !queue.includes(page) && queue.length < 5000) queue.push(page);
      await checkpoint();
    }
  }
  report.status = (queue.length || deferred.length || report.blocked.length) && !args.includes('--offline') ? 'partial' : args.includes('--offline') ? 'offline' : 'complete';
} catch (error) {
  report.status = 'blocked'; report.blocked.push({ url: report.pagesRead ? queue[0] : 'https://glorytoon.com/robots.txt', reason: error.message });
}
if (args.includes('--verify')) {
  for (const item of Object.values(bundle.items)) {
    for (let i = 0; i < item.downloads.length && Date.now() < deadline; i++) {
      item.downloads[i] = await verifyGlorytoonDownload(item.downloads[i], { signal: AbortSignal.timeout(12_000) });
      const status = item.downloads[i].availability;
      report.verification[status] = (report.verification[status] || 0) + 1;
      await delay(1000);
    }
  }
}
report.finishedAt = new Date().toISOString();
await checkpoint();
console.log(JSON.stringify(report, null, 2));
if (report.status === 'blocked') process.exitCode = 2;
} finally { await releaseLock(); }
