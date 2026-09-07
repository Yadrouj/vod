import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const origin = process.env.LOAD_BASE_URL || 'http://localhost:3004';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'vod_locale', value: 'fa', url: origin }]);
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  for (const id of ['tt0903747', 'tt38607663', 'tt29355505']) {
    await page.goto(`${origin}/${id}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    assert.equal(await page.locator('.watch-together-inline').count(), 1, `${id}: room action restored`);
    assert.ok(await page.locator('aside a[href^="/watch/"]').count(), `${id}: play action restored`);
    if (id === 'tt0903747') {
      await page.locator('details.episode-row').first().waitFor({ timeout: 45000 });
      for (const width of [1440, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        const box = await page.locator('.series-download-browser').boundingBox();
        const content = await page.locator('.series-download-content').boundingBox();
        const tabs = await page.locator('.season-tabs').boundingBox();
        assert.ok(content.width >= box.width * .95, 'Downloads fill the section, no leftover sidebar');
        assert.ok(content.y >= tabs.y + tabs.height, 'Season selector is above content');
        assert.ok(content.y - (tabs.y + tabs.height) < 50, 'No empty grid rows between seasons and episodes');
        assert.equal(await page.locator('.episode-list').evaluate(el => getComputedStyle(el).maxHeight), 'none');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
    }
  }
  const room = await page.request.get(`${origin}/api/watch-party/title/tt38607663`);
  assert.equal(room.status(), 200, 'MKV-only title has a room source');
  const media = await room.json();
  assert.ok(media.sources.some(s => /\.mkv(?:$|\?)/.test(s.url)));
  const wav = Buffer.alloc(44 + 16000 * 30);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
  await page.route(media.source.url, route => route.fulfill({ contentType: 'audio/wav', body: wav }));
  await page.goto(`${origin}/watch/tt38607663?resume=${encodeURIComponent(media.source.url)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('video.player')?.readyState >= 2);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const play = await page.locator('.player-btn-primary').boundingBox();
    const settings = await page.locator('.player-actions-end').boundingBox();
    assert.ok(play.x < settings.x, 'Play stays on physical left');
    assert.equal(await page.locator('.player-timeline').evaluate(el => getComputedStyle(el).direction), 'ltr');
    assert.ok(await page.locator('h1').evaluate(el => parseFloat(getComputedStyle(el).fontSize) <= 26));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  }
  await page.locator('.player-btn-primary').click();
  await page.waitForFunction(() => document.querySelector('video.player')?.paused === false);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.player-center')).opacity === '0');
  await page.locator('video.player').evaluate(v => { v.pause(); v.dispatchEvent(new Event('error')); });
  await page.locator('.playback-help').waitFor();
  assert.equal(await page.locator('.playback-region-hint').count(), 0, 'Non-regional failure does not claim a VPN issue');
  await page.getByRole('button', { name: 'نمایش IP و کشور اتصال' }).click();
  await page.locator('.playback-help').getByText(/کشور اتصال:/).waitFor();
  await page.getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.playback-help'));
  // Verify the series picker still exposes episode identity and alternate versions.
  await page.goto(`${origin}/watch/tt0903747`, { waitUntil: 'domcontentloaded' });
  await page.locator('.player-choice-overlay').waitFor();
  const selects = page.locator('.player-choice-card select');
  assert.equal(await selects.count(), 3, 'Season, episode and quality selectors');
  await page.screenshot({ path: '.media-cache/player-quality-mobile.png' });
  assert.deepEqual(errors, []);
  console.log('PASS: download layout, restored actions, MKV room source, compact player, LTR controls, playback and recovery');
} finally { await browser.close(); }
