import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { captureProduct } from './capture-product.mjs';
import { createSoundtrack } from './original-soundtrack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.resolve(ROOT, process.env.REEL_OUTPUT || '.media-cache/marketing/sarvnema-cinematic');
const assets = path.join(output, 'assets');
const fps = 30, duration = 30, width = 1080, height = 1920;
const has = async file => access(file).then(() => true, () => false);
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
await mkdir(output, { recursive: true });
if (process.argv.includes('--capture') || !await has(path.join(assets, 'music-actions.png'))) await captureProduct({ chromium, output: assets, base: process.env.REEL_BASE_URL || undefined });

const pinned = new Map([
  ['/', path.join(ROOT, 'scripts/marketing/cinematic-reel.html')],
  ['/fonts/regular.ttf', path.join(ROOT, 'public/fonts/IRANSansXFaNum-Regular.ttf')],
  ['/fonts/bold.ttf', path.join(ROOT, 'public/fonts/IRANSansXFaNum-Bold.ttf')],
  ['/fonts/black.ttf', path.join(ROOT, 'public/fonts/IRANSansXFaNum-Black.ttf')],
  ['/brand/mark.svg', path.join(ROOT, 'public/brand/sarvnema-mark.svg')],
]);
const contentType = file => ({ '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' })[path.extname(file)] || 'application/octet-stream';
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    let file = pinned.get(pathname);
    if (!file && /^\/assets\/[a-z0-9-]+\.png$/.test(pathname)) file = path.join(assets, path.basename(pathname));
    if (!file) { res.writeHead(404).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'no-store' }); res.end(body);
  } catch { res.writeHead(500).end('Asset unavailable'); }
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
let encoder;
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'load' });
  await page.evaluate(() => window.reelReady);
  assert.ok(await page.evaluate(() => document.fonts.check('950 80px Reel')), 'Persian font loaded');
  for (const [name, time] of [['intro', 2], ['search', 6.5], ['together', 12.5], ['music', 19.2], ['all', 24], ['outro', 28.7]]) {
    await page.evaluate(t => window.renderFrame(t), time);
    await page.screenshot({ path: path.join(output, `storyboard-${name}.jpg`), type: 'jpeg', quality: 94 });
    console.log(`STORYBOARD ${name}`);
  }
  await page.evaluate(() => window.renderFrame(2.4));
  await page.screenshot({ path: path.join(output, 'sarvnema-reel-cover.jpg'), type: 'jpeg', quality: 96 });
  assert.deepEqual(errors, [], 'No rendering errors');
  if (!process.argv.includes('--preview-only')) {
    let ffmpeg = process.env.FFMPEG_BINARY;
    if (!ffmpeg) {
      const bin = path.join(ROOT, '.media-cache/reel-tools/python/imageio_ffmpeg/binaries');
      const name = (await readdir(bin)).find(file => /ffmpeg.*\.exe$/.test(file));
      assert.ok(name, 'Set FFMPEG_BINARY or install imageio-ffmpeg in the isolated tool folder');
      ffmpeg = path.join(bin, name);
    }
    const score = await createSoundtrack(path.join(output, 'original-soundtrack.wav'));
    const target = path.join(output, 'sarvnema-cinematic-reel-fa.mp4');
    // Browser JPEGs carry full-range JPEG color and an ICC profile. Convert them
    // explicitly to standard limited-range BT.709 video for consistent phones.
    const videoFilter = 'sidedata=mode=delete:type=ICC_PROFILE,scale=in_range=full:out_range=limited:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p,setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709';
    const args = ['-y', '-hide_banner', '-loglevel', 'warning', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', String(fps), '-i', 'pipe:0', '-i', path.join(output, 'original-soundtrack.wav'), '-t', String(duration), '-map', '0:v:0', '-map', '1:a:0', '-vf', videoFilter, '-c:v', 'libx264', '-threads', '2', '-preset', 'fast', '-crf', '18', '-profile:v', 'high', '-level:v', '4.1', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-r', String(fps), '-fps_mode', 'cfr', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=9', '-movflags', '+faststart', '-metadata', 'title=SarvNema — Cinematic Persian Reel', target];
    encoder = spawn(ffmpeg, args, { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    encoder.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-12000); });
    encoder.stdin.on('error', () => {});
    const completed = new Promise((resolve, reject) => { encoder.once('error', reject); encoder.once('close', code => code === 0 ? resolve() : reject(Error(`FFmpeg exit ${code}: ${stderr}`))); });
    // Keep an early encoder failure handled while awaiting browser screenshots.
    completed.catch(() => {});
    const start = Date.now();
    for (let frame = 0; frame < fps * duration; frame++) {
      if (encoder.exitCode !== null) throw Error(`Encoder stopped: ${stderr}`);
      await page.evaluate(t => window.renderFrame(t), frame / fps);
      const buffer = await page.screenshot({ type: 'jpeg', quality: 94 });
      if (!encoder.stdin.write(buffer)) await once(encoder.stdin, 'drain');
      if (frame % 90 === 0) console.log(JSON.stringify({ renderPercent: Math.round(frame / (fps * duration) * 100), frames: frame, total: fps * duration, elapsedSeconds: Math.round((Date.now() - start) / 1000) }));
    }
    encoder.stdin.end(); await completed; encoder = null;
    const check = spawn(ffmpeg, ['-hide_banner', '-i', target, '-map', '0', '-f', 'null', '-'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let validation = ''; check.stderr.on('data', chunk => { validation = (validation + chunk).slice(-12000); });
    assert.equal(await new Promise((resolve, reject) => { check.once('error', reject); check.once('close', resolve); }), 0, 'Final MP4 decodes without errors');
    assert.ok(validation.includes('1080x1920') && /Video: h264/.test(validation) && /Audio: aac/.test(validation), 'Expected portrait H.264/AAC streams');
    assert.ok(/Duration: 00:00:30\./.test(validation), 'Thirty-second output');
    assert.ok(/yuv420p\(tv, bt709/.test(validation), 'Standard limited-range BT.709 video');
    assert.ok(/frame=\s*900\b/.test(validation), 'All 900 frames decoded');
    assert.deepEqual(errors, [], 'No frame rendering errors');
    await writeFile(path.join(output, 'render-manifest.json'), JSON.stringify({ title: 'SarvNema cinematic Persian reel', width, height, fps, duration, frames: fps * duration, bytes: (await stat(target)).size, video: 'H.264 high / yuv420p / BT.709', audio: 'AAC stereo / 48kHz / 192kbps', soundtrack: score, externalFilmFootage: false, productCaptures: true, narration: false, decodeVerified: true }, null, 2) + '\n');
    console.log(`RENDER COMPLETE ${target}`);
  }
  const captions = [
    ['00:00:00,000', '00:00:03,500', 'امشب، چی ببینیم؟\nیک جست‌وجو تا انتخاب بعدی.'],
    ['00:00:03,500', '00:00:09,000', 'اسمش دقیق یادت نیست؟\nنزدیک بنویس؛ پیداش می‌کنیم.'],
    ['00:00:09,000', '00:00:16,000', 'دوریم؛ ولی با هم می‌بینیم.\nیک اتاق خصوصی. یک لینک دعوت.'],
    ['00:00:16,000', '00:00:22,000', 'فقط دیدن نیست. وقتِ شنیدنه.\nپلی‌لیست‌ها، موسیقی و شنیدن همزمان.'],
    ['00:00:22,000', '00:00:26,000', 'فیلم. سریال. موسیقی.\nهمه، در یک جست‌وجو.'],
    ['00:00:26,000', '00:00:30,000', 'سرونما؛ موتور جستجوی فیلم، سریال و موسیقی\nsarvnema.ir'],
  ];
  await writeFile(path.join(output, 'sarvnema-reel-fa.srt'), captions.map(([start, end, text], i) => `${i + 1}\n${start} --> ${end}\n${text}\n`).join('\n'), 'utf8');
  await writeFile(path.join(output, 'instagram-caption-fa.txt'), 'از یک جستجوی ساده تا یک قرار برای فیلم دیدن. ✨\n\nفیلم و سریال دلخواهت را پیدا کن؛ حتی وقتی اسمش دقیق یادت نیست.\nبا هم ببینید، با هم بشنوید.\n\nسرونما | موتور جستجوی فیلم، سریال و موسیقی\nsarvnema.ir\n\n#سرونما #فیلم_و_سریال #تماشای_همزمان #موسیقی\n', 'utf8');
} finally {
  if (encoder && encoder.exitCode === null) encoder.kill();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
