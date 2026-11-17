import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { zipSync, strToU8 } from 'fflate';

test('subtitle picker prioritizes embedded fa/en, targets the playing episode, imports files and fits mobile', {
  skip: !process.env.SUBTITLE_TEST_ORIGIN || !process.env.PLAYWRIGHT_MODULE, timeout: 180000,
}, async () => {
  const origin = process.env.SUBTITLE_TEST_ORIGIN;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
  const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  await context.addCookies([{ name: 'vod_locale', value: 'fa', url: origin }]);
  const requests = [], errors = [];
  const wav = Buffer.alloc(44 + 30 * 8000 * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/subtitles/track') return route.fulfill({ contentType: 'text/vtt', body: 'WEBVTT\n\n00:00.000 --> 00:25.000\nزیرنویس آنلاین آزمایشی\n' });
    if (url.pathname.startsWith('/api/subtitles/')) {
      requests.push({ path: url.pathname, season: url.searchParams.get('season'), episode: url.searchParams.get('episode') });
      return route.fulfill({ json: { items: ['Farsi/Persian', 'English', 'French'].map((language, i) => ({ detailUrl: `https://subzone.ir/subtitles/fixture/${i}`, trackUrl: `/api/subtitles/track?fixture=${i}&season=${url.searchParams.get('season')}&episode=${url.searchParams.get('episode')}`, title: 'Breaking Bad - First Season', language, releases: ['Breaking.Bad.S01E02.720p.WEB'], rating: 'good', author: null })) } });
    }
    if (route.request().resourceType() === 'media') {
      const start = Number(/bytes=(\d+)/.exec(route.request().headers().range || '')?.[1] || 0);
      return route.fulfill({ status: start ? 206 : 200, contentType: 'audio/wav', body: wav.subarray(start), headers: { 'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes', ...(start ? { 'Content-Range': `bytes ${start}-${wav.length - 1}/${wav.length}` } : {}) } });
    }
    if (url.origin !== origin) return route.abort();
    return route.continue();
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  const dialog = page.locator('dialog[open][data-responsive-dialog]:visible');
  const showing = () => page.evaluate(() => [...document.querySelector('video.player').textTracks].filter(track => track.mode === 'showing').map(track => track.language));
  try {
    await page.goto(`${origin}/watch/tt0903747?season=1&episode=1`, { waitUntil: 'commit', timeout: 90000 });
    await page.waitForFunction(() => document.querySelector('video.player')?.readyState >= 1);
    await page.locator('video.player').evaluate(video => {
      for (const [label, language] of [['French', 'fr'], ['English', 'en'], ['فارسی', 'fa']]) { const track = video.addTextTrack('subtitles', label, language); track.addCue(new VTTCue(0, 25, 'Native fixture')); }
    });
    await page.waitForFunction(() => [...document.querySelector('video.player').textTracks].some(track => track.language === 'fa' && track.mode === 'showing'));
    assert.deepEqual(await showing(), ['fa']);
    assert.equal(requests.length, 0, 'Embedded tracks avoid a redundant online lookup before the menu opens');
    await page.locator('[data-player-controls]').getByRole('button', { name: 'زیرنویس (c)', exact: true }).click();
    await dialog.waitFor(); await dialog.locator('[data-state=ready]').waitFor();
    assert.equal(await dialog.getByRole('button', { name: /French/ }).count(), 0);
    await dialog.getByRole('group', { name: 'زبان زیرنویس', exact: true }).getByRole('button', { name: /انگلیسی/ }).click();
    await dialog.getByRole('button', { name: /انگلیسی · همراه همین فایل/ }).click();
    assert.deepEqual(await showing(), ['en']);
    await dialog.getByRole('switch').click(); assert.deepEqual(await showing(), []);
    await dialog.getByRole('switch').click(); assert.deepEqual(await showing(), ['en']);
    await page.keyboard.press('Escape');

    await page.goto(`${origin}/watch/tt0903747?season=1&episode=2`, { waitUntil: 'commit', timeout: 90000 });
    await page.waitForFunction(() => document.querySelector('video.player')?.readyState >= 1);
    await page.locator('[data-player-controls]').getByRole('button', { name: 'زیرنویس (c)', exact: true }).click();
    await dialog.getByRole('button', { name: /فارسی · Subzone/ }).waitFor();
    await dialog.getByRole('button', { name: /فارسی · Subzone/ }).click();
    await dialog.locator('[data-state=ready]').waitFor();
    assert.ok(requests.some(request => request.season === '1' && request.episode === '2'));
    assert.equal(await dialog.getByRole('button', { name: /French/ }).count(), 0);

    await dialog.getByRole('button', { name: 'افزودن زیرنویس', exact: true }).click();
    await dialog.getByRole('group', { name: 'زبان فایل شخصی' }).getByRole('button', { name: 'فارسی', exact: true }).click();
    const zip = zipSync({ 'Film.S01E01.fa.srt': strToU8('1\n00:00:00,000 --> 00:00:25,000\nقسمت اول\n'), 'Film.S01E02.fa.srt': strToU8('1\n00:00:00,000 --> 00:00:25,000\nقسمت دوم\n') });
    await dialog.locator('input[type=file]').setInputFiles({ name: 'season.zip', mimeType: 'application/zip', buffer: Buffer.from(zip) });
    await page.waitForFunction(() => [...document.querySelector('video.player').textTracks].some(track => track.mode === 'showing' && track.cues?.[0]?.text === 'قسمت دوم'));
    assert.equal(await dialog.getByRole('button', { name: /فارسی · فایل شما/ }).count(), 1);
    await mkdir('.media-cache/subtitle-cleanup', { recursive: true });
    for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1440, 1000]]) {
      await page.setViewportSize({ width, height });
      const bounds = await dialog.evaluate(element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: innerWidth, height: innerHeight, overflow: element.children[1].scrollWidth - element.children[1].clientWidth }; });
      assert.ok(bounds.left >= -1 && bounds.right <= bounds.width + 1 && bounds.top >= -1 && bounds.bottom <= bounds.height + 1, JSON.stringify(bounds));
      assert.ok(bounds.overflow <= 1, JSON.stringify(bounds));
      await page.screenshot({ path: `.media-cache/subtitle-cleanup/picker-${width}.png` });
    }
    await dialog.getByRole('button', { name: 'هماهنگی', exact: true }).click();
    await dialog.getByRole('button', { name: /دیرتر/ }).click();
    await page.waitForFunction(() => [...document.querySelector('video.player').textTracks].find(track => track.mode === 'showing')?.cues?.[0]?.startTime === .5);
    await dialog.getByRole('button', { name: 'ظاهر', exact: true }).click();
    await dialog.getByRole('slider', { name: /اندازه/ }).fill('125');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('sarvnema-subtitle-appearance')).size === 125);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
