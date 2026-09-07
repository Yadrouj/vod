import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const origin = process.env.LOAD_BASE_URL || 'http://localhost:3004';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  for (const [path, name, query] of [['/', 'film', 'dark'], ['/music', 'music', 'ابی']]) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const form = `.${name}-landing-search`;
    await page.waitForFunction(form => Object.keys(document.querySelector(`${form} input`)).some(key => key.startsWith('__reactProps')), form);
    const input = page.locator(`${form} input`);
    await input.fill(query);
    await page.waitForFunction(() => document.querySelector('.suggest-results')?.getAttribute('aria-busy') === 'false' && document.querySelectorAll('.suggest-item').length >= 6);
    assert.equal(await page.locator('.suggest-type-filters').count(), name === 'film' ? 1 : 0);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForFunction(form => {
        const anchor = document.querySelector(form).getBoundingClientRect();
        const popup = document.querySelector('.suggest-menu-portal').getBoundingClientRect();
        return Math.abs(popup.y - anchor.bottom - 8) < 3 && Math.abs(popup.x - anchor.x) < 3 && popup.right <= innerWidth;
      }, form);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      const count = await page.locator('.suggest-results').evaluate(el => {
        const bounds = el.getBoundingClientRect();
        return [...el.querySelectorAll('.suggest-item')].filter(item => { const rect = item.getBoundingClientRect(); return rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1; }).length;
      });
      assert.ok(count >= 6, `${name}/${width}: six whole suggestions visible (${count})`);
      const clear = await page.locator(`${form} .suggest-clear`).boundingBox();
      const field = await input.boundingBox();
      assert.ok(clear.x >= field.x && clear.x + clear.width <= field.x + field.width + 1, 'Clear stays inside input');
    }
    await page.locator(`${form} .suggest-clear`).click();
    assert.equal(await input.inputValue(), '');
    assert.equal(await page.locator('.suggest-menu-portal').count(), 0);
    console.log(`PASS ${name}: desktop and mobile anchored popup, six suggestions, no overflow, clear inside field.`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
