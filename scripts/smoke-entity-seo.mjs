import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const origin = process.env.LOAD_BASE_URL || 'http://localhost:3004';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  page.setDefaultNavigationTimeout(90000); page.setDefaultTimeout(45000);
  await page.route('**/*', route => route.request().url().startsWith(origin) && !route.request().url().includes('/api/music/media') ? route.continue() : route.abort());
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const routes = [
    ['/person/nm0000375', /رابرت داونی جونیور.*Robert Downey Jr/],
    ['/person/nm0634240', /کریستوفر نولان.*Christopher Nolan/],
    ['/tt5491994', /سیاره زمین ۲.*Planet Earth II/],
    ['/music/artists/ebi', /ابی.*Ebi/],
    ['/films', /فیلم‌ها/], ['/series', /سریال‌ها/], ['/animation', /انیمیشن/],
    ['/top-imdb', /برترین‌های IMDb/], ['/iranian-films', /فیلم‌های ایرانی/],
  ];
  for (const [path, title] of routes) {
    const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200, path);
    await page.locator('#entity-faq-heading').waitFor();
    await page.waitForFunction(() => !document.title.includes('localhost') && document.title.length > 10);
    assert.match(await page.title(), title, path);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://sarvnema.ir' + path, path);
    const faq = page.locator('section[aria-labelledby="entity-faq-heading"]');
    await faq.locator('summary').first().click();
    assert.ok(await faq.locator('p').first().isVisible(), path);
    const visible = await faq.locator('details').evaluateAll(nodes => nodes.map(n => ({ question: n.querySelector('summary').textContent, answer: n.querySelector('p').textContent })));
    const structured = await faq.locator('script[type="application/ld+json"]').evaluate(node => JSON.parse(node.textContent));
    assert.deepEqual(structured.mainEntity.map(q => ({ question: q.name, answer: q.acceptedAnswer.text })), visible, path);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path} overflow ${width}`);
    }
    console.log(JSON.stringify({ path, title: await page.title(), faq: visible.length, canonical: 'correct', overflow: false }));
  }
  await page.goto(origin + '/browse?q=house', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content.includes('noindex'));
  assert.ok((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
  const links = await page.locator('footer nav').first().locator('a').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
  assert.ok(links.includes('/films') && links.includes('/series') && links.includes('/music'));
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ searchResults: 'noindex', footer: 'crawlable primary sections', jsErrors: errors.length }));
} finally { await browser.close(); }
