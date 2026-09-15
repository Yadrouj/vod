import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { io } from 'socket.io-client';

// Local UI fixtures only: no external media downloads, camera/mic, or public rooms.
const origin = process.env.LOAD_BASE_URL || 'http://localhost:3004';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const catalog = JSON.parse(await readFile('public/data/music-landing.json', 'utf8'));
await mkdir('.media-cache', { recursive: true });
const wav = Buffer.alloc(44 + 8000 * 600 * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
const sizes = [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 430, height: 932 }, { width: 844, height: 390 }];
const errors = [];
const sockets = [];
const page = await browser.newPage({ viewport: sizes[0], hasTouch: true, reducedMotion: 'reduce' });
page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(120000);
page.on('pageerror', error => errors.push(error.message));
await page.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url());
  if (request.resourceType() === 'media' || url.pathname === '/api/music/media') {
    const range = request.headers().range?.match(/bytes=(\d+)-(\d*)/);
    const start = Number(range?.[1] || 0), end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
    return route.fulfill({ status: range ? 206 : 200, contentType: 'audio/wav', headers: { 'Accept-Ranges': 'bytes', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}) }, body: wav.subarray(start, end + 1) });
  }
  if (url.pathname.startsWith('/api/subtitles/')) {
    if (url.pathname === '/api/subtitles/track') return route.fulfill({ contentType: 'text/vtt', body: 'WEBVTT\n\n00:00.000 --> 00:15.000\nOriginal subtitle fixture\n' });
    return route.fulfill({ json: { items: Array.from({ length: 18 }, (_, index) => ({ detailUrl: `https://example.com/subtitle/${index}`, trackUrl: '/api/subtitles/track?fixture=1', language: index % 2 ? 'English' : 'Farsi/Persian', releases: ['Original.test.release.1080p.WEB-DL.AAC.2026.long.release.name'], rating: 'good' })) } });
  }
  if (url.pathname === '/api/music/lyrics') return route.fulfill({ json: { status: 'not-found', lines: [], synced: false } });
  if (url.pathname.startsWith('/api/watch-party/title/')) {
    const source = { url: 'https://example.com/original-fixture.wav', label: 'Original fixture' };
    return route.fulfill({ json: { itemId: url.pathname.split('/').pop(), title: 'Original room fixture', posterUrl: null, source, sources: [source] } });
  }
  if (request.resourceType() === 'image' && url.origin !== new URL(origin).origin) return route.abort();
  return route.continue();
});
const dialog = page.locator('dialog[data-responsive-dialog][open]');
async function fit(label, full = true) {
  await dialog.waitFor();
  await page.waitForFunction(() => { const d = document.querySelector('dialog[data-responsive-dialog][open]'); return d?.matches(':modal'); });
  const result = await dialog.evaluate(el => {
    const r = el.getBoundingClientRect(), v = window.visualViewport;
    const content = el.children[1];
    return { x: r.x, y: r.y, width: r.width, height: r.height, vw: v.width, vh: v.height, overflow: content.scrollWidth - content.clientWidth, close: el.querySelector('header button').getBoundingClientRect().height };
  });
  assert.ok(result.x >= -1 && result.y >= -1 && result.x + result.width <= result.vw + 1 && result.y + result.height <= result.vh + 1, `${label}: stays inside viewport ${JSON.stringify(result)}`);
  if (full) assert.ok(Math.abs(result.width - result.vw) <= 1 && Math.abs(result.height - result.vh) <= 1, `${label}: full screen ${JSON.stringify(result)}`);
  assert.ok(result.overflow <= 1, `${label}: no horizontal content overflow ${JSON.stringify(result)}`);
  assert.ok(result.close >= 44, `${label}: touch-sized close button`);
  assert.equal(await dialog.count(), 1, `${label}: one active panel`);
  await page.screenshot({ path: `.media-cache/mobile-panels-${label}-${page.viewportSize().width}.png` });
}
async function closePanel() { await dialog.locator(':scope > header button').click(); await dialog.waitFor({ state: 'detached' }); }
async function hydratedClick(locator) {
  await locator.waitFor();
  await locator.evaluate(button => new Promise(resolve => {
    const check = () => Object.keys(button).some(key => key.startsWith('__reactProps$') && typeof button[key]?.onClick === 'function') ? requestAnimationFrame(() => requestAnimationFrame(resolve)) : setTimeout(check, 50);
    check();
  }));
  await locator.click();
}
async function markMedia(media) {
  await media.evaluate(el => { el.dataset.fixtureInstance = 'same'; el.dataset.interruptions = '0'; for (const event of ['pause', 'emptied']) el.addEventListener(event, () => el.dataset.interruptions = String(Number(el.dataset.interruptions) + 1)); });
}
async function uninterrupted(media) { assert.equal(await media.getAttribute('data-fixture-instance'), 'same'); assert.equal(await media.getAttribute('data-interruptions'), '0'); assert.equal(await media.evaluate(el => el.paused), false); }
function ack(socket, event, payload) { return new Promise((resolve, reject) => socket.timeout(12000).emit(event, payload, (error, result) => error ? reject(error) : result?.ok ? resolve(result) : reject(new Error(result?.error || event)))); }

