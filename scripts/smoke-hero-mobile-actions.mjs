import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const origin = process.env.LOAD_BASE_URL || 'http://127.0.0.1:3004';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname), 'Local smoke test only');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
await mkdir('.media-cache/hero-actions', { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true, serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(30_000); page.setDefaultNavigationTimeout(120_000);
  page.on('pageerror', error => errors.push(error.message));
  const hero = page.locator('[data-cinema-hero]:visible');
  const actions = hero.locator('[data-hero-actions]');
  const details = actions.locator('a[aria-label]');
  const checkRow = async (count, width, locale) => {
    const boxes = await actions.locator(':scope > a, :scope > button').evaluateAll(elements => elements.map(el => {
      const r = el.getBoundingClientRect();
      const children = [...el.querySelectorAll('svg, strong')].filter(child => child.getBoundingClientRect().width).map(child => {
        const box = child.getBoundingClientRect(); return { left: box.left, right: box.right };
      });
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) if (walker.currentNode.textContent.trim()) {
        const range = document.createRange(); range.selectNodeContents(walker.currentNode);
        for (const box of range.getClientRects()) if (box.width) children.push({ left: box.left, right: box.right });
      }
      return { left: r.left, right: r.right, middle: r.top + r.height / 2, width: r.width, height: r.height, children };
    }));
    assert.equal(boxes.length, count);
    for (const box of boxes) {
      assert.ok(Math.abs(box.middle - boxes[0].middle) < (width > 760 ? 3 : 1), `${locale}/${width}: actions share one row: ${JSON.stringify(boxes)}`);
      assert.ok(box.width >= 44 && box.height >= 44, 'At least 44px touch targets');
      assert.ok(box.left >= 0 && box.right <= width + 1, 'Buttons remain in the viewport');
      for (const child of box.children) assert.ok(child.left >= box.left - 1 && child.right <= box.right + 1, `${locale}/${width}: icon/label fits the button: ${JSON.stringify({ box, child })}`);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
  };
  for (const locale of ['fa', 'en']) {
    await context.addCookies([{ name: 'vod_locale', value: locale, url: origin }]);
    assert.equal((await page.goto(origin, { waitUntil: 'domcontentloaded' })).status(), 200);
    await actions.waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('[data-cinema-hero] button')].some(el => Object.keys(el).some(key => key.startsWith('__reactProps') && typeof el[key].onClick === 'function')));
    await page.waitForFunction(() => [...document.querySelectorAll('[data-hero-actions]')].some(el => el.getBoundingClientRect().width > 0 && getComputedStyle(el).display === 'grid'));
    await page.evaluate(() => document.fonts.ready);
    for (let i = 0; await actions.getAttribute('data-coming-soon') === 'true' && i < 10; i++) await hero.getByRole('button', { name: locale === 'fa' ? 'عنوان بعدی' : 'Next title', exact: true }).click();
    assert.equal(await actions.getAttribute('data-coming-soon'), 'false', 'Test an available title with three actions');
    for (const width of [320, 360, 390, 430, 600, 760]) {
      await page.setViewportSize({ width, height: 844 });
      await checkRow(3, width, locale);
      assert.equal(await details.locator('svg.lucide-info').count(), 1);
      assert.ok(await details.locator(locale === 'fa' ? 'svg.lucide-chevron-left' : 'svg.lucide-chevron-right').isVisible());
      assert.equal(await details.locator('span').isVisible(), false, 'Details text gives way to info + arrow on mobile');
      assert.ok((await details.getAttribute('aria-label')).length > 8, 'Icon link retains the title for screen readers');
      const href = await details.getAttribute('href');
      assert.equal(await actions.locator('a').first().getAttribute('href'), `/watch${href}`, 'Play and info refer to the same selected title');
      if (width === 320 || width === 390) await actions.screenshot({ path: `.media-cache/hero-actions/${locale}-${width}.png` });
      console.log(`PASS ${locale}/${width}: three actions, info + arrow, readable bounds and touch targets`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await actions.locator('.watch-together-launcher').click();
    const dialog = page.locator('dialog[data-responsive-dialog][open]');
    await dialog.waitFor();
    const bounds = await dialog.boundingBox();
    assert.ok(Math.abs(bounds.width - 390) < 1, 'Watch-together setup remains full-screen on mobile');
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
    for (const width of [1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await details.locator('span').isVisible(), 'Desktop keeps the Details text');
      assert.equal(await details.locator('svg.lucide-chevron-left, svg.lucide-chevron-right').isVisible(), false);
      await checkRow(3, width, locale);
    }
    // Exercise the two-action coming-soon layout without changing catalog data.
    await page.setViewportSize({ width: 320, height: 844 });
    await actions.evaluate(el => { el.querySelector('button.watch-together-launcher').remove(); el.dataset.comingSoon = 'true'; });
    await checkRow(2, 320, locale);
    console.log(`PASS ${locale}: room dialog, desktop labels and two-action upcoming layout`);
  }
  assert.deepEqual(errors, [], 'No browser JavaScript errors');
} finally { await browser.close(); }
