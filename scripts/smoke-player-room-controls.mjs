import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { io } from 'socket.io-client';

// Only synthetic media/devices are used. No real microphone or movie is read.
const origin = process.env.LOAD_BASE_URL || 'http://localhost:3006';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const { chromium } = process.env.PLAYWRIGHT_MODULE ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href) : await import('playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const wav = Buffer.alloc(44 + 180 * 8000 * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
const sockets = [], errors = [];
let currentPage;
await mkdir('.media-cache/player-controls', { recursive: true });
const ack = (socket, event, payload) => new Promise((resolve, reject) => socket.timeout(10000).emit(event, payload, (error, result) => error || !result?.ok ? reject(error || Error(result?.error || event)) : resolve(result)));
async function setup(width = 1440, mobile = false, profile) {
  const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 1000 }, isMobile: mobile, hasTouch: mobile, permissions: ['camera', 'microphone'], reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'vod_locale', value: 'en', url: origin }]);
  await context.addInitScript(profile => {
    if (profile) localStorage.setItem('sarvnema_party_profile', JSON.stringify(profile));
    window.__captureStreams = [];
    window.__peers = [];
    const Peer = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends Peer { constructor(config) { super(config); window.__peers.push(this); } };
    const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => { const stream = await capture(constraints); window.__captureStreams.push(stream); return stream; };
  }, profile);
  await context.route('**/api/subtitles/**', route => route.fulfill({ json: { items: [] } }));
  await context.route('**/*', async route => {
    if (route.request().resourceType() !== 'media') return route.fallback();
    const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range || '');
    const start = range ? Number(range[1]) : 0, end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
    await route.fulfill({ status: range ? 206 : 200, contentType: 'audio/wav', body: wav.subarray(start, end + 1), headers: { 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}) } });
  });
  const page = await context.newPage(); currentPage = page; page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(error.message));
  return { page, context };
}
async function bounds(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal document overflow');
  const failures = await page.locator('[data-player-controls] button:visible, [data-player-controls] input:visible, [aria-label="Room microphone and camera"] button').evaluateAll(nodes => nodes.filter(node => { const r = node.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); }).map(node => node.getAttribute('aria-label')));
  assert.deepEqual(failures, [], 'Controls stay inside viewport');
}
async function ready(page, selector) { await page.waitForFunction(selector => document.querySelector(selector)?.duration === 180, selector); }
async function watch(page) {
  await page.goto(`${origin}/watch/tt0903747`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await ready(page, 'video.player');
  await page.waitForFunction(() => document.querySelectorAll('[data-player-frame]').length === 1);
}
async function createRoom(audio = false) {
  const socket = io(origin, { transports: ['websocket'], autoConnect: false }); sockets.push(socket);
  const connected = new Promise(resolve => socket.once('connect', resolve)); socket.connect(); await connected;
  const profile = { id: crypto.randomUUID(), name: audio ? 'Listening host' : 'Watching host', avatarUrl: null };
  const source = { url: `https://media.example.test/${audio ? 'audio.mp3' : 'video.mp4'}`, label: '1080p test source', quality: '1080p' };
  const room = await ack(socket, 'room:create', { profile, media: { itemId: 'tt-smoke-ui', title: 'Friends movie night', posterUrl: null, source, sources: [source], mediaKind: audio ? 'audio' : 'video', catalogue: audio ? 'music' : 'vod' } });
  return { ...room, socket, profile, url: `${origin}/watch-together/${room.roomId}?invite=${room.inviteToken}` };
}
async function microphone(page) {
  await page.getByRole('button', { name: 'Enable microphone', exact: true }).click();
  const ptt = page.getByRole('button', { name: 'Hold to talk', exact: true }); await ptt.waitFor();
  assert.equal(await page.evaluate(() => window.__captureStreams.flatMap(s => s.getAudioTracks()).some(t => t.enabled)), false, 'Mic stays muted after permission');
  const box = await ptt.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.waitForFunction(() => window.__captureStreams.flatMap(s => s.getAudioTracks()).some(t => t.enabled));
  await page.mouse.move(box.x - 70, box.y + 130); await page.mouse.up();
  await page.waitForFunction(() => window.__captureStreams.flatMap(s => s.getAudioTracks()).every(t => !t.enabled));
  await ptt.focus(); await page.keyboard.down('Space');
  await page.waitForFunction(() => window.__captureStreams.flatMap(s => s.getAudioTracks()).some(t => t.enabled));
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(() => window.__captureStreams.flatMap(s => s.getAudioTracks()).every(t => !t.enabled));
  await page.keyboard.up('Space');
}
try {
  {
    const { page, context } = await setup(); await watch(page);
    const frame = page.locator('[data-player-frame]'), surface = page.locator('[data-player-surface]');
    await frame.focus(); await page.keyboard.press('k');
    await page.waitForFunction(() => !document.querySelector('video.player').paused);
    await page.keyboard.press('l'); await page.waitForFunction(() => document.querySelector('video.player').currentTime >= 10);
    await page.keyboard.press('5'); await page.waitForFunction(() => document.querySelector('video.player').currentTime >= 90);
    await page.keyboard.press('m'); assert.equal(await page.locator('video.player').evaluate(v => v.muted), true);
    await surface.dblclick({ position: { x: 100, y: 110 } }); await page.waitForFunction(() => Boolean(document.fullscreenElement));
    await page.keyboard.press('f'); await page.waitForFunction(() => !document.fullscreenElement);
    await frame.focus(); await page.keyboard.press('t'); await bounds(page);
    await page.keyboard.press('t');
    await surface.click({ position: { x: 100, y: 110 } });
    await page.waitForFunction(() => document.querySelector('video.player').paused);
    await surface.click({ position: { x: 100, y: 110 } });
    await page.waitForFunction(() => !document.querySelector('video.player').paused);
    await page.locator('[data-player-controls]').getByRole('button', { name: 'Settings', exact: true }).click();
    await page.locator('[data-player-settings]').getByRole('button', { name: /Playback speed/ }).click();
    await page.locator('[data-player-settings]').getByRole('button', { name: '1.5×', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('video.player').playbackRate === 1.5);
    const box = await surface.boundingBox(); await page.mouse.move(box.x + 100, box.y + 110); await page.mouse.down();
    await page.waitForFunction(() => document.querySelector('video.player').playbackRate === 2); await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('video.player').playbackRate === 1.5);
    await bounds(page); await page.screenshot({ path: '.media-cache/player-controls/desktop.png' });
    console.log('PASS desktop keyboard, single/double-click, fullscreen, theater, speed menu, hold/release 2x'); await context.close();
  }
  for (const width of [320, 390]) {
    const { page, context } = await setup(width, true); await watch(page); await bounds(page);
    await page.locator('[data-player-controls]').getByRole('button', { name: 'Settings', exact: true }).tap();
    const dialog = page.locator('dialog[open]'); const box = await dialog.boundingBox();
    assert.ok(Math.abs(box.width - width) <= 1 && box.height >= 830, 'Mobile settings fill viewport');
    await page.locator('[data-player-settings]').getByRole('button', { name: /Playback speed/ }).tap();
    await page.locator('[data-player-settings]').getByRole('button', { name: '1.25×', exact: true }).tap();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    const surface = page.locator('[data-player-surface]');
    const surfaceBox = await surface.boundingBox();
    await page.touchscreen.tap(surfaceBox.x + surfaceBox.width * .82, surfaceBox.y + surfaceBox.height * .3);
    await page.touchscreen.tap(surfaceBox.x + surfaceBox.width * .82, surfaceBox.y + surfaceBox.height * .3);
    await page.waitForFunction(() => document.querySelector('video.player').currentTime >= 10);
    await page.screenshot({ path: `.media-cache/player-controls/mobile-${width}.png` });
    console.log(`PASS ${width}px player controls, double-tap seeking and full-screen settings`); await context.close();
  }
  for (const audio of [false, true]) {
    const room = await createRoom(audio);
    const { page, context } = await setup(390, true, room.profile);
    await page.goto(room.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const mediaSelector = `.party-player-stage > ${audio ? 'audio' : 'video'}`;
    await ready(page, mediaSelector); await bounds(page);
    assert.equal(await page.evaluate(() => window.__captureStreams.length), 0, 'No capture on room entry');
    await microphone(page);
    await page.getByRole('button', { name: 'Turn camera on', exact: true }).click();
    await page.getByRole('button', { name: 'Turn camera off', exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('.party-camera-tile video')?.srcObject?.getVideoTracks().some(t => t.readyState === 'live'));
    const guestProfile = { id: crypto.randomUUID(), name: 'Guest', avatarUrl: null };
    const guest = await setup(1440, false, guestProfile); await guest.page.goto(room.url, { waitUntil: 'domcontentloaded' }); await ready(guest.page, mediaSelector);
    await guest.page.getByRole('button', { name: 'Enable microphone', exact: true }).click();
    await guest.page.getByRole('button', { name: 'Hold to talk', exact: true }).waitFor();
    await guest.page.waitForFunction(() => document.querySelector('.party-camera-tile video')?.videoWidth > 0, undefined, { timeout: 30000 });
    await page.screenshot({ path: `.media-cache/player-controls/${audio ? 'listen' : 'watch'}-camera.png` });
    // One seek command on release, with the same server position on the guest.
    const seek = page.getByRole('slider', { name: 'Seek', exact: true }); await seek.fill('60'); await seek.dispatchEvent('pointerup');
    await guest.page.waitForFunction(selector => Math.abs(document.querySelector(selector).currentTime - 60) < 1, mediaSelector);
    await ack(room.socket, 'playback:command', { roomId: room.roomId, action: 'play', time: 60 });
    await page.waitForFunction(selector => !document.querySelector(selector).paused, mediaSelector);
    await page.getByRole('button', { name: 'Voice and camera options', exact: true }).click();
    await page.getByRole('dialog').waitFor(); await page.getByRole('button', { name: 'Close voice and camera', exact: true }).click();
    await page.getByRole('button', { name: 'Turn camera off', exact: true }).click();
    await page.waitForFunction(() => window.__captureStreams.flatMap(s => s.getVideoTracks()).every(t => t.readyState === 'ended'));
    await bounds(page); await page.screenshot({ path: `.media-cache/player-controls/${audio ? 'listen' : 'watch'}-room.png` });
    console.log(`PASS ${audio ? 'listen' : 'watch'} room: opt-in camera, remote video, PTT release/blur, shared seek, full-screen options`);
    await guest.context.close(); await context.close(); room.socket.disconnect();
  }
  assert.deepEqual(errors, [], 'No browser runtime errors');
} catch (error) {
  for (const context of browser.contexts()) for (const page of context.pages()) {
    console.log('ROOM DEBUG', JSON.stringify(await page.evaluate(() => ({
      url: location.pathname, voice: document.querySelector('.party-voice')?.textContent, cameras: document.querySelectorAll('.party-camera-tile').length,
      tracks: window.__captureStreams?.flatMap(s => s.getTracks()).map(t => ({ kind: t.kind, enabled: t.enabled, state: t.readyState })),
      peers: window.__peers?.map(p => ({ state: p.connectionState, ice: p.iceConnectionState, signal: p.signalingState, local: p.localDescription?.type, remote: p.remoteDescription?.type,
        send: p.getSenders().map(s => ({ kind: s.track?.kind, state: s.track?.readyState })), receive: p.getReceivers().map(r => ({ kind: r.track?.kind, muted: r.track?.muted, state: r.track?.readyState })) }))
    }))));
  }
  if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: '.media-cache/player-controls/failure.png' });
  throw error;
} finally { for (const socket of sockets) socket.disconnect(); await browser.close(); }
