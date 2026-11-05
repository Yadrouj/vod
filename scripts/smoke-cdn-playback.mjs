// Opt-in real playback, one existing release per CDN branch. Stops after five
// seconds; no full episodes/films are downloaded. Not an exhaustive audit.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3004';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Local test only');
assert.ok(process.argv.includes('--live'), 'Use --live to explicitly request bounded real media playback');
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || path.resolve('.media-cache/browser-tools/node_modules/playwright/index.mjs')).href);
const bundle = JSON.parse(await readFile('lib/data/verified-source-bases.json', 'utf8'));
const audit = JSON.parse(await readFile(process.env.PLAYBACK_AUDIT_REPORT || '.media-cache/playback-audit/latest.json', 'utf8'));
const roots = new Set(), jobs = [];
for (const [id, base] of Object.entries(bundle.bases)) {
  if (roots.has(base.baseUrl)) continue;
  roots.add(base.baseUrl);
  const sample = audit.bases[id]?.samples.find(row => !/x265|hevc|10bit/i.test(row.url));
  if (sample) jobs.push({ id, sample, base });
}
const selected = process.env.TEST_BRANCH ? jobs.filter(job => job.id === process.env.TEST_BRANCH) : jobs;
assert.ok(selected.length, 'No matching branch/sample in the audit report');
const browser = await chromium.launch({ channel: process.env.TEST_BROWSER || 'chrome', headless: true });
const results = [];
try {
  for (const { id, sample, base } of selected) {
    const context = await browser.newContext({ viewport: { width: 1100, height: 850 }, serviceWorkers: 'block' });
    const page = await context.newPage(); page.setDefaultTimeout(60000);
    const networkFailures = [];
    page.on('requestfailed', request => {
      if (request.resourceType() === 'media' && request.failure()?.errorText !== 'net::ERR_ABORTED')
        networkFailures.push({ host: new URL(request.url()).hostname, error: request.failure()?.errorText });
    });
    try {
      const response = await context.request.get(`${origin}/api/watch-party/title/${encodeURIComponent(sample.itemId)}`);
      assert.ok(response.ok(), 'Catalog title must exist');
      // The room API may prefer an MP4 mirror and intentionally omit this MKV.
      // Test the exact existing audit release, not another episode/API default.
      const original = new URL(sample.url);
      assert.ok(original.pathname.startsWith(new URL(base.baseUrl).pathname));
      const source = { url: new URL(original.pathname + original.search, new URL(base.baseUrl).origin).href };
      await page.goto(`${origin}/watch/${encodeURIComponent(sample.itemId)}?${new URLSearchParams({ resume: source.url })}`, { waitUntil: 'domcontentloaded' });
      await page.locator('main .pro-player:visible > button[data-player-ui]').click();
      await page.waitForFunction(() => [...document.querySelectorAll('main video.player')].some(el => el.currentTime > 5)
        || [...document.querySelectorAll('main [data-player-recovery]')].some(el => el.getClientRects().length), null, { timeout: 45000 });
      const result = await page.locator('main video.player:visible').evaluate(el => ({
        host: new URL(el.currentSrc).hostname, path: new URL(el.currentSrc).pathname,
        time: el.currentTime, width: el.videoWidth, height: el.videoHeight,
        frames: el.getVideoPlaybackQuality?.().totalVideoFrames, error: el.error?.message || null,
        audioBytes: el.webkitAudioDecodedByteCount,
      }));
      assert.equal(result.path, new URL(source.url).pathname, 'Never substitute another episode or file');
      const passed = !result.error && result.time > 5 && result.frames > 30;
      const recovery = page.locator('main [data-player-recovery]:visible');
      const recoveryCode = await recovery.count() ? await recovery.getAttribute('data-playback-error-code') : null;
      results.push({ id, title: sample.title, itemId: sample.itemId, passed, ...result, recoveryCode, networkFailures });
      console.log(JSON.stringify(results.at(-1)));
    } catch (error) { results.push({ id, title: sample.title, passed: false, error: error.message }); console.log(JSON.stringify(results.at(-1))); }
    finally { await context.close(); }
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ scope: 'One real non-HEVC release per verified archive branch, not every file/browser/network', tested: results.length, passed: results.filter(row => row.passed).length }));
if (results.length !== (process.env.TEST_BRANCH ? selected.length : roots.size) || results.some(row => !row.passed)) process.exitCode = 1;
