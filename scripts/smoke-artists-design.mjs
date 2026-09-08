import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const origin = process.env.LOAD_BASE_URL || 'http://127.0.0.1:3004';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 await page.context().addCookies([{name:'vod_locale',value:'fa',url:origin}]);
 await page.goto(`${origin}/music/artists`, {waitUntil:'domcontentloaded'});
 await page.getByRole('heading', {name:'دنیای هنرمندان'}).waitFor();
 assert.ok(await page.locator('.music-artist-card').count() > 0);
 assert.equal(await page.locator('a[rel="next"]').innerText(), 'بعدی');
 for (const width of [1440, 390, 320]) {
  await page.setViewportSize({width, height:1000});
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `directory overflow ${width}`);
  await page.screenshot({path:`.media-cache/artists-${width}.png`});
 }
 await page.getByRole('textbox', {name:'جستجوی هنرمند'}).fill('مهستی');
 await page.getByRole('search').getByRole('button', {name:'جستجو',exact:true}).click();
 await page.waitForURL('**/music/artists?q=*');
 await page.locator('.music-artist-card').first().click();
 await page.locator('#artist-tracks').waitFor();
 for (const width of [1440,390,320]) {
  await page.setViewportSize({width,height:1000});
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `profile overflow ${width}`);
  await page.screenshot({path:`.media-cache/artist-profile-${width}.png`});
 }
 await page.getByRole('textbox', {name:'جستجو در آهنگ‌های این صفحه'}).fill('zzzz-no-track-123');
 await page.locator('#artist-tracks [role="status"]').waitFor();
 await page.getByRole('textbox', {name:'جستجو در آهنگ‌های این صفحه'}).fill('');
 assert.ok(await page.locator('.artist-track-list button').count() > 0);
 await page.goto(`${origin}/music/artists?q=zzzz-no-artist-123`, {waitUntil:'domcontentloaded'});
 await page.getByRole('heading', {name:'هنرمندی پیدا نشد'}).waitFor();
 assert.deepEqual(errors, []);
 console.log('PASS artist directory search, pagination labels, artist navigation, responsive layouts and track filtering');
} finally { await browser.close(); }
