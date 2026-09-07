import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const origin = process.env.LOAD_BASE_URL || 'http://localhost:3004';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.context().addCookies([{ name: 'vod_locale', value: 'fa', url: origin }]);
  await page.goto(`${origin}/browse?section=old-iranian-films`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const cards = page.locator('a[data-archive-card]');
  await cards.first().waitFor();
  assert.equal(await cards.count(), 40);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `No overflow at ${width}`);
  }
  await page.locator('summary').first().click();
  assert.ok(await page.locator('select[name="genre"]').isVisible());
  await page.locator('summary').first().click();
  for (let count = 40; count < 200; count += 40) {
    await cards.last().scrollIntoViewIfNeeded();
    await page.waitForFunction(expected => document.querySelectorAll('a[data-archive-card]').length >= expected, count + 40, { timeout: 45000 });
  }
  assert.equal(await cards.count(), 200);
  assert.equal(new Set(await cards.evaluateAll(nodes => nodes.map(node => node.href))).size, 200);
  const firstPageTitle = await cards.first().getAttribute('href');
  await page.locator('.pagination a').last().click();
  await page.waitForURL(/page=2/);
  await page.waitForFunction(previous => document.querySelector('a[data-archive-card]')?.getAttribute('href') !== previous, firstPageTitle);
  assert.ok(await cards.count() >= 40 && await cards.count() <= 200);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: '.media-cache/archive-mobile.png', fullPage: false });
  const invalid = await page.request.get(`${origin}/api/archive?offset=200`);
  assert.equal(invalid.status(), 400);
  const batch = await page.request.get(`${origin}/api/archive?section=old-iranian-films&page=2&offset=40`);
  assert.equal((await batch.json()).items.length, 40);
  await page.goto(`${origin}/browse?q=breaking`, { waitUntil: 'domcontentloaded' });
  await cards.first().waitFor();
  assert.ok(await page.locator('h2').count());
  assert.deepEqual(errors, []);
  console.log('PASS archive: mobile, filters, 200-card cap, pagination, API and search groups');
} finally { await browser.close(); }
