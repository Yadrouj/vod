import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function captureProduct({ chromium, output, base = 'http://127.0.0.1:3004' }) {
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'Record a local preview, not production visitors or private accounts');
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const manifest = [];
  try {
    const context = await browser.newContext({ viewport: { width: 430, height: 860 }, deviceScaleFactor: 2, reducedMotion: 'reduce', serviceWorkers: 'block', hasTouch: true });
    await context.addCookies([{ name: 'vod_locale', value: 'fa', url: base }]);
    // No analytics, advertising, external scripts or film/audio downloads.
    // Public cover images remain visible in the genuine product screenshots.
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (request.resourceType() === 'media' || /\.(?:mp3|mkv|mp4|m3u8)(?:\?|$)/i.test(url.pathname)) return route.abort();
      return url.origin === new URL(base).origin || ['image', 'font'].includes(request.resourceType()) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(35_000); page.setDefaultNavigationTimeout(120_000);
    const visit = async route => {
      const response = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200, route);
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: '*,*::before,*::after{caret-color:transparent!important;scroll-behavior:auto!important}' });
    };
    const settleImages = async () => {
      await page.evaluate(() => Promise.all([...document.images].filter(image => { const r = image.getBoundingClientRect(); return r.width && r.top < innerHeight && r.bottom > 0; }).map(image => image.complete ? Promise.resolve() : new Promise(resolve => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); setTimeout(resolve, 12_000); }))));
    };
    const save = async (name, description) => {
      await settleImages();
      await page.screenshot({ path: path.join(output, `${name}.png`), animations: 'disabled' });
      manifest.push({ name, description, route: new URL(page.url()).pathname, width: 860, height: 1720 });
      console.log(`CAPTURE ${name}`);
    };
    await visit('/');
    await save('home', 'Actual Persian mobile landing page');
    const search = page.locator('header.gradient-menu:visible button:has(svg.lucide-search)');
    await page.waitForFunction(() => [...document.querySelectorAll('header.gradient-menu button')].some(el => el.querySelector('svg.lucide-search') && Object.keys(el).some(key => key.startsWith('__reactProps') && typeof el[key].onClick === 'function')));
    await search.click();
    const dialog = page.locator('dialog[data-responsive-dialog][open]');
    await dialog.locator('input[role="combobox"]').fill('breakng bud');
    await dialog.locator('.suggest-item[href="/tt0903747"]').waitFor();
    await page.waitForFunction(() => !document.querySelector('dialog[open] .suggest-results[aria-busy="true"]'));
    await save('search', 'Real misspelling correction: breakng bud → Breaking Bad');
    await page.keyboard.press('Escape');
    if (await dialog.count()) await page.keyboard.press('Escape');
    await visit('/tt0903747');
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await save('film', 'Actual film/series detail page; no third-party video used');
    const launcher = page.locator('.watch-together-launcher:visible').first();
    await launcher.click();
    await page.locator('dialog[data-responsive-dialog][open]').waitFor();
    await save('together', 'Actual private watch-room setup, without creating a public room');
    await visit('/music?q=Shadmehr');
    await page.locator('[data-mobile-feature="music"]').waitFor();
    await save('music', 'Actual mobile music landing page');
    const musicFeature = page.locator('[data-mobile-feature="music"]');
    await musicFeature.locator('[aria-label="پخش و تماشای گروهی"]').screenshot({ path: path.join(output, 'music-actions.png') });
    const listen = musicFeature.locator('.watch-together-launcher');
    await page.waitForFunction(() => [...document.querySelectorAll('[data-mobile-feature="music"] button')].some(el => Object.keys(el).some(key => key.startsWith('__reactProps') && typeof el[key].onClick === 'function')));
    await listen.click(); await page.locator('dialog[data-responsive-dialog][open]').waitFor();
    await save('listen', 'Actual listening-together setup; no copyrighted recording sampled');
    await page.setViewportSize({ width: 1100, height: 900 });
    await visit('/browse?section=top-imdb');
    const posters = page.locator('[data-archive-card] img');
    await posters.first().waitFor();
    await page.evaluate(() => {
      const card = document.querySelector('[data-archive-card]');
      if (card) scrollTo(0, card.getBoundingClientRect().top + scrollY - 50);
    });
    await save('catalog', 'Actual catalog and artwork; used incidentally to demonstrate search');
    manifest.at(-1).width = 2200; manifest.at(-1).height = 1800;
    for (let i = 0; i < Math.min(6, await posters.count()); i++) {
      const poster = posters.nth(i); await poster.scrollIntoViewIfNeeded();
      await poster.evaluate(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); setTimeout(resolve, 10_000); }));
      await poster.screenshot({ path: path.join(output, `poster-${i}.png`) });
    }
    await writeFile(path.join(output, 'capture-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  } finally { await browser.close(); }
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
  await captureProduct({ chromium, output: process.env.REEL_ASSETS || '.media-cache/marketing/sarvnema-cinematic/assets', base: process.env.REEL_BASE_URL || undefined });
}
