import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { discoverGlorytoonPages, htmlAnchors, matchGlorytoonTitle, parseGlorytoonDownloads, verifyGlorytoonDownload } from '../glorytoon-source.mjs';
import { glorytoonDownloadsForItem, glorytoonUrl, mergeGlorytoonDownloads } from '../../lib/glorytoon-downloads.mjs';

const page = 'https://glorytoon.com/the-emperors-new-groove-glory';
const url = 'https://dl.glorycartoon.com/dl/glory/The%20Emperors%20New%20Groove%202000%20720p/The%20Emperors%20New%20Groove%202000%201080p.mkv';
const anchor = `<a download="" target="_blank" data-bs-toggle="tooltip" data-bs-placement="top" href="${url}" class="button button-green" data-bs-original-title="دانلود با حجم 882MB"><svg class="dl_icon"><use xlink:href="#downloadIcon"></use></svg>دانلود 1080p</a>`;
const now = Date.parse('2026-11-17T00:00:00Z');
const video = parseGlorytoonDownloads(anchor, page, { now })[0];
const item = { imdbCode: 'tt0120917', title: "The Emperor's New Groove", year: 2000, type: 'movie' };
const bundle = { version: 1, items: { [item.imdbCode]: { title: item.title, year: item.year, downloads: [video] } } };

test('actual supplied anchor preserves exact URL, 882MB tooltip and 1080p file, not the 720p folder', () => {
  assert.equal(video.url, url); assert.equal(video.sourceUrl, page);
  assert.equal(video.quality, '1080p'); assert.equal(video.size, '882MB');
  assert.equal(video.kind, 'video'); assert.equal(video.availability, 'unverified');
  assert.equal(video.verifiedAt, undefined);
});

test('file quality beats a stale button label; fallback handles Persian digits', () => {
  assert.equal(parseGlorytoonDownloads(anchor.replace('دانلود 1080p', 'دانلود 720p'), page)[0].quality, '1080p');
  assert.equal(parseGlorytoonDownloads('<a download href="https://dl.glorycartoon.com/dl/glory/film.mkv">دانلود ۷۲۰</a>', page)[0].quality, '720p');
});

test('separate audio, DTS, audio in MKV and trailers are never misclassified as full movies', () => {
  const files = parseGlorytoonDownloads([
    '<a download href="https://dl.glorycartoon.com/audio/film.mp3">دانلود صوت دوبله فارسی</a>',
    '<a download href="https://dl.glorycartoon.com/audio/film.mkv">دانلود DTS 6CH Sound</a>',
    '<a download href="https://dl.glorycartoon.com/audio/film.zip">دانلود صوت دوبله فارسی</a>',
    '<a download href="https://dl.glorycartoon.com/dl/film.Trailer.1080p.mp4">دانلود تریلر</a>',
  ].join(''), page);
  assert.deepEqual(files.map(file => file.kind), ['dub-audio', 'dub-audio', 'dub-audio', 'trailer']);
  assert.equal(files[1].quality, null);
});

test('a full movie with a DTS soundtrack is still a video, not separate dub audio', () => {
  const files = parseGlorytoonDownloads('<a download href="https://dl.glorycartoon.com/dl/glory/Ice%20Age%205/Ice.Age.Collision.Course.2016.1080p.Bluray.6CH.DTS.v2-GLORY%20(www.Glorytoon.com).mkv">دانلود 1080p</a>', page);
  assert.equal(files[0].kind, 'video'); assert.equal(files[0].quality, '1080p');
});

test('only actual public download anchors are accepted; scripts, comments, placeholders and third parties ignored', () => {
  const html = anchor + `<script>${anchor}</script><!--${anchor}--><video src="${url}"></video>`
    + '<a download href="javascript:alert(1)">دانلود</a><a download href="https://evil.example/film.mp4">دانلود</a>'
    + '<a download href="https://dl.glorycartoon.com/installer.exe">دانلود</a>'
    + '<a data-href="https://dl.glorycartoon.com/other.mp4">دانلود</a>';
  assert.deepEqual(parseGlorytoonDownloads(html, page).map(file => file.url), [url]);
  assert.deepEqual(parseGlorytoonDownloads(`Just a moment... ${anchor}`, page), []);
  assert.equal(htmlAnchors("<a download href='https://example.com/?a=1&amp;b=2'> hi </a>")[0].attributes.href, 'https://example.com/?a=1&b=2');
});

