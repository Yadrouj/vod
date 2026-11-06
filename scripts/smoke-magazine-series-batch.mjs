import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const origin = process.env.LOAD_BASE_URL || 'http://127.0.0.1:3004';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const articles = JSON.parse(await readFile('public/data/magazine-dossiers.json', 'utf8')).articles.filter(article => article.seriesGuide?.batch === 1);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir('.media-cache/magazine-series-smoke', { recursive: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'vod_locale', value: 'fa', url: origin }]);
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    for (const article of articles) {
      const response = await page.goto(`${origin}/mag/${article.slug}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      assert.equal(response.status(), 200, article.slug);
      await page.locator('#series-episode-ratings:visible').waitFor({ timeout: 45000 });
      assert.ok(await page.locator('#series-cast:visible a[href^="/person/"]').count() >= 3, article.slug);
      const spoiler = page.locator('[data-spoiler]:visible').first();
      assert.equal(await spoiler.getAttribute('open'), null);
      assert.equal(await spoiler.locator('h2').isVisible(), false);
      await spoiler.locator('summary').click();
      assert.equal(await spoiler.locator('h2').isVisible(), true);
      const season = page.locator('#series-episode-ratings:visible details').first();
      await season.locator('summary').click();
      assert.ok(await season.locator('a[href*="season="]').count() > 0);
      await season.scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width} ${article.slug} overflow`);
      if (article.slug === 'review-adolescence') await page.screenshot({ path: `.media-cache/magazine-series-smoke/episode-ratings-${width}.png` });
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('10 long-form articles passed mobile/desktop layout, actor links, episode links, and spoiler interaction checks.');
} finally { await browser.close(); }
