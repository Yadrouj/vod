import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

test('TV collections expose real totals, local view-all routes and keyboard-friendly pagination', {
  skip: !process.env.TV_TEST_ORIGIN || !process.env.PLAYWRIGHT_MODULE, timeout: 180000,
}, async () => {
  const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
  const browser = await chromium.launch({ channel: process.env.TV_TEST_BROWSER || 'msedge', headless: true });
  const origin = process.env.TV_TEST_ORIGIN;
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
  const errors = [];
  try {
    // Do not download external media merely to validate remote navigation.
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(30000);
    await mkdir('.media-cache/android-tv/qa', { recursive: true });
    await page.goto(origin + '/tv', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.locator('[data-tv-focus="hero-play"]:focus').waitFor();
    const ids = ['latest-series','latest-films','new-dubbed','turkish-films','indian-films','iranian-films','animation'];
    for (const id of ids) {
      const rail = page.locator(`[data-tv-collection="${id}"]:visible`);
      assert.equal(await rail.count(), 1, id);
      assert.ok(await rail.locator('.tv-card').count() > 0);
      assert.equal(await rail.locator(`[data-tv-focus="all-${id}"]`).getAttribute('href'), `/tv/collection/${id}`);
      assert.ok(Number((await rail.locator('.tv-rail-heading small').innerText()).replace(/[۰-۹]/g, d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[^0-9]/g,'')) > 0);
    }
    await page.screenshot({ path: '.media-cache/android-tv/qa/collections-home-720.png' });
    await page.locator('[data-tv-focus="collection-nav-latest-series"]').click();
    await page.waitForURL('**/tv/collection/latest-series');
    await page.locator('[data-tv-initial]:focus').waitFor();
    const first = await page.locator('.tv-grid .tv-card').first().getAttribute('href');
    assert.equal(await page.locator('.tv-grid .tv-card').count(), 24);
    const next = page.getByRole('link', { name: 'صفحهٔ بعد', exact: true });
    await next.click(); await page.waitForURL('**?page=2');
    await page.locator('[data-tv-initial]:focus').waitFor();
    assert.notEqual(await page.locator('.tv-grid .tv-card').first().getAttribute('href'), first);
    await page.keyboard.press('ArrowLeft');
    assert.ok(await page.evaluate(()=>document.activeElement.matches('.tv-card')));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: '.media-cache/android-tv/qa/collection-page-2-720.png' });
    for (const [id,title] of [['turkish-films','فیلم‌های ترکی'],['indian-films','سینمای هند'],['iranian-films','فیلم‌های ایرانی'],['new-dubbed','دوبله‌های تازهٔ آرشیو']]) {
      const response=await page.goto(origin+'/tv/collection/'+id,{waitUntil:'domcontentloaded'});
      assert.equal(response.status(),200);
      await page.locator('h1:visible').waitFor();
      assert.equal(await page.locator('h1:visible').innerText(),title);
      assert.ok(await page.locator('.tv-grid .tv-card').count() > 0);
    }
    await page.setViewportSize({width:1920,height:1080});
    await page.goto(origin+'/tv',{waitUntil:'domcontentloaded'});
    await page.locator('.tv-main [data-tv-focus]:focus').waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path:'.media-cache/android-tv/qa/collections-home-1080.png'});
    const missing=await page.goto(origin+'/tv/collection/not-a-collection');
    // Next 16 returns 200 after a streaming layout has committed its headers.
    assert.ok([200,404].includes(missing.status()));
    if (missing.status() === 200) assert.match(await missing.text(), /NEXT_HTTP_ERROR_FALLBACK;404/);
    assert.equal(await page.locator('[data-tv-collection-grid]').count(),0);
    assert.deepEqual(errors,[]);
  } finally { await browser.close(); }
});