test('deduplication preserves exact file names and signed queries', () => {
  assert.equal(parseGlorytoonDownloads(anchor + anchor, page).length, 1);
  const signed = parseGlorytoonDownloads('<a download href="https://dl.glorycartoon.com/Film.mp4?md5=AbC&amp;expires=9999999999">دانلود</a>', page)[0];
  assert.equal(signed.url, 'https://dl.glorycartoon.com/Film.mp4?md5=AbC&expires=9999999999');
});

test('publisher allowlist rejects userinfo, custom ports, protocol tricks and deceptive hosts', () => {
  for (const target of ['https://user:pass@glorytoon.com/page', 'https://glorytoon.com.evil.example/page', 'http://localhost/', 'file:///tmp/page', 'https://glorytoon.com:18190/']) assert.equal(glorytoonUrl(target), null);
  assert.equal(glorytoonUrl('https://dl.glorycartoon.com.evil.example/file.mp4', 'media'), null);
  for (const target of [undefined, '', '/category/%22https://glorytoon.com/notification']) assert.equal(glorytoonUrl(target), null);
});

test('page discovery keeps public posts/pagination on the publisher, never login, player or downloads', () => {
  const html = ['/category/انیمیشن/page/2', '/legend-of-the-guardians-2010', '/login', '/playonline?id=5540&row=1', '/feed', 'https://evil.example/movie', url]
    .map(value => `<a href="${value}">next</a>`).join('');
  const pages = discoverGlorytoonPages(html, page);
  assert.equal(pages.length, 2); assert.ok(pages.some(url => url.endsWith('/legend-of-the-guardians-2010')));
});

test('matching requires unique catalog identity and never guesses a sequel or same-name remake', () => {
  const index = [item, { ...item, imdbCode: 'tt0999999', year: 2005 }];
  assert.equal(matchGlorytoonTitle(`<h1>زندگی جدید امپراطور – The Emperor's New Groove (2000)</h1>`, index).imdbCode, item.imdbCode);
  assert.equal(matchGlorytoonTitle('<h1>The Emperor New Groove</h1>', index), null);
  assert.equal(matchGlorytoonTitle('<a href="https://imdb.com/title/tt0120917/">IMDb</a><aside><a href="https://imdb.com/title/tt0999999/">Other</a></aside>', index).imdbCode, item.imdbCode);
  assert.equal(matchGlorytoonTitle('<a href="https://imdb.com/title/tt0120917/">IMDb</a><a href="https://imdb.com/title/tt0999999/">IMDb</a>', index), null);
});

test('supplemental overlay has exact ID/year, content restrictions, and does not mutate playback links', () => {
  const links = [{ url: 'https://existing.example/movie.mp4' }];
  assert.equal(glorytoonDownloadsForItem(bundle, { ...item, links }).length, 1);
  assert.equal(links.length, 1);
  for (const wrong of [{ ...item, year: 2005 }, { ...item, type: 'tvSeries' }, { ...item, imdbCode: 'tt33184638' }]) assert.deepEqual(glorytoonDownloadsForItem(bundle, wrong), []);
});

test('re-extraction preserves health evidence; empty/blocked scans retain existing downloads', () => {
  const checked = { ...bundle, items: { [item.imdbCode]: { ...bundle.items[item.imdbCode], downloads: [{ ...video, availability: 'unavailable', checkedAt: '2026-11-17T01:00:00Z', httpStatus: 410 }] } } };
  assert.equal(mergeGlorytoonDownloads(checked, bundle).items[item.imdbCode].downloads[0].availability, 'unavailable');
  assert.equal(mergeGlorytoonDownloads(bundle, { version: 1, items: {} }).items[item.imdbCode].downloads.length, 1);
});

