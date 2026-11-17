import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

test('Glory publisher downloads are mobile-safe, separate audio from video, and keep the site countdown', {
  skip: !process.env.GLORYTOON_TEST_ORIGIN || !process.env.PLAYWRIGHT_MODULE, timeout: 120000,
}, async () => {
  const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const fileNavigations = [];
  await context.route('https://dl.glorycartoon.com/**', route => {
    fileNavigations.push(route.request().url());
    return route.fulfill({ contentType: 'text/html', body: '<p>File navigation intercepted for QA; no film downloaded.</p>' });
  });
  const page = await context.newPage();
  const origin = process.env.GLORYTOON_TEST_ORIGIN;
  try {
    await mkdir('.media-cache/glorytoon', { recursive: true });
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const response = page.url().startsWith(`${origin}/tt0120917`)
        ? await page.reload({ waitUntil: 'commit', timeout: 90000 })
        : await page.goto(`${origin}/tt0120917#downloads`, { waitUntil: 'commit', timeout: 90000 });
      assert.equal(response.status(), 200);
      const panel = page.locator('[data-publisher-downloads]:visible');
      await panel.waitFor({ state: 'visible' });
      assert.equal(await panel.locator('article').count(), 3);
      assert.equal(await panel.getByRole('link', { name: /دانلود صوت/ }).count(), 1);
      assert.equal(await panel.getByRole('link', { name: /دانلود از ناشر/ }).count(), 2);
      assert.ok(await panel.evaluate(element => element.getBoundingClientRect().right <= innerWidth && element.getBoundingClientRect().left >= 0));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No horizontal overflow at ${width}px`);
      await panel.screenshot({ path: `.media-cache/glorytoon/publisher-${width}.png` });
      const href = await panel.getByRole('link', { name: /دانلود صوت/ }).getAttribute('href');
      const gate = new URL(href, origin);
      assert.equal(gate.pathname, '/download/continue');
      assert.ok(gate.searchParams.get('url').endsWith('/The_Emporors_New_Groove_Sound.rar'));
      assert.equal(gate.searchParams.get('quality'), 'صوت دوبلهٔ جدا');
    }
    assert.equal(fileNavigations.length, 0, 'Merely opening a title must not fetch unverified publisher media');
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('[data-publisher-downloads]:visible').getByRole('link', { name: /دانلود صوت/ }).scrollIntoViewIfNeeded();
    const popupPromise = context.waitForEvent('page');
    const started = Date.now();
    await page.locator('[data-publisher-downloads]:visible').getByRole('link', { name: /دانلود صوت/ }).click();
    const popup = await popupPromise;
    await popup.waitForURL(url => url.hostname === 'dl.glorycartoon.com', { timeout: 30000 });
    assert.equal(fileNavigations.length, 1);
    assert.ok(Date.now() - started >= 4500, 'The five-second gate precedes the publisher file');
    assert.ok(fileNavigations[0].endsWith('/The_Emporors_New_Groove_Sound.rar'));
  } finally { await browser.close(); }
});
