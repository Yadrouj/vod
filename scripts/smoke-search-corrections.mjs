import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const origin = process.env.LOAD_BASE_URL || 'http://localhost:3004';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname));
const suggest = async (q, type = 'all') => {
  const response = await fetch(`${origin}/api/suggest?${new URLSearchParams({ q, type, limit: '14', suggest: 'spelling-v1' })}`);
  assert.equal(response.status, 200);
  return response.json();
};
for (const [query, expected] of [['hoise', 'House'], ['huose', 'House'], ['breking bad', 'Breaking Bad'], ['breakingbad', 'Breaking Bad']]) {
  const result = await suggest(query);
  assert.equal(result.mode, 'similar'); assert.equal(result.matchedQuery, expected);
  assert.ok(result.items.every((item, i) => i === 0 || (result.items[i - 1].imdbRating ?? -1) >= (item.imdbRating ?? -1)));
  console.log(`PASS API: ${query} → ${expected}; IMDb descending`);
}
const expected = await suggest('hoise');
assert.equal(expected.items[0].imdbCode, 'tt0412142');
assert.ok(expected.corrections.length > 1 && expected.corrections.length <= 5);
assert.deepEqual((await suggest('house')).corrections, []);
assert.equal((await suggest('hoise', 'series')).items[0].imdbCode, 'tt0412142');
assert.ok((await suggest('hoise', 'movie')).items.every(item => item.type === 'movie'));
const archive = await (await fetch(`${origin}/api/archive?q=hoise&offset=0`)).json();
assert.equal(archive.items[0].id, 'tt0412142');
const music = await (await fetch(`${origin}/api/music/search?q=mahsti&includeArtists=1&suggest=spelling-v1`)).json();
assert.equal(music.mode, 'similar'); assert.ok(music.items.length > 0); assert.ok(music.artists.length > 0);
console.log('PASS submitted archive and music artist/track spelling search');
await mkdir('.media-cache', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ serviceWorkers: 'block' });
  page.setDefaultNavigationTimeout(90000);
  await page.context().addCookies([{ name: 'vod_locale', value: 'fa', url: origin }]);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    if (width !== 1440) await page.locator('.app-nav-search').click();
    const selector = width === 1440 ? '.film-landing-search input[role="combobox"]' : '.app-search-dialog[open] input[role="combobox"]';
    await page.waitForFunction(selector => {
      const input = document.querySelector(selector);
      return input && Object.keys(input).some(key => key.startsWith('__reactProps$') && typeof input[key]?.onChange === 'function');
    }, selector);
    const input = page.locator(selector);
    await input.fill('hoise');
    const menu = page.locator('.suggest-menu:visible');
    const corrections = menu.locator('[data-search-corrections]');
    await corrections.waitFor();
    assert.equal(await input.inputValue(), 'hoise', 'Never silently overwrite user input');
    assert.equal(await menu.locator('.suggest-item').first().getAttribute('href'), '/tt0412142');
    await page.screenshot({ path: `.media-cache/search-corrections-${width}.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await corrections.getByRole('button', { name: 'House', exact: true }).click();
    assert.equal(await input.inputValue(), 'House');
    await page.waitForFunction(() => [...document.querySelectorAll('.suggest-results')].some(el => el.getBoundingClientRect().height && el.getAttribute('aria-busy') === 'false' && el.querySelectorAll('.suggest-item').length > 0));
    assert.equal(await corrections.count(), 0);
    await input.fill('hoise');
    await corrections.waitFor();
    await corrections.getByRole('button', { name: expected.corrections[1], exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await input.inputValue(), expected.corrections[1], 'Alternative corrections are keyboard actionable');
    await input.fill('hoise');
    await corrections.waitFor();
    await input.fill('house');
    await page.waitForFunction(() => [...document.querySelectorAll('.suggest-results')].some(el => el.getBoundingClientRect().height && el.getAttribute('aria-busy') === 'false' && el.querySelectorAll('.suggest-item').length > 0));
    assert.equal(await corrections.count(), 0, 'Stale typo chips disappear after a new query');
    console.log(`PASS ${width}px: correction chips, direct results, untouched input, keyboard and no stale suggestions`);
  }
  await page.goto(`${origin}/browse?q=hoise&type=series`, { waitUntil: 'domcontentloaded' });
  const banner = page.locator('section.section > [data-search-corrections]');
  await banner.waitFor();
  const link = new URL(await banner.getByRole('link', { name: 'House', exact: true }).getAttribute('href'), origin);
  assert.equal(link.searchParams.get('type'), 'series'); assert.equal(link.searchParams.get('q'), 'House');
  assert.deepEqual(errors, []);
  console.log('PASS browse correction links preserve filters; no browser errors');
} finally { await browser.close(); }
