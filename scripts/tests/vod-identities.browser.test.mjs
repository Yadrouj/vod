import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

test('legacy title and watch pages navigate to canonical East of Eden, preserving episode selection', { skip: !process.env.VOD_TEST_ORIGIN || !process.env.PLAYWRIGHT_MODULE, timeout: 180000 }, async () => {
  const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  try {
    // This is a navigation/identity test, not a bulk movie download.
    await page.route('**/*', route => route.request().resourceType() === 'media' ? route.abort() : route.continue());
    await page.goto(`${process.env.VOD_TEST_ORIGIN}/familymovie-0c050ee1689bd331`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForURL('**/f2my-east-of-eden', { timeout: 60000 });
    await page.locator('#title-heading').waitFor();
    assert.equal(await page.locator('#title-heading').innerText(), 'شرق بهشت');
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://sarvnema.ir/f2my-east-of-eden');
    assert.ok(await page.getByRole('link', { name: /پخش آنلاین/ }).count());
    await mkdir('.media-cache/vod-identity-tests', { recursive: true });
    await page.screenshot({ path: '.media-cache/vod-identity-tests/east-of-eden-390.png', caret: 'initial' });
    await page.goto(`${process.env.VOD_TEST_ORIGIN}/watch/familymovie-0c050ee1689bd331?season=1&episode=2&quality=720p`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForURL('**/watch/f2my-east-of-eden?*', { timeout: 60000 });
    const redirected = new URL(page.url());
    assert.equal(redirected.searchParams.get('season'), '1');
    assert.equal(redirected.searchParams.get('episode'), '2');
    assert.equal(redirected.searchParams.get('quality'), '720p');
    await page.goto(`${process.env.VOD_TEST_ORIGIN}/tt0048028`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.locator('#title-heading').waitFor();
    assert.equal(new URL(page.url()).pathname, '/tt0048028');
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://sarvnema.ir/tt0048028');
  } finally { await browser.close(); }
});
