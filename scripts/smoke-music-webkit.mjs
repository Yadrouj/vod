import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const imported = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const { webkit, chromium } = imported.default ?? imported;
const origin = process.env.LOAD_BASE_URL || 'http://127.0.0.1:3004';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const wav = Buffer.alloc(44 + 16000 * 60);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
const results = [];
for (const engine of ['chromium', 'webkit']) {
  const browser = await (engine === 'webkit' ? webkit : chromium).launch({ headless: true,
    ...(engine === 'chromium' ? { channel: 'chrome' } : process.env.WEBKIT_EXECUTABLE ? { executablePath: process.env.WEBKIT_EXECUTABLE } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block',
      ...(engine === 'webkit' ? { isMobile: true, hasTouch: true } : {}) });
    let fail = true, requests = 0;
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname !== '/api/music/media') return route.continue();
      requests++;
      if (fail) return route.fulfill({ status: 503, contentType: 'application/json', headers: { 'Cache-Control': 'no-store' }, body: JSON.stringify({ code: 'MUSIC_LIBRARY_UNAVAILABLE' }) });
      const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range || '');
      const start = range ? Number(range[1]) : 0, end = Math.min(range?.[2] ? Number(range[2]) : wav.length - 1, wav.length - 1);
      return route.fulfill({ status: range ? 206 : 200, contentType: 'audio/wav', headers: { 'Accept-Ranges': 'bytes',
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}) }, body: wav.subarray(start, end + 1) });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/music/melodify-5809`, { waitUntil: 'domcontentloaded' });
    const retry = page.locator('.music-player-source-issue').getByRole('button', { name: 'تازه‌سازی پخش', exact: true });
    try { await retry.waitFor({ timeout: 15000 }); } catch (error) {
      console.log(JSON.stringify({ engine, requests, pageErrors: errors, diagnostic: await page.evaluate(() => ({
        body: document.body.innerText.slice(0, 1800), host: document.querySelector('#persistent-music-player')?.getAttribute('hidden'),
        media: [...document.querySelectorAll('audio')].map(el => ({ src: el.getAttribute('src'), error: el.error?.code, ready: el.readyState })),
      })) })); throw error;
    }
    assert.match(await page.locator('.music-player-source-issue').innerText(), /آرشیو/);
    assert.doesNotMatch(await page.locator('.music-player-source-issue').innerText(), /cannot be played in this browser/);
    await page.waitForTimeout(1200); assert.ok(requests <= 2, 'No endless retry loop');
    if (engine === 'webkit' && requests === 0) {
      // Windows WebKit's native media loader bypasses Playwright routing.
      // Here the real server returns the expected missing-library 503. Test
      // recovery/remount honestly; do not claim a mocked file played on iOS.
      await page.locator('#persistent-music-player audio').evaluate(el => el.dataset.beforeRetry = 'true');
      await retry.click();
      await page.waitForFunction(() => document.querySelector('#persistent-music-player audio')?.getAttribute('data-before-retry') !== 'true');
      await retry.waitFor({ timeout: 15000 });
      assert.deepEqual(errors, []);
      results.push({ engine, missingLibraryNotBlamedOnBrowser: true, retryRemounted: true, successfulPlayback: 'not-tested: native loader bypasses interception and the real archive file is unavailable' });
      await context.close(); continue;
    }
    fail = false; await retry.click();
    try { await page.waitForFunction(() => document.querySelector('#persistent-music-player audio')?.readyState >= 2, null, { timeout: 15000 }); } catch (error) {
      console.log(JSON.stringify({ engine, requests, pageErrors: errors, retryState: await page.evaluate(() => ({ text: document.querySelector('#persistent-music-player')?.textContent?.slice(0, 1500),
        media: [...document.querySelectorAll('audio')].map(el => ({ src: el.getAttribute('src'), error: el.error?.code, ready: el.readyState, duration: el.duration })) })) })); throw error;
    }
    const audio = page.locator('#persistent-music-player audio');
    if (await audio.evaluate(el => el.paused)) await page.locator('#persistent-music-player .music-play-toggle').click();
    await page.waitForFunction(() => document.querySelector('#persistent-music-player audio')?.paused === false);
    await audio.evaluate(el => { el.dataset.persistentTest = 'true'; });
    await page.locator('#persistent-music-player .music-player-now a').first().click();
    await page.waitForURL('**/music/artists/**');
    assert.equal(await audio.getAttribute('data-persistent-test'), 'true', 'Navigation keeps the same audio element');
    assert.equal(await audio.evaluate(el => el.paused), false);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []);
    results.push({ engine, mobileWidth: 390, missingLibraryNotBlamedOnBrowser: true, boundedAttempts: true, retry: true, persistentAudio: true });
    await context.close();
  } finally { await browser.close(); }
}
console.log(JSON.stringify(results, null, 2));
