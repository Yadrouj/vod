import assert from 'node:assert/strict';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { prepareQueue } from './blog-agent.mjs';

// Isolated local-only preview: never writes to the live publication snapshot.
const directory = path.resolve('.media-cache/magazine-gallery-preview');
await mkdir(path.join(directory, 'titles'), { recursive: true });
await mkdir('.media-cache/magazine-smoke', { recursive: true });
const drafts = await prepareQueue();
await copyFile('public/data/vod-index.json', path.join(directory, 'vod-index.json'));
await copyFile('public/data/title-map.json', path.join(directory, 'title-map.json'));
for (const id of new Set(drafts.flatMap(a => a.media.filter(m => m.kind !== 'music').map(m => m.id)))) {
  try { await copyFile(`public/data/titles/${id}.json`, path.join(directory, 'titles', `${id}.json`)); } catch {}
}
await writeFile(path.join(directory, 'magazine.json'), JSON.stringify({ version: 1, updatedAt: '2026-10-02', articles: drafts.map(a => ({ ...a, publishedAt: '2026-10-02T10:00:00Z' })) }));
const { chromium } = process.env.PLAYWRIGHT_MODULE ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href) : await import('playwright');
const origin = 'http://127.0.0.1:3005';
const server = spawn(process.execPath, ['--import', 'tsx', 'watch-party-server.ts'], { env: { ...process.env, PORT: '3005', HOSTNAME: '127.0.0.1', VOD_DATA_DIR: directory }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
server.stdout.on('data', chunk => { output = (output + chunk).slice(-5000); });
server.stderr.on('data', chunk => { output = (output + chunk).slice(-5000); });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { const response = await fetch(origin + '/mag/house-hugh-laurie-guide'); if (response.ok) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw new Error(output);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(ready, output);
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, isMobile: width < 600, hasTouch: width < 600 });
    for (const slug of ['breaking-bad-character-guide', 'godfather-acting-guide', 'film-score-listening-guide']) {
      assert.equal((await page.goto(`${origin}/mag/${slug}`, { waitUntil: 'domcontentloaded', timeout: 90000 })).status(), 200);
      const gallery = page.locator('#film-gallery:visible');
      await gallery.waitFor();
      assert.ok(await gallery.locator('figure img').count() > 0);
      assert.equal(await page.locator('figure img').first().getAttribute('src'), `/media/magazine/articles/${slug}.webp`);
      const trailer = gallery.locator('details').first();
      if (await trailer.count()) {
        await trailer.locator('summary').click();
        assert.ok(await trailer.locator('video, a[href^="https://www.imdb.com/video/"]').count() > 0);
        for (const source of await trailer.locator('video').evaluateAll(videos => videos.map(v => v.getAttribute('src')))) assert.ok(!/[?&]Expires=1(?:&|$)/i.test(source));
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${slug} ${width}px overflow`);
      if (slug === 'godfather-acting-guide') {
        await gallery.scrollIntoViewIfNeeded();
        await gallery.locator('figure img').first().evaluate(image => Promise.race([image.decode(), new Promise((_, reject) => setTimeout(() => reject(new Error('Gallery image did not load')), 15000))]));
        await page.screenshot({ path: `.media-cache/magazine-smoke/gallery-${width}.png` });
      }
    }
    await page.close();
  }
  console.log('Original film/series galleries and trailer fallback passed at 320/390/1440px in an isolated preview.');
} finally { await browser?.close(); server.kill(); }
