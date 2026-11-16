import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

test('expired MobLand bot gates refresh the exact file, keep the five-second countdown and recover safely', {
  skip: !process.env.DOWNLOAD_TEST_ORIGIN || !process.env.PLAYWRIGHT_MODULE, timeout: 180000,
}, async () => {
  const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const original = 'https://sn2.zxupload6137hgv.fun/dl5/Series5/1404/m01/MobLand/S02/Farsi.Dubbed/720p/MobLand.S02E07.720p.WEB-DL.x264-Pahe.Farsi.Dubbed.AvaMovie.mkv?md5=klkxELZ_Y34vazoECKKMDw&u=270572&expires=1794825945';
  const requested = [];
  const gate = (url, extra = {}) => `${process.env.DOWNLOAD_TEST_ORIGIN}/download/continue?${new URLSearchParams({ u: Buffer.from(url).toString('base64url'), title: 'MobLand · S02E07', quality: '720p', ...extra })}`;
  try {
    // Intercept the browser's final file navigation: never download a whole film.
    await page.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (request.isNavigationRequest() && url.hostname === new URL(original).hostname && /\.mkv$/i.test(url.pathname)) {
        requested.push({ url: url.href, at: Date.now() });
        return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Download navigation intercepted for QA.</p>' });
      }
      if (request.resourceType() === 'media') return route.abort();
      return route.continue();
    });
    const response = await page.goto(gate(original), { waitUntil: 'domcontentloaded', timeout: 90000 });
    assert.equal(response.status(), 200);
    await page.getByText('لینک موقت از ناشر تازه شد؛ همان فایل و کیفیت انتخابی شما', { exact: true }).waitFor();
    const countdownStarted = Date.now();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await mkdir('.media-cache/signed-download-tests', { recursive: true });
    await page.screenshot({ path: '.media-cache/signed-download-tests/refreshed-390.png' });
    await page.waitForURL(url => url.hostname === new URL(original).hostname, { timeout: 15000 });
    assert.equal(requested.length, 1);
    const actual = new URL(requested[0].url), before = new URL(original);
    assert.equal(actual.origin, before.origin); assert.equal(actual.pathname, before.pathname);
    assert.equal(actual.searchParams.get('u'), before.searchParams.get('u'));
    assert.notEqual(actual.searchParams.get('md5'), before.searchParams.get('md5'));
    assert.ok(Number(actual.searchParams.get('expires')) * 1000 > Date.now() + 60_000);
    assert.ok(requested[0].at - countdownStarted >= 4000, 'the site countdown still precedes the download');

    await page.goto(gate(original.replace('S02E07', 'S02E99'), { itemId: 'tt31510819' }), { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.getByRole('heading', { name: 'این لینک موقت منقضی شده است', exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'انتخاب نسخه یا منبع دیگر', exact: true }).getAttribute('href'), '/tt31510819#downloads');
    await page.screenshot({ path: '.media-cache/signed-download-tests/unavailable-390.png' });
    assert.equal(requested.length, 1, 'unavailable files do not redirect to the old token or a different episode');

    const api = await page.request.get(`${process.env.DOWNLOAD_TEST_ORIGIN}/api/downloads/tt31510819?season=2`, { timeout: 60000 });
    assert.equal(api.status(), 200);
    assert.match(api.headers()['cache-control'], /stale-while-revalidate=0/);
    const files = (await api.json()).episodes.flatMap(episode => episode.files);
    assert.ok(files.some(file => new URL(file.url).pathname === before.pathname));
    console.log(JSON.stringify({ recoveredExactFile: true, countdownMs: requested[0].at - countdownStarted, signedCachePolicy: api.headers()['cache-control'] }));
  } finally { await browser.close(); }
});
