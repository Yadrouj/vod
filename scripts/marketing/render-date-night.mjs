import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createDateNightScore } from './date-night-score.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.resolve(root, process.env.DATE_NIGHT_OUTPUT || '.media-cache/marketing/sarvnema-date-night');
const assets = path.join(output, 'assets');
const plan = JSON.parse(await readFile(path.join(root, 'scripts/marketing/date-night-plan.json'), 'utf8'));
const { duration, fps } = plan;
const width = 1080, height = 1920, frames = duration * fps;
await mkdir(output, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const pinned = new Map([
  ['/', path.join(root, 'scripts/marketing/date-night-reel.html')],
  ['/fonts/regular.ttf', path.join(root, 'public/fonts/IRANSansXFaNum-Regular.ttf')],
  ['/fonts/bold.ttf', path.join(root, 'public/fonts/IRANSansXFaNum-Bold.ttf')],
  ['/fonts/black.ttf', path.join(root, 'public/fonts/IRANSansXFaNum-Black.ttf')],
  ['/brand/mark.svg', path.join(root, 'public/brand/sarvnema-mark.svg')],
]);
const types = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost'); let file = pinned.get(url.pathname);
    if (!file && /^\/assets\/[a-z-]+\.(jpg|png)$/.test(url.pathname)) file = path.join(assets, path.basename(url.pathname));
    if (!file) { res.writeHead(404).end(); return; }
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes);
  } catch { res.writeHead(500).end('Asset unavailable'); }
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
let encoder;
const run = (binary, args) => new Promise((resolve, reject) => {
  const process = spawn(binary, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }); let stderr = '';
  process.stderr.on('data', bytes => { stderr = (stderr + bytes).slice(-24000); });
  process.on('error', reject); process.on('close', code => code === 0 ? resolve(stderr) : reject(Error(`Encoder exit ${code}: ${stderr}`)));
});
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin, { waitUntil: 'load' }); await page.evaluate(() => window.reelReady);
  assert.ok(await page.evaluate(() => document.fonts.check('950 100px Reel')), 'Persian display font');
  const timeline = await page.evaluate(() => [...document.querySelectorAll('.scene')].map(el => ({ id: el.id, start: Number(el.dataset.start), end: Number(el.dataset.end) })));
  assert.deepEqual(timeline, plan.scenes.map(({ id, start, end }) => ({ id, start, end })), 'Motion and narration use the same timeline');
  for (const scene of plan.scenes) {
    await page.evaluate(t => window.renderFrame(t), (scene.start + scene.end) / 2);
    await page.screenshot({ path: path.join(output, `storyboard-${scene.id}.jpg`), type: 'jpeg', quality: 95 });
    console.log(`STORYBOARD ${scene.id}`);
  }
  await page.evaluate(() => window.renderFrame(2.3));
  await page.screenshot({ path: path.join(output, 'sarvnema-date-night-cover.jpg'), type: 'jpeg', quality: 96 });
  const stamp = seconds => new Date(seconds * 1000).toISOString().slice(11, 23).replace('.', ',');
  await writeFile(path.join(output, 'sarvnema-date-night-fa.srt'), plan.scenes.map((scene, i) => `${i + 1}\n${stamp(scene.voiceStart)} --> ${stamp(scene.voiceEnd)}\n${scene.caption}\n`).join('\n'), 'utf8');
  await writeFile(path.join(output, 'narration-fa.txt'), plan.scenes.map(scene => `[${scene.voiceStart}s]\n${scene.spoken}\n`).join('\n'), 'utf8');
  await writeFile(path.join(output, 'instagram-caption-fa.txt'), 'الان وقتِ با هم دیدنه! 🍿\n\nپارتنرت دوره؟ یه اتاق خصوصی بساز، لینک رو بفرست و با هم فیلم ببینید. قابلیت تماشای همزمان سرونما رایگانه.\n\nدو پیشنهاد برای قرار بعدی‌تون:\n🎬 ادیسه، اثر کریستوفر نولان\nhttps://sarvnema.ir/tt33764258\nنسخهٔ دیجیتال رسمی ادیسه: ۱۷ نوامبر ۲۰۲۶.\n\n🚀 پروژه هیل مری با رایان گاسلینگ\nhttps://sarvnema.ir/tt12042730\n\nرایگان بودن مربوط به قابلیت تماشای همزمان است؛ دسترسی به هر اثر تابع شرایط منبع آن است.\nروایت ریل با صدای مصنوعی مرد فارسی تولید شده است.\n\nsarvnema.ir\n#سرونما #تماشای_همزمان #قرار_سینمایی #ادیسه #هیل_مری #فیلم_و_سریال\n', 'utf8');
  assert.deepEqual(errors, []);
  if (!process.argv.includes('--preview-only')) {
    let ffmpeg = process.env.FFMPEG_BINARY;
    if (!ffmpeg) {
      const dir = path.join(root, '.media-cache/reel-tools/python/imageio_ffmpeg/binaries');
      const name = (await readdir(dir)).find(file => /^ffmpeg.*\.exe$/.test(file)); assert.ok(name, 'FFMPEG_BINARY is required'); ffmpeg = path.join(dir, name);
    }
    const soundtrack = await createDateNightScore(path.join(output, 'original-date-night-score.wav'));
    const audioArgs = ['-y', '-hide_banner', '-i', path.join(output, 'original-date-night-score.wav')];
    const filters = [], timings = [];
    for (const [i, scene] of plan.scenes.entries()) {
      const file = path.join(output, 'voice', `${scene.id}.mp3`);
      const probe = await run(ffmpeg, ['-hide_banner', '-i', file, '-f', 'null', '-']);
      const match = probe.match(/Duration: (\d+):(\d+):(\d+\.\d+)/); assert.ok(match, `Narration duration: ${scene.id}`);
      const sourceDuration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
      const window = scene.voiceEnd - scene.voiceStart, tempo = Math.max(1, sourceDuration / (window - .06));
      assert.ok(tempo <= 1.28, `Rewrite overlong narration rather than speeding unnaturally: ${scene.id}`);
      audioArgs.push('-i', file);
      const delay = Math.round(scene.voiceStart * 1000);
      filters.push(`[${i + 1}:a]aresample=48000,highpass=f=90,lowpass=f=10500,acompressor=threshold=0.055:ratio=2.5:attack=8:release=100,loudnorm=I=-18:TP=-3:LRA=6,atempo=${tempo.toFixed(5)},atrim=duration=${window},afade=t=in:d=0.012,adelay=${delay}|${delay}[v${i}]`);
      timings.push({ scene: scene.id, sourceDuration, tempo, start: scene.voiceStart, end: scene.voiceEnd });
    }
    filters.push(`${plan.scenes.map((_, i) => `[v${i}]`).join('')}amix=inputs=6:normalize=0,apad=whole_dur=${duration},asplit=2[voice][side]`, '[0:a]volume=0.52[music]', '[music][side]sidechaincompress=threshold=0.018:ratio=6:attack=15:release=260[duck]', '[duck][voice]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=7,alimiter=limit=0.84:level=false[mix]');
    const mixed = path.join(output, 'date-night-voice-and-score.wav');
    await run(ffmpeg, [...audioArgs, '-filter_complex', filters.join(';'), '-map', '[mix]', '-t', String(duration), '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', mixed]);
    console.log('NARRATION MIXED: six Persian male segments; music ducks under speech');
    const target = path.join(output, 'sarvnema-date-night-fa.mp4');
    const vf = 'sidedata=mode=delete:type=ICC_PROFILE,scale=in_range=full:out_range=limited:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p,setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709';
    encoder = spawn(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'warning', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', String(fps), '-i', 'pipe:0', '-i', mixed, '-t', String(duration), '-map', '0:v:0', '-map', '1:a:0', '-vf', vf, '-c:v', 'libx264', '-threads', '2', '-preset', 'fast', '-crf', '18', '-profile:v', 'high', '-level:v', '4.1', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-r', String(fps), '-fps_mode', 'cfr', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-metadata', 'title=SarvNema - Now is the time to watch together', '-metadata', 'comment=Synthetic Persian male narration; original music; public promotional film stills', target], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = ''; encoder.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-12000); }); encoder.stdin.on('error', () => {});
    const completed = new Promise((resolve, reject) => { encoder.once('error', reject); encoder.once('close', code => code === 0 ? resolve() : reject(Error(stderr))); }); completed.catch(() => {});
    const start = Date.now();
    for (let frame = 0; frame < frames; frame++) {
      if (encoder.exitCode !== null) throw Error(`Video encoder stopped: ${stderr}`);
      await page.evaluate(t => window.renderFrame(t), frame / fps);
      if (!encoder.stdin.write(await page.screenshot({ type: 'jpeg', quality: 94 }))) await once(encoder.stdin, 'drain');
      if (frame % 108 === 0) console.log(JSON.stringify({ renderPercent: Math.round(frame / frames * 100), frame, frames, elapsedSeconds: Math.round((Date.now() - start) / 1000) }));
    }
    encoder.stdin.end(); await completed; encoder = null;
    const validation = await run(ffmpeg, ['-hide_banner', '-i', target, '-map', '0', '-f', 'null', '-']);
    assert.ok(validation.includes('1080x1920') && /Video: h264/.test(validation) && /Audio: aac/.test(validation));
    assert.ok(validation.includes('Duration: 00:00:36.') && /frame=\s*1080\b/.test(validation));
    assert.ok(/yuv420p\(tv, bt709/.test(validation)); assert.deepEqual(errors, []);
    const bytes = await readFile(target), moov = bytes.indexOf(Buffer.from('moov')), mdat = bytes.indexOf(Buffer.from('mdat'));
    assert.ok(moov > 0 && moov < mdat, 'Fast-start MP4');
    pinned.set('/result.mp4', target);
    const playback = await browser.newPage();
    await playback.goto(origin); await playback.evaluate(() => { document.body.innerHTML = '<video muted autoplay playsinline src="/result.mp4"></video>'; });
    await playback.waitForFunction(() => { const v = document.querySelector('video'); return v?.readyState >= 2 && v.videoWidth === 1080 && v.currentTime > .2; });
    assert.equal(await playback.evaluate(() => document.querySelector('video').duration), duration);
    const loudness = await run(ffmpeg, ['-hide_banner', '-i', target, '-vn', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-']);
    const meter = JSON.parse(loudness.match(/\{\s*"input_i"[^}]+\}/)?.[0] || '{}');
    assert.ok(Number(meter.input_tp) <= -1, 'Audio true-peak headroom');
    await writeFile(path.join(output, 'render-manifest.json'), JSON.stringify({ duration, fps, width, height, frames, bytes: (await stat(target)).size, decodeVerified: true, browserPlaybackVerified: true, faststart: true, color: 'BT.709 limited / yuv420p', narration: { voice: plan.voice.name, synthetic: true, timings }, soundtrack, audio: { integratedLUFS: Number(meter.input_i), truePeakDBTP: Number(meter.input_tp), ducking: true }, sourceManifest: 'source-manifest.json' }, null, 2) + '\n');
    console.log(`RENDER COMPLETE ${target}`);
  }
} finally {
  if (encoder && encoder.exitCode === null) encoder.kill();
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
