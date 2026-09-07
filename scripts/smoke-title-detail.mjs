import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const origin = process.env.LOAD_BASE_URL || 'http://localhost:3004';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
await mkdir('.media-cache', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'vod_locale', value: 'fa', url: origin }]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const id of ['tt38607663', 'tt0903747', 'tt29355505']) {
    await page.goto(`${origin}/${id}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => Object.keys(document.querySelector('[role="tab"]')).some(key => key.startsWith('__reactProps')));
    const mainPlay = page.locator('aside a[href^="/watch/"]');
    await mainPlay.waitFor();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => scrollTo(0, 0));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${id}/${width}: no horizontal overflow`);
      const play = await mainPlay.boundingBox();
      assert.ok(play.y + play.height < 844, `${id}/${width}: play visible in first viewport`);
      const poster = await page.locator('aside').first().boundingBox();
      const heading = await page.locator('h1').boundingBox();
      assert.ok(poster.x < heading.x, `${id}/${width}: poster/play on physical left`);
      const best = page.locator('a.animated-download').filter({ hasText: 'بهترین فایل' });
      if (await best.count()) {
        const icon = await best.locator('.animated-download-icon').boundingBox();
        const label = await best.locator('.animated-download-label').boundingBox();
        assert.ok(icon.x < label.x, 'Best-file icon physically left');
      }
      if (width === 390 || width === 1440) await page.screenshot({ path: `.media-cache/detail-${id}-${width}.png` });
    }
    await page.getByRole('tab', { name: 'درباره', exact: true }).click();
    await page.locator('a[href="#downloads"]').first().click();
    assert.equal(await page.locator('#title-tab-episodes').getAttribute('aria-selected'), 'true');
    await page.locator('#title-tab-episodes').focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('#title-tab-about').getAttribute('aria-selected'), 'true', 'RTL keyboard tab order');
    await page.getByRole('tab', { name: /پخش و دانلود|فصل‌ها و دانلود/ }).click();
    if (id === 'tt0903747') {
      await page.locator('details.episode-row').first().waitFor({ timeout: 45000 });
      assert.equal(await page.locator('.episode-quality-list').count(), 0, 'Closed episodes do not mount download widgets');
      await page.locator('details.episode-row summary').first().click();
      await page.locator('.episode-quality-list .animated-download').first().waitFor();
      assert.match(await page.locator('details.episode-row summary').first().innerText(), /فصل.*قسمت/);
      await page.locator('details.episode-row').first().screenshot({ path: '.media-cache/detail-episode.png' });
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'دانلود لیست TXT' }).click();
      assert.match((await download).suggestedFilename(), /S01.*links\.txt$/);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await context.addCookies([{ name: 'vod_locale', value: 'en', url: origin }]);
  await page.goto(`${origin}/tt38607663`);
  assert.equal(await page.locator('h1').textContent(), 'Na Willa');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('PASS: film/series desktop/mobile layouts, best-file placement, tabs, episode expansion and TXT download');

  // Exercise the real trailer component in an isolated browser fixture without changing catalog data.
  const bundle = await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {DeferredBackgroundVideo} from './components/deferred-background-video'; createRoot(document.getElementById('root')).render(React.createElement(DeferredBackgroundVideo,{src:'${origin}/fixture-trailer.wav'}));`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'browser', jsx: 'automatic' });
  const wav = Buffer.alloc(44 + 16000 * 20); wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
  let requests = 0;
  await page.route('**/fixture-trailer.wav', async route => { requests++; await route.fulfill({ contentType: 'audio/wav', body: wav }); });
  await page.route('**/__trailer-fixture', route => route.fulfill({ contentType: 'text/html', body: '<section style="height:700px"><div id="root"></div></section><div style="height:1500px"></div>' }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${origin}/__trailer-fixture`);
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.waitForTimeout(2100);
  assert.equal(requests, 0, 'Reduced motion does not auto-load media');
  await page.getByRole('button', { name: 'پخش تریلر', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('video')?.paused === false);
  await page.getByRole('button', { name: 'توقف تریلر', exact: true }).click();
  assert.equal(await page.locator('video').evaluate(v => v.paused), true);
  await page.getByRole('button', { name: 'پخش تریلر', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('video')?.paused === false);
  await page.evaluate(() => scrollTo(0, 1000));
  await page.waitForFunction(() => document.querySelector('video')?.paused === true);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForFunction(() => document.querySelector('video')?.paused === false);
  console.log('PASS: trailer opt-in, play/pause, offscreen pause and visible resume');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`${origin}/__trailer-fixture`);
  const initialRequests = requests;
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  assert.equal(await page.locator('video').count(), 0, 'Video is deferred, not loaded at first paint');
  await page.waitForFunction(() => document.querySelector('video')?.paused === false);
  assert.ok(requests > initialRequests, 'Normal mode starts a muted background preview');
  assert.equal(await page.locator('video').evaluate(v => v.muted), true);
  await page.getByRole('button', { name: 'فعال کردن صدای تریلر' }).click();
  assert.equal(await page.locator('video').evaluate(v => v.muted), false);
  await page.locator('video').evaluate(v => v.dispatchEvent(new Event('error')));
  await page.getByRole('status').filter({ hasText: 'تریلر در دسترس نیست' }).waitFor();
  assert.equal(await page.locator('video').count(), 0, 'Failed video is removed so the poster remains visible');
  console.log('PASS: deferred autoplay, mute control and error fallback');
} finally { await browser.close(); }