try {
  if (!process.env.PANELS_ROOMS_ONLY) {
  await page.goto(`${origin}/watch/tt0903747`, { waitUntil: 'domcontentloaded' });
  // Production streaming can briefly contain the hidden replacement segment
  // and its visible predecessor. Wait for the real, hydrated player to settle.
  await page.waitForFunction(() => { const players = document.querySelectorAll('.pro-player'); if (players.length !== 1) return false; const button = players[0].querySelector('button'); return button && Object.keys(button).some(key => key.startsWith('__reactProps$') && typeof button[key]?.onClick === 'function'); });
  await page.locator('.pro-player').waitFor();
  await fit('source'); await dialog.locator(':scope > footer button').click(); await dialog.waitFor({ state: 'detached' });
  const movie = page.locator('.pro-player video').first();
  await page.waitForFunction(() => document.querySelector('.pro-player video')?.currentTime > .1);
  await markMedia(movie);
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.locator('.pro-player').hover();
    await page.locator('.pro-player button[aria-label="Subtitles"]').click();
    await dialog.locator('.subtitle-online-list button').first().waitFor();
    await fit('subtitles');
    await dialog.locator('.subtitle-advanced summary').click();
    const input = dialog.locator('.subtitle-url-row input');
    await input.fill('https://example.com/a-long-subtitle-link.srt');
    await fit('subtitle-custom');
    await closePanel();
    await page.locator('.pro-player').hover();
    await page.locator('.player-actions-end .player-icon-btn').last().click();
    await fit('movie-settings');
    await closePanel();
    await uninterrupted(movie);
  }
  // A top-layer subtitle panel must also work above actual browser fullscreen.
  await page.locator('.pro-player').hover();
  await page.locator('.player-actions-end button').last().click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  await page.locator('.pro-player button[aria-label="Subtitles"]').click();
  await fit('fullscreen-subtitles'); await closePanel();
  await page.evaluate(() => document.exitFullscreen());
  console.log('PASS movie: source, subtitles, custom URL, settings, portrait/landscape, browser fullscreen, uninterrupted playback');

  await page.setViewportSize(sizes[0]);
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await hydratedClick(page.locator('.app-mobile-nav button').filter({ hasText: 'تماشای همزمان' }));
  await fit('builder-search');
  await dialog.locator('.watch-builder-search input').fill('breaking');
  await dialog.locator('.watch-builder-results button').first().waitFor();
  await fit('builder-results');
  await dialog.locator('.watch-builder-results button').first().click();
  await fit('builder-profile');
  assert.equal(await dialog.locator('.watch-builder-results').count(), 0, 'Search results do not overlap the create step');
  for (const size of sizes) { await page.setViewportSize(size); await fit('builder-profile'); }
  await dialog.locator('.watch-builder-profile-fields input').first().fill('Mobile room fixture');
  await dialog.locator(':scope > footer button').click();
  await dialog.locator('.watch-builder-success').waitFor();
  for (const size of [sizes[1], sizes[3]]) { await page.setViewportSize(size); await fit('builder-invite'); }
  await closePanel();
  console.log('PASS room builder: full-screen search, results, selection/profile, fixed action and back/close');

  for (const kind of ['track', 'video']) {
    const item = catalog.tracks.find(track => track.kind === kind && track.sources.length);
    assert.ok(item);
    await page.setViewportSize(sizes[0]);
    await page.goto(`${origin}/music/${item.id}`, { waitUntil: 'domcontentloaded' });
    const host = page.locator('[data-music-player-host]'), media = host.locator('audio,video');
    await host.locator('.music-play-toggle').click();
    await page.waitForFunction(() => document.querySelector('[data-music-player-host] audio,[data-music-player-host] video')?.currentTime > .1);
    await markMedia(media);
    for (const size of sizes) {
      await page.setViewportSize(size);
      await host.getByRole('button', { name: 'تنظیمات پخش موسیقی', exact: true }).click(); await fit(`${kind}-settings`); await closePanel();
      await host.getByRole('button', { name: 'Listening queue', exact: true }).click(); await fit(`${kind}-queue`); await closePanel();
      await host.locator('.music-lyrics-toggle').click(); await fit(`${kind}-lyrics`); await closePanel();
      await uninterrupted(media);
    }
    await page.setViewportSize(sizes[0]);
    await host.getByRole('button', { name: 'نمای تمام‌صفحهٔ موسیقی و متن' }).click();
    await page.waitForFunction(() => document.querySelector('[data-music-player-host]')?.matches(':modal'));
    await host.locator('.music-lyrics-toggle').click(); await fit(`${kind}-immersive-lyrics`);
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
    assert.ok(await host.evaluate(el => el.matches(':modal')), 'Closing a child panel does not close the music screen');
    await page.keyboard.press('Escape');
    await page.locator('.music-back').click();
    await page.waitForURL('**/music');
    await host.getByRole('button', { name: 'بزرگ کردن پلیر' }).click();
    await page.waitForFunction(() => document.querySelector('[data-music-player-host]')?.matches(':modal'));
    await uninterrupted(media);
    await page.keyboard.press('Escape');
    await host.getByRole('button', { name: 'بستن و قطع موسیقی' }).click();
    console.log(`PASS ${kind}: four viewports, settings/queue/lyrics, nested fullscreen, mini-player expand, uninterrupted media`);
  }

  }
  for (const mode of ['watch', 'listen']) {
    const socket = io(origin, { transports: ['websocket'], forceNew: true }); sockets.push(socket);
    await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    const source = { url: 'https://example.com/original-fixture.wav', label: 'Original fixture', quality: '720p', season: null, episode: null };
    const created = await ack(socket, 'room:create', { profile: { id: `mobile-ui-host-${mode}`, name: 'Mobile UI fixture' }, visibility: 'private', media: { itemId: `fixture-${mode}`, title: 'Mobile player original test fixture', mediaKind: mode === 'listen' ? 'audio' : 'video', catalogue: mode === 'listen' ? 'music' : 'vod', posterUrl: null, source, sources: [source] } });
    await page.addInitScript(() => localStorage.setItem('sarvnema_party_profile', JSON.stringify({ id: 'mobile-ui-guest', name: 'UI test guest' })));
    await page.setViewportSize(sizes[0]);
    await page.goto(`${origin}/watch-together/${created.roomId}?invite=${encodeURIComponent(created.inviteToken)}`, { waitUntil: 'domcontentloaded' });
    await page.locator('.party-player-stage').waitFor();
    for (const size of sizes) {
      await page.setViewportSize(size);
      for (const [selector, label] of [['button[aria-label="Room chat"]','chat'], ['button[aria-label="Playback settings"]','settings'], ['.party-voice-toggle','voice'], ['.party-accessibility-toggle','accessibility'], ['.party-people-action','people']]) {
        if (mode === 'listen' && label === 'accessibility') continue; // Video/caption tools are intentionally absent in audio rooms.
        await page.locator('.party-player-stage').hover();
        await page.locator(selector).click(); await fit(`${mode}-${label}`); await closePanel();
      }
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('.party-people-action').click();
    await page.locator('.party-sidebar').waitFor();
    assert.equal(await dialog.count(), 0, 'Desktop keeps its existing drawer');
    socket.disconnect();
    console.log(`PASS ${mode} room: all available panels in four viewports; desktop drawer preserved`);
  }
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('PASS mobile player panels: all assertions');
} catch (error) {
  await page.screenshot({ path: '.media-cache/mobile-panels-failure.png' }).catch(() => {});
  console.error('Browser errors:', errors);
  throw error;
} finally { sockets.forEach(socket => socket.disconnect()); await browser.close(); }
