import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const origin = process.env.LOAD_BASE_URL || 'http://127.0.0.1:3004';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname));
for (const [q, id] of [['odysse', 'tt33764258'], ['ادیسه', 'tt33764258'], ['house', 'tt0412142']]) {
  for (const type of ['all', 'movie', 'series']) {
    const params = new URLSearchParams({q, type});
    const [suggest, archive] = await Promise.all(['suggest', 'archive'].map(async endpoint => {
      const res = await fetch(`${origin}/api/${endpoint}?${params}`);
      assert.equal(res.status, 200);
      return (await res.json()).items;
    }));
    if (type === 'all') assert.equal(suggest[0].imdbCode, id);
    else assert.ok(suggest.every(item => item.type === type));
    assert.deepEqual(suggest.map(i => i.imdbCode), archive.slice(0, suggest.length).map(i => i.id));
  }
  console.log(`PASS suggestions & archive: ${q} → ${id}`);
}
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
    // Third-party poster/CDN latency isn't part of ranking or layout QA.
    await page.route('**/*', route => route.request().resourceType() === 'image' ? route.abort() : route.continue());
    await page.context().addCookies([{ name: 'vod_locale', value: 'fa', url: origin }]);
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
    const launcher = page.locator(width > 760 ? 'header.gradient-menu [aria-keyshortcuts="/"]' : '.app-nav-search');
    await launcher.focus();
    await page.waitForFunction(selector => Object.keys(document.querySelector(selector) ?? {}).some(k => k.startsWith('__reactProps$')), width > 760 ? 'header.gradient-menu [aria-keyshortcuts="/"]' : '.app-nav-search');
    if (width > 760) await launcher.press('/');
    else await launcher.click();
    const dialog = page.locator('dialog[open]');
    const field = dialog.getByRole('combobox');
    await field.fill('odysse');
    const first = dialog.locator('.suggest-item').first();
    await dialog.locator('.suggest-item[href="/tt33764258"]').waitFor();
    assert.equal(await first.getAttribute('href'), '/tt33764258');
    assert.match(await first.innerText(), /IMDb/);
    const list = dialog.getByRole('listbox');
    const position = await field.boundingBox();
    await list.evaluate(el => { el.scrollTop = 200; });
    assert.ok(await list.evaluate(el => el.scrollTop > 0));
    assert.equal((await field.boundingBox()).y, position.y);
    await field.press('ArrowDown');
    const selected = await field.getAttribute('aria-activedescendant');
    assert.equal(selected, await first.getAttribute('id'));
    await dialog.locator('.suggest-view-all').click();
    const card = page.locator('[data-archive-card]').first();
    await card.waitFor();
    assert.equal(await card.getAttribute('href'), '/tt33764258');
    console.log(`PASS ${width}px: search access, first visible match, scrolling, keyboard and full results`);
    await page.close();
  }
} finally { await browser.close(); }
