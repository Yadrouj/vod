import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const origin = process.env.LOAD_BASE_URL || 'http://localhost:3004';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Local browser testing only');
const { chromium } = process.env.PLAYWRIGHT_MODULE ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href) : await import('playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
await mkdir('.media-cache/magazine-smoke', { recursive: true });
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 600, hasTouch: width < 600, reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'vod_locale', value: 'fa', url: origin }]);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/mag', '/mag/imdb-trends-watch-guide', '/mag/topics/music', '/mag/topics/releases', '/music/collections']) {
      const response = await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      assert.equal(response.status(), 200, route);
      await page.waitForTimeout(400);
      const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(sizes.scroll <= sizes.width + 1, `${route}: ${width}px overflow (${sizes.scroll})`);
      if (route.startsWith('/mag')) assert.equal(await page.locator('h1').count(), 1, 'Exactly one page title');
      if (route === '/mag/imdb-trends-watch-guide') {
        assert.ok(await page.locator('article section').count() >= 8);
        const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
        assert.ok(schema.some(s => s.includes('BlogPosting')));
        assert.ok(await page.locator('article p a[href="/browse?section=top-imdb"]').count() > 0, 'Contextual archive link');
        assert.ok(await page.locator('article a[href="https://t.me/Sarvnema_bot"]').count() > 0, 'Real bot link');
        const cover = page.locator('figure img').first();
        assert.equal(await cover.getAttribute('src'), '/media/magazine/articles/imdb-trends-watch-guide.webp', 'Unique branded article cover');
        await cover.evaluate(image => image.decode());
        await page.screenshot({ path: `.media-cache/magazine-smoke/article-${width}.png` });
      }
      if (route === '/music/collections') {
        await page.getByRole('button', { name: 'تگ‌های آرشیو جدید', exact: true }).click();
        assert.ok(await page.locator('a[href*="/music/collections/library-tag-"]').count() >= 18);
      }
    }
    await context.close();
  }
  for (const route of ['/mag/feed.xml', '/llms.txt']) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.ok(body.includes('/mag/imdb-trends-watch-guide'), route);
    assert.ok(!body.includes('/mag/new-music-tags-playlists'), 'Unpublished article must not enter discovery feeds');
  }
  const robots = await (await fetch(origin + '/robots.txt')).text();
  const indexXml = await (await fetch(origin + '/sitemap.xml')).text();
  assert.ok(indexXml.includes('<sitemapindex') && indexXml.includes('/mag/sitemap.xml'));
  const magazineXml = await (await fetch(origin + '/mag/sitemap.xml')).text();
  assert.ok(magazineXml.includes('/mag/imdb-trends-watch-guide') && magazineXml.includes('/media/magazine/articles/imdb-trends-watch-guide.webp'));
  const parts = [...robots.matchAll(/^Sitemap:\s*(\S+)/gm)].map(match => new URL(match[1]).pathname);
  let sitemap = '';
  for (const part of parts) { const response = await fetch(origin + part); assert.equal(response.status, 200); sitemap += await response.text(); }
  assert.ok(sitemap.includes('/mag/imdb-trends-watch-guide'), 'Published article is in one of the advertised sitemap parts');
  assert.ok(!sitemap.includes('/mag/new-music-tags-playlists'), 'Unpublished article is absent from all sitemap parts');
  const missing = await fetch(origin + '/mag/new-music-tags-playlists');
  const missingBody = await missing.text();
  // Next can return 200 for a streamed notFound response, but it must be noindex
  // and must not include a draft's article body or BlogPosting schema.
  assert.ok(missing.status === 404 || /<meta[^>]+name="robots"[^>]+content="noindex/.test(missingBody));
  assert.ok(!missingBody.includes('BlogPosting'));
  assert.deepEqual(errors, []);
  console.log('Magazine, published-only feeds, metadata and 18 tag playlists passed at 320/390/768/1440px.');
} finally { await browser.close(); }
