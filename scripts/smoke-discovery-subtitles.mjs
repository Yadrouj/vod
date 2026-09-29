import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const origin = process.env.LOAD_BASE_URL || 'http://localhost:3004';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Use a local server only');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir('.media-cache/discovery-subtitles', { recursive: true });
const wav = Buffer.alloc(44 + 180 * 8000 * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' });
await context.addCookies([{ name: 'vod_locale', value: 'fa', url: origin }]);
const requests = [], errors = [];
let failedUrl = '';
await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.pathname === '/api/suggest') {
    requests.push(url.searchParams.get('type'));
    const series = { imdbCode: 'tt0412142', title: 'House', type: 'series', year: 2004, imdbRating: 8.7, posterUrl: null };
    const movie = { ...series, imdbCode: 'tt4513678', title: 'The House', type: 'movie', imdbRating: 6.2 };
    return route.fulfill({ json: { items: url.searchParams.get('type') === 'movie' ? [movie] : url.searchParams.get('type') === 'series' ? [series] : [series, movie], corrections: ['house'] } });
  }
  if (url.pathname === '/api/music/search') return route.fulfill({ json: { items: [{ imdbCode: 'music-test', title: 'House song', type: 'Track', year: null, imdbRating: null, posterUrl: null }] } });
  if (url.pathname.startsWith('/api/subtitles/')) {
    if (url.pathname === '/api/subtitles/track') return route.fulfill({ contentType: 'text/vtt', body: 'WEBVTT\n\n00:00.000 --> 00:15.000\nزیرنویس آزمایشی\n' });
    return route.fulfill({ json: { items: ['Farsi/Persian', 'English'].map((language, index) => ({ detailUrl: `https://example.test/sub/${index}`, trackUrl: `/api/subtitles/track?fixture=${index}`, title: 'Fixture', language, releases: ['1080p.WEB-DL.test.release'], author: 'Fixture', rating: 'good' })) } });
  }
  if (route.request().resourceType() === 'media') {
    if (route.request().url() === failedUrl) return route.fulfill({ status: 403, body: 'Source unavailable' });
    const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range || '');
    const start = Number(range?.[1] || 0), end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
    return route.fulfill({ status: range ? 206 : 200, contentType: 'audio/wav', body: wav.subarray(start, end + 1), headers: { 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}) } });
  }
  if (url.origin !== new URL(origin).origin) return route.abort();
  return route.continue();
});
const page = await context.newPage(); page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.message));
const dialog = page.locator('dialog[data-responsive-dialog][open]');
async function fit(width, height) {
  await page.setViewportSize({ width, height });
  await page.waitForFunction(({ width }) => Math.abs(document.querySelector('dialog[open]').getBoundingClientRect().width - (width <= 760 ? width : Math.min(600, width - 40))) < 2, { width });
  const sizes = await dialog.evaluate(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: innerWidth, height: innerHeight, overflow: el.children[1].scrollWidth - el.children[1].clientWidth }; });
  assert.ok(sizes.left >= -1 && sizes.right <= sizes.width + 1 && sizes.top >= -1 && sizes.bottom <= sizes.height + 1, JSON.stringify(sizes));
  assert.ok(sizes.overflow <= 1, `No horizontal panel overflow ${JSON.stringify(sizes)}`);
}
async function close() { await dialog.locator(':scope > header button').click(); await dialog.waitFor({ state: 'detached' }); }
try {
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const trigger = page.locator('.gradient-menu button[aria-label="جستجو"]');
  await trigger.evaluate(button => new Promise(resolve => {
    const ready = () => Object.keys(button).some(key => key.startsWith('__reactProps$') && typeof button[key]?.onClick === 'function') ? requestAnimationFrame(() => requestAnimationFrame(resolve)) : setTimeout(ready, 40);
    ready();
  }));
  await trigger.click(); await dialog.waitFor();
  assert.equal(await dialog.locator('input[role=combobox]').evaluate(input => input === document.activeElement), true);
  await dialog.getByRole('combobox').fill('hoise');
  await dialog.locator('.suggest-item').filter({ hasText: 'House song' }).waitFor();
  assert.equal(await dialog.locator('.suggest-item').first().textContent().then(text => text.includes('House')), true);
  for (const [label, type] of [['فیلم', 'movie'], ['سریال', 'series'], ['موسیقی', 'music']]) {
    await dialog.getByRole('button', { name: label, exact: true }).click();
    assert.equal(await dialog.getByRole('combobox').inputValue(), 'hoise', 'Query survives category changes');
    await dialog.locator('.suggest-item').first().waitFor();
    if (type !== 'music') assert.ok(requests.includes(type), `${type} is sent to the API`);
    else assert.equal(await dialog.locator('.suggest-item').first().getAttribute('href'), '/music/music-test');
  }
  for (const [w, h] of [[320,568], [390,844], [1440,1000]]) { await fit(w,h); await page.screenshot({ path: `.media-cache/discovery-subtitles/search-${w}.png` }); }
  await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
  assert.equal(await trigger.evaluate(el => el === document.activeElement), true, 'Focus returns to the search icon');
  console.log('PASS discovery: category filters, preserved query, music URL, mobile/desktop bounds, Escape and focus');
  await page.goto(`${origin}/watch/tt0903747`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => document.querySelector('video.player')?.duration === 180);
  await page.locator('[data-player-controls]').getByRole('button', { name: 'زیرنویس (c)', exact: true }).click();
  await dialog.locator('[data-state=ready]').waitFor();
  const activeChoice = dialog.locator('[data-subtitle-panel] button[aria-pressed=true]').filter({ hasText: 'فارسی' });
  assert.equal(await activeChoice.count(), 1, 'Auto-loaded subtitle is marked active');
  await dialog.getByRole('button', { name: 'هماهنگی', exact: true }).click();
  await dialog.getByRole('button', { name: /دیرتر/ }).click();
  await page.waitForFunction(() => [...document.querySelector('video.player').textTracks].find(t => t.mode === 'showing')?.cues?.[0]?.startTime === .5);
  await dialog.getByRole('button', { name: /بازگشت به زمان اصلی/ }).click();
  await page.waitForFunction(() => [...document.querySelector('video.player').textTracks].find(t => t.mode === 'showing')?.cues?.[0]?.startTime === 0);
  await dialog.getByRole('button', { name: 'ظاهر', exact: true }).click();
  await dialog.getByRole('slider', { name: /اندازه/ }).fill('150');
  await dialog.getByRole('slider', { name: /وضوح/ }).fill('70');
  await dialog.getByRole('slider', { name: /تیرگی/ }).fill('25');
  await dialog.locator('input[type=color]').first().fill('#ffcc00');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('sarvnema-subtitle-appearance')).size === 150);
  await page.waitForFunction(() => [...document.querySelectorAll('style')].some(el => el.textContent.includes('#ffcc00b3')));
  for (const [w,h] of [[320,568],[390,844],[844,390],[1440,1000]]) {
    await page.setViewportSize({ width:w,height:h });
    // Coarse pointers also get a full screen panel in landscape.
    const result = await dialog.evaluate(el => ({ overflow: el.children[1].scrollWidth - el.children[1].clientWidth }));
    assert.ok(result.overflow <= 1);
    await page.screenshot({ path: `.media-cache/discovery-subtitles/subtitles-${w}.png` });
  }
  await close();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('video.player')?.duration === 180 && document.querySelector('[data-player-frame]'));
  await page.locator('[data-player-controls]').getByRole('button', { name: 'زیرنویس (c)', exact: true }).click();
  await dialog.getByRole('button', { name: 'ظاهر', exact: true }).click();
  assert.equal(await dialog.getByRole('slider', { name: /اندازه/ }).inputValue(), '150', 'Style survives reload');
  assert.ok(await page.locator('video.player').getAttribute('data-subtitle-style'), 'Native video receives its appearance after being replaced');
  await close();
  console.log('PASS subtitles: actual active track, reversible cue sync, persisted size/color/text opacity/background, no horizontal overflow');
  failedUrl = await page.locator('video.player').getAttribute('src');
  await page.locator('video.player').evaluate(video => video.load());
  await page.locator('.playback-help').waitFor();
  await page.locator('[data-player-controls]').getByRole('button', { name: 'تنظیمات', exact: true }).click();
  await page.locator('[data-player-settings]').getByRole('button', { name: /کیفیت و منبع/ }).click();
  await page.locator('[data-player-settings] button[aria-pressed=false]').first().click();
  await page.waitForFunction(url => { const v = document.querySelector('video.player'); return v?.getAttribute('src') !== url && v?.duration === 180 && !v?.paused; }, failedUrl);
  assert.equal(await page.locator('.playback-help').count(), 0, 'Source failure clears without reloading');
  console.log('PASS source failure → source switch → playable media, without a page reload');
  assert.deepEqual(errors, []);
} catch(error) { await page.screenshot({ path: '.media-cache/discovery-subtitles/failure.png' }); throw error; }
finally { await browser.close(); }
