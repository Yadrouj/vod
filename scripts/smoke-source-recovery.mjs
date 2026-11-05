import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { io } from 'socket.io-client';
const imported = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const { chromium } = imported.default ?? imported;
const origin = process.env.LOAD_BASE_URL || 'http://127.0.0.1:3004';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Local smoke test only');
const regional = url => /donyayeserial|aparatchi-dlcenter|varzeshha3-uploader/i.test(url);
const wav = Buffer.alloc(44 + 16000 * 60);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], results = [];
async function context(width, profile) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  await context.addCookies([{ name: 'vod_locale', value: 'fa', url: origin }]);
  if (profile) await context.addInitScript(value => localStorage.setItem('sarvnema_party_profile', JSON.stringify(value)), profile);
  const controls = { blockRegional: true };
  await context.route('**/*', route => {
    const request = route.request(), url = request.url();
    if (new URL(url).origin === origin) return route.continue();
    if (/\.(?:mp4|mkv|m4v|webm|mov)(?:$|\?)/i.test(url) && request.resourceType() === 'media') {
      if (regional(url) && controls.blockRegional) return route.abort();
      const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers().range || '');
      const start = range ? Number(range[1]) : 0, end = Math.min(range?.[2] ? Number(range[2]) : wav.length - 1, wav.length - 1);
      return route.fulfill({ status: range ? 206 : 200, contentType: 'audio/wav',
        headers: { 'Accept-Ranges': 'bytes', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}) }, body: wav.subarray(start, end + 1) });
    }
    return route.abort();
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  return { context, page, controls };
}
const ready = page => page.waitForFunction(() => document.querySelector('video')?.readyState >= 2, null, { timeout: 15000 });
try {
  for (const width of [320, 390, 1440]) {
    const { context: ctx, page, controls } = await context(width);
    const media = await (await page.request.get(`${origin}/api/watch-party/title/tt0230600`)).json();
    assert.equal(regional(media.source.url), false, 'Alternative is the API default');
    const ds = media.sources.find(source => regional(source.url)); assert.ok(ds);
    await page.goto(`${origin}/watch/tt0230600?resume=${encodeURIComponent(ds.url)}`, { waitUntil: 'domcontentloaded' });
    const panel = page.locator('[data-player-recovery]'); await panel.waitFor();
    assert.ok(await panel.getByText(/VPN/).count());
    const video = page.locator('video.player'); await video.evaluate(el => el.dataset.originalElement = 'true');
    await panel.getByRole('button', { name: 'تازه‌سازی پخش', exact: true }).click();
    await panel.waitFor(); assert.equal(await video.getAttribute('data-original-element'), null, 'Retry remounts the failed element');
    controls.blockRegional = false;
    await panel.getByRole('button', { name: 'تازه‌سازی پخش', exact: true }).click(); await ready(page);
    await video.evaluate(el => { el.currentTime = 17; el.pause(); });
    await page.waitForFunction(() => !document.querySelector('video.player')?.seeking && Math.abs((document.querySelector('video.player')?.currentTime ?? 0) - 17) < 1, null, { timeout: 5000 });
    await video.evaluate(el => el.dispatchEvent(new Event('error')));
    await panel.waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
    await panel.getByRole('button', { name: 'منبع بعدی', exact: true }).click(); await ready(page);
    assert.equal(regional(await video.getAttribute('src')), false, 'Next source selects an alternative');
    await page.waitForFunction(() => Math.abs((document.querySelector('video.player')?.currentTime ?? 0) - 17) < 2, null, { timeout: 5000 });
    await page.locator('.pro-player').evaluate(el => el.requestFullscreen());
    await video.evaluate(el => { el.pause(); el.dispatchEvent(new Event('error')); }); await panel.waitFor();
    assert.ok(await panel.evaluate(el => document.fullscreenElement?.contains(el)), 'Recovery stays in fullscreen');
    await panel.getByRole('button', { name: 'تازه‌سازی پخش', exact: true }).click(); await ready(page);
    await page.evaluate(() => document.exitFullscreen());
    results.push({ width, defaultAlternative: true, retry: true, nextSource: true, positionRetained: true, fullscreenRecovery: true });
    await ctx.close();
  }
  const host = io(origin, { transports: ['websocket'], autoConnect: false });
  await new Promise((resolve, reject) => { host.once('connect', resolve); host.once('connect_error', reject); host.connect(); });
  const emit = (event, data) => new Promise((resolve, reject) => { host.timeout(8000).emit(event, data, (error, result) => error ? reject(error) : resolve(result)); });
  try {
    const profile = { id: 'recovery-smoke-host-' + Date.now(), name: 'Recovery test', avatarUrl: null };
    const ds = { url: 'https://dls3.aparatchi-dlcenter.top/DonyayeSerial/Recovery.S01E01.mp4', label: 'Regional test fixture', season: 1, episode: 1 };
    const alt = { ...ds, url: 'https://sr.moviesho.com/Recovery.S01E01.mp4', label: 'Alternative test fixture' };
    const otherEpisode = { ...alt, url: alt.url.replace('E01', 'E02'), episode: 2 };
    const room = await emit('room:create', { profile, media: { itemId: 'recovery-fixture', title: 'Recovery fixture', posterUrl: null, source: ds, sources: [ds, otherEpisode, alt] } });
    assert.ok(room.ok, room.error);
    host.emit('permissions:global', { roomId: room.roomId, permissions: { changeSource: false } });
    const { context: ctx, page } = await context(390, profile);
    await page.goto(`${origin}/watch-together/${room.roomId}?invite=${encodeURIComponent(room.inviteToken)}`, { waitUntil: 'domcontentloaded' });
    const panel = page.locator('[data-player-recovery]'); await panel.waitFor();
    await panel.getByRole('button', { name: 'تازه‌سازی پخش', exact: true }).click(); await panel.waitFor();
    await panel.getByRole('button', { name: 'منبع بعدی', exact: true }).click(); await ready(page);
    assert.equal(await page.locator('.party-player-stage > video').getAttribute('src'), alt.url, 'Room recovery never changes episode');
    const guest = await context(390, { id: profile.id + '-guest', name: 'Guest', avatarUrl: null });
    await guest.page.goto(page.url(), { waitUntil: 'domcontentloaded' }); await ready(guest.page);
    await guest.page.locator('.party-player-stage > video').evaluate(el => el.dispatchEvent(new Event('error')));
    const guestPanel = guest.page.locator('[data-player-recovery]'); await guestPanel.waitFor();
    assert.equal(await guestPanel.getByRole('button', { name: 'منبع بعدی', exact: true }).count(), 0, 'Guest cannot switch shared source');
    await guestPanel.getByRole('button', { name: 'تازه‌سازی پخش', exact: true }).click(); await ready(guest.page);
    assert.equal(await page.locator('.party-player-stage > video').getAttribute('src'), alt.url, 'Guest retry does not interrupt host');
    assert.ok(await guest.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await guest.context.close(); await ctx.close(); results.push({ roomRecovery: true, sameEpisode: true, guestLocalRetry: true });
  } finally { host.disconnect(); }
  assert.deepEqual(errors, []); console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
