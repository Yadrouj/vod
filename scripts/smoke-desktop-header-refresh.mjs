import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const origin = process.env.LOAD_BASE_URL || 'http://127.0.0.1:3004';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname), 'Run locally only');
await mkdir('.media-cache/header-refresh', { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
const errors = [];
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  // Catalog requests and local poster proxies remain real; external telemetry/media
  // is unnecessary for testing navigation and must not slow down the smoke test.
  await context.route('**/*', route => new URL(route.request().url()).origin === origin || /^(data|blob):/.test(route.request().url()) ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(120_000);
  page.on('pageerror', error => { errors.push({ url: page.url(), message: error.message }); console.error('BROWSER ERROR', page.url(), error.message); });
  const ready = () => page.waitForFunction(() => [...document.querySelectorAll('header.gradient-menu button')].some(el => el.getBoundingClientRect().width > 0 && el.querySelector('svg.lucide-search') && Object.keys(el).some(key => key.startsWith('__reactProps') && typeof el[key].onClick === 'function')));
  const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal page overflow');
  const search = page.locator('header.gradient-menu:visible button:has(svg.lucide-search)');
  const dialog = page.locator('dialog[data-responsive-dialog][open]');

  for (const locale of ['fa', 'en']) {
    await context.addCookies([{ name: 'vod_locale', value: locale, url: origin }]);
    assert.equal((await page.goto(origin, { waitUntil: 'domcontentloaded' })).status(), 200);
    await ready();
    for (const width of [761, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 960 });
      await ready(); await noOverflow();
      const geometryHandle = await page.waitForFunction(() => {
        const header = [...document.querySelectorAll('header.gradient-menu')].find(el => el.isConnected && el.getBoundingClientRect().width > 0);
        if (!header) return false;
        const box = header.getBoundingClientRect();
        // Copy primitive values immediately: the computed-style declaration is
        // live while Next resumes/replaces streamed server component trees.
        const background = getComputedStyle(header).backgroundColor;
        const shadow = getComputedStyle(header).boxShadow;
        const gradient = getComputedStyle(header, '::after').backgroundImage;
        if (!background || !shadow || !gradient) return false;
        const controls = [...header.children].filter(el => el.matches('a,button,nav,.language-toggle')).map(el => {
          const r = el.getBoundingClientRect();
          return { tag: el.tagName, label: el.getAttribute('aria-label') || el.textContent.trim(), x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        }).filter(r => r.width && r.height);
        return { left: box.left, right: box.right, pageRight: header.parentElement.getBoundingClientRect().right, top: box.top, bottom: box.bottom, background, shadow, gradient, controls };
      });
      const geometry = await geometryHandle.jsonValue();
      await geometryHandle.dispose();
      assert.ok(Math.abs(geometry.left) <= 1 && Math.abs(geometry.right - geometry.pageRight) <= 1, 'Header is full bleed (excluding the browser scrollbar)');
      assert.equal(geometry.background, 'rgba(0, 0, 0, 0)', 'Banner remains visible behind the header');
      assert.equal(geometry.shadow, 'none');
      assert.ok(geometry.gradient.includes('rgba(5, 6, 8, 0)'), 'Gradient fades to transparent');
      for (const r of geometry.controls) assert.ok(r.x >= -1 && r.right <= width + 1 && r.y >= geometry.top - 1 && r.bottom <= geometry.bottom + 1, `${width}/${locale}: ${r.label} stays inside header`);
      for (let i = 0; i < geometry.controls.length; i++) for (let j = i + 1; j < geometry.controls.length; j++) {
        const a = geometry.controls[i], b = geometry.controls[j];
        assert.ok(Math.min(a.right, b.right) - Math.max(a.x, b.x) <= 1 || Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) <= 1, `${width}/${locale}: ${a.label} overlaps ${b.label}`);
      }
      assert.equal(await page.locator('header.gradient-menu:visible .gradient-nav a').count(), 7);
      if ([1280, 1440].includes(width)) {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `.media-cache/header-refresh/${locale}-${width}.png` });
      }
      console.log(`PASS header ${locale}/${width}: bounds, contrast, no overlapping controls`);
    }
    await search.click(); await dialog.waitFor();
    const input = dialog.locator('input[role="combobox"]');
    await input.fill('house');
    await dialog.locator('.suggest-item[href="/tt0412142"]').waitFor();
    assert.equal(await dialog.locator('.suggest-item').first().getAttribute('href'), '/tt0412142', 'House ranks above films across all types');
    await page.keyboard.press('Escape');
    if (await dialog.count()) await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.ok(await search.evaluate(el => el === document.activeElement), 'Search restores focus');
    const category = page.locator('header.gradient-menu:visible .mega-button');
    await category.click();
    await page.locator('dialog#category-explorer[open]').waitFor();
    await page.keyboard.press('Escape');
    for (const label of locale === 'fa' ? ['دانلودها', 'آخرین نمایش‌ها'] : ['Downloads', 'Recently watched']) {
      await page.locator('header.gradient-menu:visible').getByRole('button', { name: label, exact: true }).click();
      await page.locator('dialog[open] #activity-title').waitFor();
      await page.keyboard.press('Escape');
    }
    console.log(`PASS ${locale}: search/ranking/focus, category, downloads/history dialogs`);
  }

  await context.addCookies([{ name: 'vod_locale', value: 'fa', url: origin }]);
  for (const width of [320, 390, 760]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(origin, { waitUntil: 'domcontentloaded' }); await ready();
    await noOverflow(); await search.click(); await dialog.waitFor();
    const bounds = await dialog.boundingBox();
    assert.ok(Math.abs(bounds.width - width) <= 1 && Math.abs(bounds.height - 844) <= 1, 'Mobile search stays full-screen');
    await noOverflow();
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
    console.log(`PASS mobile ${width}: no overflow, existing full-screen search preserved`);
  }

  const music = JSON.parse(await readFile('lib/data/media-refresh-2026-11-14-music.json', 'utf8'));
  const video = JSON.parse(await readFile('lib/data/media-refresh-2026-11-14-vod.json', 'utf8'));
  const track = music.tracks.find(item => music.newTrackIds.includes(item.id) && item.title.length > 14);
  const title = video.items.find(item => video.newTitleIds.includes(item.imdbCode || item.id));
  for (const pathname of [`/${title.imdbCode || title.id}`, `/music/${track.id}`, `/music/artists/${track.artists[0].slug}`]) {
    const response = await page.goto(`${origin}${pathname}`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200, pathname);
    assert.ok(!(await response.text()).includes('NEXT_HTTP_ERROR_FALLBACK;404'), `${pathname} is a real detail page`);
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await noOverflow();
    console.log(`PASS new catalog route: ${pathname}`);
  }
  const result = await fetch(`${origin}/api/music/search?${new URLSearchParams({ q: track.title, limit: '20' })}`).then(r => r.json());
  assert.ok(result.items.some(item => item.imdbCode === track.id), 'New music is searchable, not just a detached data file');
  assert.deepEqual(errors, [], 'No browser JavaScript errors');
  console.log(`PASS new music search: ${track.id}`);
} finally {
  await browser.close();
}
