import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const origin = process.env.LOAD_BASE_URL || 'http://localhost:3004';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Local smoke test only');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await context.addCookies([{ name: 'vod_locale', value: 'fa', url: origin }]);
  const page = await context.newPage();
  // React can briefly retain a hidden streamed/cached tree during navigation.
  const main = page.getByRole('main');
  page.setDefaultNavigationTimeout(90000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.request().url().startsWith(origin) && route.request().resourceType() !== 'image' ? route.continue() : route.abort());
  await page.goto(origin + '/browse', { waitUntil: 'domcontentloaded' });
  await main.locator('select[name="country"]').waitFor({ state: 'attached' });
  const options = async name => main.locator(`select[name="${name}"] option`).evaluateAll(nodes => nodes.map(n => ({ value: n.value, label: n.textContent })));
  for (const field of ['genre', 'country', 'language']) {
    const entries = await options(field);
    assert.ok(entries.length > 10, field);
    assert.equal(new Set(entries.map(o => o.value)).size, entries.length, `${field}: unique values`);
    assert.equal(new Set(entries.map(o => o.label)).size, entries.length, `${field}: unique labels`);
    assert.ok(entries.every(o => !/[a-z0-9]/i.test(o.label)), `${field}: Persian labels, no years`);
    console.log(JSON.stringify({ locale: 'fa', field, choices: entries.length - 1, duplicateLabels: false }));
  }
  assert.equal((await options('genre')).filter(o => o.value === 'Drama').length, 1);
  assert.equal((await options('country')).filter(o => o.value === 'United States').length, 1);
  assert.equal((await options('language')).filter(o => o.value === 'English').length, 1);
  assert.ok(!(await options('country')).some(o => /^\d+$/.test(o.value)));
  const years = (await options('year')).filter(o => o.value !== 'All').map(o => Number(o.value));
  assert.deepEqual(years, [...years].sort((a, b) => b - a));

  const legacy = { genre: 'درام', country: 'آمریکا', language: 'انگلیسی' };
  const canonical = { genre: 'Drama', country: 'United States', language: 'English' };
  await page.goto(`${origin}/browse?${new URLSearchParams(legacy)}`, { waitUntil: 'domcontentloaded' });
  for (const [name, value] of Object.entries(canonical)) assert.equal(await main.locator(`select[name="${name}"]`).inputValue(), value);
  const results = await main.locator('[data-archive-card]').evaluateAll(nodes => nodes.slice(0, 12).map(n => n.getAttribute('href')));
  assert.ok(results.length > 0);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const refine = main.locator('details').filter({ has: page.locator('select[name="country"]') });
    await refine.evaluate(node => { node.open = true; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow ${width}`);
    const bounds = await main.locator('select[name="country"]').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, `country control fits ${width}`);
  }
  await main.locator('select[name="genre"]').selectOption('Comedy');
  await page.getByRole('button', { name: 'اعمال', exact: true }).click();
  await page.waitForURL(url => url.searchParams.get('genre') === 'Comedy');
  await main.locator('select[name="genre"]').waitFor({ state: 'attached' });
  assert.equal(new URL(page.url()).searchParams.get('country'), 'United States');
  assert.equal(new URL(page.url()).searchParams.get('language'), 'English');

  const requests = await Promise.all([legacy, canonical].map(params => fetch(`${origin}/api/archive?${new URLSearchParams(params)}`).then(r => { assert.equal(r.status, 200); return r.json(); })));
  assert.deepEqual(requests[0].items.map(i => i.id), requests[1].items.map(i => i.id));
  await context.addCookies([{ name: 'vod_locale', value: 'en', url: origin }]);
  await page.goto(origin + '/browse', { waitUntil: 'domcontentloaded' });
  assert.ok((await options('genre')).every(o => !/[\u0600-\u06ff]/.test(o.label)));
  assert.ok((await options('language')).some(o => o.label === 'English'));
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ legacyLinks: 'same results', mobileDesktop: 'no overflow', form: 'canonical values submitted', englishLocale: 'correct', jsErrors: errors.length }));
} finally { await browser.close(); }
