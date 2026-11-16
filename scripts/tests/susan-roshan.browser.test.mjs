import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

test('Susan Roshan collection renders on mobile/desktop, attributes publisher and plays real audio', { skip: !process.env.MUSIC_TEST_ORIGIN || !process.env.PLAYWRIGHT_MODULE, timeout: 180000 }, async () => {
  const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await mkdir('.media-cache/tiarin-tests', { recursive: true });
    const response = await page.goto(`${process.env.MUSIC_TEST_ORIGIN}/music/collections/susan-roshan-collection`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    assert.equal(response.status(), 200);
    await page.getByRole('heading', { level: 1, name: 'سوزان روشن؛ آلبوم‌ها و تک‌آهنگ‌ها' }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll('.artist-track-list li').length === 26);
    assert.equal(await page.getByRole('link', { name: 'لینک ناشر: تیارین ↗' }).getAttribute('href'), 'https://tiarin.ir/artist/susan-roshan/');
    const filter = page.getByRole('textbox', { name: 'جستجو در آهنگ‌های این صفحه' });
    // Confirm hydration through an actual interaction before capturing streamed HTML.
    await filter.fill('تنگ غروب');
    await page.waitForFunction(() => document.querySelectorAll('.artist-track-list li').length === 1);
    await filter.fill('');
    await page.waitForFunction(() => document.querySelectorAll('.artist-track-list li').length === 26);
    await page.locator('.artist-track-list img').first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.artist-track-list img')?.naturalWidth > 0);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: '.media-cache/tiarin-tests/collection-390.png', caret: 'initial' });
    await page.getByRole('button', { name: 'پخش همه', exact: true }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('audio')].some(audio => !audio.paused && audio.currentTime > 0.4 && audio.duration > 300), undefined, { timeout: 45000 });
    const playing = await page.locator('audio').evaluateAll(elements => elements.map(audio => ({ playing: !audio.paused, time: audio.currentTime, duration: audio.duration, error: audio.error?.code ?? null })));
    assert.ok(playing.some(audio => audio.playing && !audio.error));
    console.log(JSON.stringify({ playback: playing }));
    await page.locator('audio').evaluateAll(elements => elements.forEach(audio => audio.pause()));
    await filter.fill('هول شدم');
    await page.waitForFunction(() => document.querySelectorAll('.artist-track-list li').length === 1);
    await filter.fill('');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: '.media-cache/tiarin-tests/collection-1440.png', caret: 'initial' });
    await page.getByRole('link', { name: 'همهٔ آثار این خواننده', exact: true }).click();
    await page.getByRole('heading', { level: 1, name: 'سوزان روشن', exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll('.artist-track-list li').length >= 26);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
