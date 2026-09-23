import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Run against a local server with DISCOVERY_DATA_DIR=.media-cache/feedback-smoke.
// Media is intercepted: this tests controls without downloading a real film.
const origin = process.env.LOAD_BASE_URL || 'http://localhost:3006';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Local testing only');
const { chromium } = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
  : await import('playwright');
const seconds = 180, sampleRate = 8000;
const wav = Buffer.alloc(44 + seconds * sampleRate * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
await mkdir('.media-cache', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
let activePage;
async function setup(width = 1440, mobile = false, locale = 'en') {
  const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 1000 }, reducedMotion: 'reduce', hasTouch: mobile, isMobile: mobile });
  await context.addCookies([{ name: 'vod_locale', value: locale, url: origin }]);
  await context.route('**/*', async route => {
    if (route.request().resourceType() !== 'media') return route.continue();
    const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range || '');
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
    await route.fulfill({ status: range ? 206 : 200, contentType: 'audio/wav', body: wav.subarray(start, end + 1), headers: {
      'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}),
    } });
  });
  const page = await context.newPage();
  activePage = page;
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(30000);
  return { page, context };
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
}
async function watch(page, id = 'tt0903747') {
  const response = await page.goto(`${origin}/watch/${id}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  assert.equal(response.status(), 200);
  await page.waitForFunction(() => document.querySelector('video.player')?.duration === 180);
  // Wait until React removes hidden streaming segments, not just the visible player.
  await page.waitForFunction(() => document.querySelectorAll('.pro-player').length === 1);
  assert.equal(await page.locator('dialog[open]').count(), 0, 'No source gate on first visit');
  const box = await page.locator('.player-center').boundingBox();
  assert.ok(box.width <= 65 && box.height <= 65, 'Play button stays bounded');
  await noOverflow(page);
}
try {
  const { page, context } = await setup();
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 120000 });
  // Next streaming may briefly retain a hidden copy before hydration reveals it.
  const hero = page.locator('[data-cinema-hero]:visible');
  await hero.waitFor();
  const geometry = await hero.evaluate(element => {
    const heroRect = element.getBoundingClientRect();
    const header = document.querySelector('.film-landing-shell > .gradient-menu');
    const headerRect = header?.getBoundingClientRect();
    const headerStyle = header ? getComputedStyle(header) : null;
    return {
      width: heroRect.width,
      top: heroRect.top,
      height: heroRect.height,
      viewport: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
      headerTop: headerRect?.top,
      headerBottom: headerRect?.bottom,
      headerPosition: headerStyle?.position,
      headerShadow: headerStyle?.boxShadow,
    };
  });
  assert.equal(geometry.width, geometry.viewport, 'Hero fills the viewport excluding the browser scrollbar');
  assert.ok(Math.abs(geometry.top) <= 1, 'Hero starts behind the landing header');
  assert.ok(geometry.height >= geometry.viewportHeight - 1, 'Hero occupies the full first viewport');
  assert.equal(geometry.headerPosition, 'absolute', 'Landing header overlays the hero artwork');
  assert.ok(geometry.headerTop >= geometry.top && geometry.headerBottom <= geometry.top + geometry.height, 'Landing header stays within the hero');
  assert.notEqual(geometry.headerShadow, 'none', 'Landing header has contrast shadow over artwork');
  await hero.getByText('Latest recorded IMDb trend', { exact: true }).waitFor();
  assert.equal(await hero.locator('a[href*="imdb.com/chart/"]').count(), 1, 'Hero exposes the IMDb trend source and rank');
  const before = await hero.locator('h1').innerText();
  await hero.getByRole('button', { name: 'Next title', exact: true }).click();
  assert.notEqual(await hero.locator('h1').innerText(), before);
  assert.equal(await hero.getByRole('button', { name: 'Automatic rotation' }).getAttribute('aria-pressed'), 'false');
  await page.screenshot({ path: '.media-cache/cinema-hero-desktop.png' });
  await noOverflow(page);
  console.log('PASS full-width hero, carousel and manual pause');

  await watch(page);
  const frame = page.locator('.pro-player');
  await frame.focus();
  await page.keyboard.press('k');
  await page.waitForFunction(() => !document.querySelector('video.player').paused);
  await page.keyboard.press('k');
  await page.waitForFunction(() => document.querySelector('video.player').paused);
  await page.keyboard.press('5');
  await page.waitForFunction(() => Math.abs(document.querySelector('video.player').currentTime - 90) < 1);
  await page.keyboard.press('j');
  await page.waitForFunction(() => Math.abs(document.querySelector('video.player').currentTime - 80) < 1);
  await page.keyboard.press('l');
  await page.waitForFunction(() => Math.abs(document.querySelector('video.player').currentTime - 90) < 1);
  await page.keyboard.press('m');
  assert.equal(await page.locator('video.player').evaluate(video => video.muted), true);
  await frame.getByRole('button', { name: 'Settings', exact: true }).click();
  const quality = page.locator('[data-player-settings]').getByLabel('Quality', { exact: true });
  await quality.waitFor({ state: 'visible' });
  const values = await quality.locator('option').evaluateAll(options => options.map(option => option.value));
  const current = await quality.inputValue();
  const alternative = values.find(value => value !== current);
  assert.ok(alternative, 'Real catalog provides alternate quality for test');
  await quality.selectOption(alternative);
  await page.waitForFunction(() => document.querySelector('video.player').duration === 180 && Math.abs(document.querySelector('video.player').currentTime - 90) < 1);
  assert.equal(await page.locator('video.player').evaluate(video => video.muted), true, 'Quality keeps mute setting');
  await page.locator('video.player').evaluate(video => { video.currentTime = 177; });
  await quality.selectOption(current);
  await page.waitForFunction(() => Math.abs(document.querySelector('video.player').currentTime - 177) < 1);
  await page.locator('[data-player-settings]').getByRole('button', { name: 'Close', exact: true }).click();
  const source = await page.locator('video.player').getAttribute('src');
  await frame.getByRole('button', { name: 'Episodes', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Episode', { exact: true }).selectOption('2');
  assert.equal(await page.locator('video.player').getAttribute('src'), source, 'Selection is not applied until confirmed');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('video.player').getAttribute('src'), source);
  await frame.getByRole('button', { name: 'Next episode', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('video.player').duration === 180 && document.querySelector('video.player').currentTime < 1);
  assert.match(await frame.locator('.player-top-glass').innerText(), /Season 1 \/ Episode 2/);
  await frame.getByRole('button', { name: 'Full', exact: true }).click();
  await page.waitForFunction(() => Boolean(document.fullscreenElement));
  await frame.getByRole('button', { name: 'Exit fullscreen', exact: true }).click();
  await page.waitForFunction(() => !document.fullscreenElement);
  await page.screenshot({ path: '.media-cache/cinema-player-desktop.png' });
  console.log('PASS default source, shortcuts, quality resumes, cancellable episode picker');

  const bad = await context.request.post(`${origin}/api/discovery/feedback`, { headers: { Origin: 'https://example.invalid' }, data: { itemId: 'tt0903747', vote: 1 } });
  assert.equal(bad.status(), 403);
  await page.goto(`${origin}/tt0903747#suggestions`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByRole('tab', { name: 'Suggestions', exact: true }).click();
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await page.getByLabel('Your comment (optional)').fill('Local smoke test: enjoyable series');
  await page.getByRole('button', { name: 'Send feedback', exact: true }).click();
  await page.getByText('Thanks, your feedback is saved.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('is-route-pending')), false, 'Feedback must not trigger page navigation loading');
  console.log('PASS private feedback form and cross-origin rejection');
  await context.close();

  for (const width of [390, 320]) {
    const { page, context } = await setup(width, true);
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('[data-cinema-hero]:visible').waitFor();
    await noOverflow(page);
    await page.screenshot({ path: `.media-cache/cinema-hero-${width}.png` });
    await watch(page);
    await page.locator('.pro-player').scrollIntoViewIfNeeded();
    assert.equal(await page.getByRole('button', { name: 'Episodes', exact: true }).isVisible(), true);
    assert.equal(await page.getByRole('button', { name: 'Subtitles', exact: true }).isVisible(), true);
    const buttons = await page.locator('.player-actions button:visible').evaluateAll(buttons => buttons.map(b => ({ left: b.getBoundingClientRect().left, right: b.getBoundingClientRect().right })));
    assert.ok(buttons.every(b => b.left >= 0 && b.right <= width + 1), 'Player buttons fit narrow screen');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const rect = await dialog.boundingBox();
    assert.ok(rect.width >= width - 1 && rect.height >= 840 && rect.x === 0, 'Settings uses full mobile viewport');
    await noOverflow(page);
    await page.screenshot({ path: `.media-cache/cinema-settings-${width}.png` });
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Subtitles', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await noOverflow(page);
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `.media-cache/cinema-player-${width}.png` });
    console.log(`PASS ${width}px mobile hero, controls and fullscreen panels`);
    await context.close();
  }
  {
  const { page, context: rtl } = await setup(390, true, 'fa');
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-cinema-hero][dir="rtl"]:visible').waitFor();
  await noOverflow(page);
  await page.screenshot({ path: '.media-cache/cinema-hero-rtl.png' });
  await watch(page, 'tt0111161');
  await page.getByRole('button', { name: 'تنظیمات', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await noOverflow(page);
  await rtl.close();
  console.log('PASS Persian RTL landing and movie settings');
  }
  assert.deepEqual(errors, [], 'No browser runtime errors');
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: '.media-cache/cinema-smoke-failed.png' }).catch(() => {});
    console.error(await activePage.locator('.pro-player').innerText().catch(() => 'Player not mounted'));
  }
  throw error;
} finally { await browser.close(); }