test('network verification uses range bytes and binary evidence, not an HTML 200 or fabricated timestamp', async () => {
  let options;
  const checked = await verifyGlorytoonDownload(video, { now, fetcher: async (_url, init) => { options = init; return new Response(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]), { status: 206 }); } });
  assert.equal(options.headers.Range, 'bytes=0-1023'); assert.equal(options.redirect, 'manual');
  assert.equal(checked.availability, 'available');
  const html = await verifyGlorytoonDownload(video, { fetcher: async () => new Response('<html>Sign in</html>') });
  assert.equal(html.availability, 'unverified');
});

test('DNS failure is unverified, not a missing file; HTTP 410 is explicitly unavailable', async () => {
  const dns = await verifyGlorytoonDownload(video, { fetcher: async () => { throw Object.assign(new Error('fetch failed'), { cause: { code: 'ENOTFOUND' } }); } });
  assert.equal(dns.availability, 'unverified'); assert.equal(dns.failureReason, 'ENOTFOUND');
  const gone = await verifyGlorytoonDownload(video, { fetcher: async () => new Response('', { status: 410 }) });
  assert.equal(gone.availability, 'unavailable');
});

test('reviewed bundle preserves user files and provenance for actual public-page audio anchors', () => {
  const seed = JSON.parse(readFileSync(new URL('../../lib/data/glorytoon-downloads.json', import.meta.url), 'utf8'));
  assert.ok(Object.keys(seed.items).length >= 5);
  for (const [id, patch] of Object.entries(seed.items)) {
    const downloads = glorytoonDownloadsForItem(seed, { imdbCode: id, year: patch.year });
    assert.equal(downloads.length, patch.downloads.length);
    for (const download of downloads) {
      assert.ok(['public-anchor', 'user-provided', 'saved-html'].includes(download.evidence));
      assert.ok(download.sourceUrl.startsWith('https://glorytoon.com/'));
    }
  }
  assert.equal(seed.items.tt0120917.downloads[0].url, url);
  assert.ok(seed.items.tt0120917.downloads.some(file => file.kind === 'dub-audio' && file.url.endsWith('/The_Emporors_New_Groove_Sound.rar')));
  assert.ok(seed.items.tt3416828.downloads.some(file => file.kind === 'video' && file.quality === '1080p'));
  assert.equal(seed.items.tt2953050.downloads[0].evidence, 'user-provided');
});

test('offline CLI imports saved public anchors, matches the catalog, checkpoints and releases its lock', async t => {
  const prefix = path.join(tmpdir(), 'sarvnema-glorytoon-');
  const directory = await mkdtemp(prefix);
  t.after(async () => { if (path.resolve(directory).startsWith(path.resolve(prefix))) await rm(directory, { recursive: true, force: true }); });
  await mkdir(path.join(directory, 'public/data'), { recursive: true });
  await mkdir(path.join(directory, 'lib/data'), { recursive: true });
  await writeFile(path.join(directory, 'public/data/vod-index.json'), JSON.stringify({ items: [item] }));
  await writeFile(path.join(directory, 'lib/data/glorytoon-downloads.json'), JSON.stringify({ version: 1, items: {} }));
  await writeFile(path.join(directory, 'emperor.html'), `<h1>The Emperor's New Groove (2000)</h1>${anchor}`);
  const manifest = path.join(directory, 'manifest.json');
  await writeFile(manifest, JSON.stringify({ pages: [{ url: page, file: 'emperor.html' }] }));
  const script = fileURLToPath(new URL('../scrape-glorytoon.mjs', import.meta.url));
  const { stdout } = await promisify(execFile)(process.execPath, [script, '--offline', `--import=${manifest}`], { cwd: directory, timeout: 30000 });
  assert.equal(JSON.parse(stdout).status, 'offline');
  const imported = JSON.parse(await readFile(path.join(directory, 'public/data/glorytoon-downloads.json'), 'utf8'));
  assert.equal(imported.items.tt0120917.downloads[0].url, url);
  assert.equal(imported.items.tt0120917.downloads[0].evidence, 'saved-html');
  await assert.rejects(readFile(path.join(directory, '.media-cache/glorytoon/run.lock')), { code: 'ENOENT' });
});
