import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const origin = process.env.LOAD_BASE_URL || 'http://127.0.0.1:3004';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname), 'Local smoke tests only');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const articles = JSON.parse(await readFile('public/data/magazine-dossiers.json', 'utf8')).articles;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir('.media-cache/magazine-dossiers-smoke', { recursive: true });
try {
  const errors = [];
  let nativeMarkup = '';
  let nativeStyles = [];
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 600, hasTouch: width < 600, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.addCookies([{ name: 'vod_locale', value: 'fa', url: origin }]);
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.setDefaultTimeout(30000);
    for (const route of ['/mag', '/mag/topics/reviews', '/mag/topics/legends', '/mag/review-pluribus', '/mag/life-christopher-nolan']) {
      const response = await page.goto(origin + route, { waitUntil: 'domcontentloaded', timeout: 120000 });
      assert.equal(response.status(), 200, route);
      await page.waitForFunction(() => document.querySelectorAll('h1').length === 1 && document.querySelector('h1')?.getClientRects().length, undefined, { timeout: 30000 });
      assert.equal(await page.locator('h1').count(), 1, route);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}: ${route} overflow`);
      if (route === '/mag') assert.equal(await page.locator('section[aria-label="پرونده‌های ویژهٔ مجله"] a').count(), 2);
      if (/topics\//.test(route)) assert.equal(await page.locator('main a[href^="/mag/review-"], main a[href^="/mag/life-"]').count(), 30);
      if (route === '/mag/review-pluribus') {
        const disclosure = page.locator('[data-spoiler]');
        const title = disclosure.locator('h2');
        assert.equal(await disclosure.getAttribute('open'), null);
        assert.equal(await title.isVisible(), false);
        assert.ok(!(await disclosure.locator('summary').innerText()).includes('ذهنِ جمعی'));
        await disclosure.locator('summary').click();
        assert.equal(await title.isVisible(), true);
        await disclosure.locator('summary').focus();
        await page.keyboard.press('Enter');
        assert.equal(await title.isVisible(), false);
        if (width === 390) {
          nativeMarkup = await disclosure.evaluate(element => element.outerHTML);
          nativeStyles = await page.locator('link[rel="stylesheet"]').evaluateAll(elements => elements.map(e => e.href));
        }
        assert.ok(await page.locator('#critics a[href^="https://www.rogerebert.com/"]').count());
        const season = page.locator('#article-versions details').first();
        assert.ok(await season.count());
        await season.locator('summary').click();
        assert.ok(await season.locator('a[href*="season="][href*="episode="]').count());
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await disclosure.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `.media-cache/magazine-dossiers-smoke/spoiler-${width}.png` });
      }
      if (route === '/mag/life-christopher-nolan') {
        assert.ok(await page.locator('#filmography a[href^="/tt"]').count() >= 10);
        assert.ok(await page.locator('a[href="/person/nm0634240"]').count());
        const cover = page.locator('figure img').first();
        await cover.evaluate(image => image.decode());
        await page.screenshot({ path: `.media-cache/magazine-dossiers-smoke/biography-${width}.png` });
      }
    }
    await context.close();
  }
  // Isolate the actual rendered disclosure: the existing app-wide streaming
  // shell itself requires JS, independently of this native HTML control.
  const plain = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
  const page = await plain.newPage();
  assert.ok(nativeMarkup);
  await page.setContent(`<!doctype html><html lang="fa" dir="rtl"><head>${nativeStyles.map(href => `<link rel="stylesheet" href="${href}">`).join('')}</head><body><main>${nativeMarkup}</main></body></html>`, { waitUntil: 'load', timeout: 120000 });
  const spoiler = page.locator('[data-spoiler]');
  assert.equal(await spoiler.locator('h2').isVisible(), false);
  await spoiler.locator('summary').click();
  assert.equal(await spoiler.locator('h2').isVisible(), true);
  await plain.close();
  const xml = await (await fetch(origin + '/mag/sitemap.xml')).text();
  assert.ok(xml.includes('/mag/topics/reviews') && xml.includes('/mag/topics/legends'));
  for (const article of articles) assert.ok(xml.includes(`/mag/${article.slug}`), article.slug);
  // Full route coverage catches a broken reference or missing fields outside the visual samples.
  let next = 0;
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (next < articles.length) {
      const article = articles[next++];
      const response = await fetch(`${origin}/mag/${article.slug}`, { signal: AbortSignal.timeout(120000) });
      assert.equal(response.status, 200, article.slug);
      const html = await response.text();
      assert.ok(html.includes('BlogPosting') && html.includes(`/mag/${article.slug}`), article.slug);
      assert.ok(!html.includes('NEXT_HTTP_ERROR_FALLBACK;404'), article.slug);
    }
  }));
  assert.deepEqual(errors, []);
  console.log('60 article routes, both hubs, 320/390/768/1440px layout, spoiler touch/keyboard and isolated native no-JS control, episode links, filmography, real portrait and sitemap passed.');
} finally { await browser.close(); }
