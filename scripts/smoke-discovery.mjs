import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const origin = process.env.LOAD_BASE_URL || 'http://localhost:3004';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname));
await mkdir('.media-cache', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'vod_locale', value: 'fa', url: origin }]);
  await context.addInitScript(() => {
    if (localStorage.getItem('discovery-test-seeded')) return;
    const ids = ['tt29355505', 'tt26545992', 'tt0903747', 'tt0137523', 'tt0111161', 'tt0468569'];
    const items = ids.map((itemId, i) => ({ itemId, title: `Title ${i}`, url: `https://example.com/history-${i}.mp4`, time: 45 + i * 10, duration: 120, at: Date.now() - i * 1000 }));
    const duplicate = { ...items[0], url: 'https://example.com/older-quality.mp4', at: 1 };
    localStorage.setItem('sarvnema_progress', JSON.stringify(Object.fromEntries([...items, duplicate].map(item => [item.url, item]))));
    localStorage.setItem('sarvnema_downloads', JSON.stringify(items.map(item => ({ ...item, href: item.url, label: '1080p' }))));
    localStorage.setItem('discovery-test-seeded', '1');
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('.film-trending-context').waitFor();
  assert.equal(await page.locator('.film-landing-dots button').count(), 10);
  await page.locator('.personal-history-card img').first().waitFor({ timeout: 30000 });
  for (const selector of ['[data-section="recent-films"]', '[data-section="latest-series"]', '[data-section="new-episodes"]']) {
    assert.equal(await page.locator(selector).evaluate(el => Boolean(el.compareDocumentPosition(document.querySelector('.continue-watching')) & Node.DOCUMENT_POSITION_FOLLOWING)), true, `${selector} above history`);
  }
  assert.equal(await page.locator('.continue-watching .personal-history-card').count(), 6, 'Deduplicate movie qualities');
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const name of ['continue-watching', 'download-history']) {
      const section = page.locator(`.${name}`);
      await section.scrollIntoViewIfNeeded();
      const tops = await section.locator('.personal-history-card').evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().top)));
      assert.ok(tops.every(top => Math.abs(top - tops[0]) <= 1), `${width}/${name} is one row`);
      assert.equal(await section.locator('.personal-history-card img').count(), 6, 'Backdrop on every matched card');
      const track = section.locator('.personal-history-track');
      await track.evaluate(el => { el.scrollLeft = 0; });
      await section.getByRole('button', { name: 'نمایش موارد بعدی' }).click();
      await page.waitForFunction(name => document.querySelector(`.${name} .personal-history-track`).scrollLeft > 10, name);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `No page overflow at ${width}`);
    if (width === 1440 || width === 390) await page.locator('.continue-watching').screenshot({ path: `.media-cache/history-${width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const input = page.locator('.film-landing-search input[role="combobox"]');
  await input.fill('dark');
  await page.waitForFunction(() => document.querySelector('.suggest-results')?.getAttribute('aria-busy') === 'false' && document.querySelectorAll('.suggest-item').length > 1);
  const menu = page.locator('.suggest-menu-portal');
  assert.deepEqual(await menu.locator('.suggest-type-heading').allTextContents(), ['فیلم', 'سریال']);
  for (const [label, kind] of [['فیلم', 'movie'], ['سریال', 'series']]) {
    const loaded = page.waitForResponse(response => response.url().includes('/api/suggest?') && response.url().includes(`type=${kind}`) && response.ok());
    await menu.getByRole('button', { name: label, exact: true }).click();
    const result = await (await loaded).json();
    assert.ok(result.items.every(item => item.type === kind));
    assert.ok(result.items.every((item, i) => !i || (result.items[i - 1].imdbRating ?? -1) >= (item.imdbRating ?? -1)));
    await page.waitForFunction(() => document.querySelector('.suggest-results')?.getAttribute('aria-busy') === 'false');
    await menu.getByRole('button', { name: label, exact: true }).click();
    assert.equal(await page.locator('.suggest-results').getAttribute('aria-busy'), 'false', 'Active tab does not get stuck loading');
  }
  const bounds = await input.boundingBox();
  const popup = await menu.boundingBox();
  assert.ok(popup.y >= bounds.y + bounds.height, 'Popup below field');
  await page.screenshot({ path: '.media-cache/discovery-search.png' });
  await page.locator('.suggest-clear').click();
  assert.equal(await input.inputValue(), '');
  assert.equal(await menu.count(), 0);
  // End-to-end saved source selection: intercept just the chosen media with a
  // tiny silent WAV, never download a movie or change catalog data.
  const media = await (await page.request.get(`${origin}/api/watch-party/title/tt0903747`)).json();
  const sources = media.media?.sources ?? media.sources ?? [];
  assert.ok(sources.length > 1, 'Series sources available');
  const selected = sources.find(source => source.season === 1 && source.episode === 2) || sources[1];
  await page.evaluate(({ url }) => {
    localStorage.setItem('sarvnema_progress', JSON.stringify({ [url]: { itemId: 'tt0903747', title: 'Breaking Bad', url, time: 8, at: Date.now() } }));
  }, selected);
  const bytes = 8000 * 2 * 30; const wav = Buffer.alloc(44 + bytes);
  wav.write('RIFF'); wav.writeUInt32LE(36 + bytes, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(bytes, 40);
  await context.route(selected.url, route => {
    const range = route.request().headers().range?.match(/bytes=(\d+)-(\d*)/);
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
    return route.fulfill({ status: range ? 206 : 200, body: wav.subarray(start, end + 1), contentType: 'audio/wav', headers: { 'Accept-Ranges': 'bytes', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}) } });
  });
  await page.goto(`${origin}/watch/tt0903747?resume=${encodeURIComponent(selected.url)}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(url => document.querySelector('video.player')?.getAttribute('src') === url && document.querySelector('video.player')?.currentTime >= 7, selected.url, { timeout: 30000 }).catch(async error => {
    console.error('Resume diagnostics', { selected, video: await page.locator('video.player').evaluate(el => ({ src: el.getAttribute('src'), time: el.currentTime, duration: el.duration, ready: el.readyState, error: el.error?.message })), progress: await page.evaluate(() => localStorage.getItem('sarvnema_progress')) });
    throw error;
  });
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('PASS: IMDb hero, top release rows, image history rails at 4 widths, grouped rated search, clear/tabs, exact episode source and resume time.');
  await context.close();
} finally { await browser.close(); }
