import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Explicit local-browser integration check; never posts, publishes or downloads media.
const base = process.env.LOAD_BASE_URL || 'http://127.0.0.1:3004';
const url = new URL(base);
if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('This smoke test is local-only');
const modulePath = process.env.PLAYWRIGHT_MODULE || path.resolve('.media-cache/browser-tools/node_modules/playwright/index.mjs');
const { chromium } = await import(pathToFileURL(modulePath).href);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const news = JSON.parse(await readFile(path.resolve(process.env.VOD_DATA_DIR || 'public/data', 'vod-news.json'), 'utf8'));
await mkdir('.media-cache/daily-editorial-smoke', { recursive: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, locale: 'fa-IR' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(`${base}/mag`, { waitUntil: 'networkidle', timeout: 60000 });
    assert.equal(response.status(), 200);
    // The RSC stream may briefly contain a hidden replacement boundary while
    // React hydrates. Check the settled document, not that transient snapshot.
    await page.waitForFunction(() => document.querySelectorAll('#iran-box-office').length === 1);
    const box = page.locator('#iran-box-office');
    await box.waitFor();
    assert.ok(await box.getByRole('heading', { name: 'سینمای ایران، به روایت گیشه' }).count());
    const boxPosition = await box.boundingBox();
    const articlePosition = await page.locator('a[href^="/mag/"][class*="featured"]').first().boundingBox();
    assert.ok(boxPosition && articlePosition && boxPosition.y < articlePosition.y, 'box office precedes article list');
    await box.scrollIntoViewIfNeeded();
    for (const poster of await box.locator('img').all()) {
      await poster.scrollIntoViewIfNeeded();
      await poster.evaluate(image => image.decode());
      assert.ok(await poster.evaluate(image => image.naturalWidth > 0), 'primary-source poster loads');
    }
    await box.locator('summary').click();
    const boxOfficeRows = await box.locator('tbody tr').count();
    assert.ok(boxOfficeRows >= 3);
    assert.ok(await page.locator('#daily-news a').count() >= 10);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'magazine does not overflow horizontally');
    await page.screenshot({ path: `.media-cache/daily-editorial-smoke/mag-${width}.png` });

    await page.goto(`${base}/music`, { waitUntil: 'networkidle', timeout: 60000 });
    const playlists = page.locator('section[aria-label="پلی‌لیست‌های موسیقی"]');
    await playlists.waitFor();
    assert.equal(await playlists.locator('a[href^="/music/collections/curated-"]').count(), 24);
    const firstPlaylist = playlists.locator('a[href^="/music/collections/curated-"]').first();
    const playlistHref = await firstPlaylist.getAttribute('href');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'music landing does not overflow horizontally');
    await playlists.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `.media-cache/daily-editorial-smoke/music-${width}.png` });
    await page.goto(`${base}${playlistHref}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('.artist-track-list > li').length === 40);
    assert.equal(await page.locator('.artist-track-list > li').count(), 40, 'curated playlist resolves to its real 40-track collection');

    await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.locator('.news-rail .news-card').first().waitFor();
    const headlines = await page.locator('.news-rail .news-card > strong').allTextContents();
    assert.equal(headlines.length, 10);
    assert.deepEqual(headlines, news.items.slice(0, 10).map(item => item.title));
    const hero = page.locator('[data-cinema-hero]');
    await hero.waitFor();
    const image = hero.locator('img').first();
    await image.waitFor();
    await image.evaluate(image => image.decode());
    if (width > 600) assert.ok(await image.evaluate(image => image.naturalWidth >= 1920 && image.naturalHeight >= 800), 'desktop uses a native high-resolution landscape');
    assert.deepEqual(errors, [], 'no browser runtime exceptions');
    console.log(JSON.stringify({ width, boxOfficeRows, headlines: headlines.length, playlistCards: 24, heroVerified: true, runtimeErrors: errors }));
    await page.close();
  }
} finally { await browser.close(); }
