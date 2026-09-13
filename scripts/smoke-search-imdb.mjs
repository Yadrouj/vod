import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const origin = process.env.LOAD_BASE_URL || 'http://localhost:3004';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname));
const descending = items => items.every((item, i) => i === 0 || (items[i - 1].imdbRating ?? -1) >= (item.imdbRating ?? -1));
const expected = new Map();
for (const query of ['house', 'dark', 'star']) {
  for (const type of ['all', 'movie', 'series']) {
    const params = new URLSearchParams({ q: query, type, limit: '14', sort: 'imdb-desc' });
    const response = await fetch(`${origin}/api/suggest?${params}`);
    assert.equal(response.status, 200);
    const { items } = await response.json();
    assert.ok(items.length > 0);
    assert.ok(descending(items), `${query}/${type}: globally descending ratings`);
    assert.equal(new Set(items.map(item => item.imdbCode)).size, items.length);
    if (type !== 'all') assert.ok(items.every(item => item.type === type));
    if (query === 'house') {
      expected.set(type, items.map(item => `/${item.imdbCode}`));
      if (type !== 'movie') assert.equal(items[0].imdbCode, 'tt0412142', 'House must be first');
    }
  }
}
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ serviceWorkers: 'block' });
  await page.context().addCookies([{ name: 'vod_locale', value: 'fa', url: origin }]);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
    const selector = width === 1440 ? '.film-landing-search input[role="combobox"]' : '.app-search-dialog[open] input[role="combobox"]';
    if (width !== 1440) await page.locator('.app-nav-search').click();
    await page.waitForFunction(selector => {
      const input = document.querySelector(selector);
      return input && Object.keys(input).some(key => key.startsWith('__reactProps$') && typeof input[key]?.onChange === 'function');
    }, selector);
    const input = page.locator(selector);
    await input.fill('house');
    const menu = page.locator('.suggest-menu:visible');
    for (const [type, label] of [['all', 'همه'], ['movie', 'فیلم'], ['series', 'سریال'], ['all', 'همه']]) {
      await menu.locator('.suggest-type-filters').getByRole('button', { name: label, exact: true }).click();
      await page.waitForFunction(expected => {
        const list = [...document.querySelectorAll('.suggest-results')].find(el => el.getBoundingClientRect().height > 0);
        return list?.getAttribute('aria-busy') === 'false' && JSON.stringify([...list.querySelectorAll('.suggest-item')].map(el => el.getAttribute('href'))) === JSON.stringify(expected);
      }, expected.get(type));
      assert.equal(await menu.locator('.suggest-type-heading').count(), 0, 'No type sections within a ranked list');
      const allLink = new URL(await menu.locator('.suggest-view-all').getAttribute('href'), origin);
      assert.equal(allLink.searchParams.get('q'), 'house');
      assert.equal(allLink.searchParams.get('type'), type === 'all' ? null : type);
    }
    await input.press('ArrowDown');
    const active = await input.getAttribute('aria-activedescendant');
    assert.equal(await page.locator(`[id="${active}"]`).getAttribute('href'), '/tt0412142', 'Keyboard follows the same mixed ranking');
    console.log(`PASS ${width}px: House first, mixed IMDb order, all/movie/series tabs and keyboard`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS live API ranking for house/dark/star; no browser errors');
} finally { await browser.close(); }
