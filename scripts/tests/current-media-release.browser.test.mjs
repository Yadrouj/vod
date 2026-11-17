import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

test('fresh films, series, songs and artist profiles resolve in real production routes and searches', {
  skip: !process.env.MEDIA_REFRESH_TEST_ORIGIN || !process.env.PLAYWRIGHT_MODULE, timeout: 180000,
}, async () => {
  const origin = process.env.MEDIA_REFRESH_TEST_ORIGIN;
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname));
  const video = JSON.parse(await readFile('lib/data/media-refresh-2026-11-17-vod.json','utf8'));
  const music = JSON.parse(await readFile('lib/data/media-refresh-2026-11-17-music.json','utf8'));
  const freshVideo = video.items.filter(item => video.newTitleIds.includes(item.imdbCode || item.id));
  // A distinctive title exercises discovery without assuming an unrated new
  // release should outrank every older namesake in the IMDb-first dropdown.
  const film = freshVideo.find(item => !/series/i.test(item.type) && (item.originalTitle||item.title).split(/\s+/).length >= 4);
  const series = freshVideo.find(item => /series/i.test(item.type));
  const track = music.tracks.find(item => music.newTrackIds.includes(item.id) && item.title.length > 8);
  assert.ok(film && series && track);
  const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const context = await browser.newContext({ serviceWorkers:'block', viewport:{ width:390, height:844 } });
  const errors = [];
  try {
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.origin === origin && !url.pathname.startsWith('/api/music/media')
        ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await mkdir('.media-cache/refresh-2026-11-17/qa',{recursive:true});
    for(const [name,pathname] of [['film',`/${film.imdbCode||film.id}`],['series',`/${series.imdbCode||series.id}`],['music',`/music/${track.id}`],['artist',`/music/artists/${encodeURIComponent(track.artists[0].slug)}`]]) {
      const response = await page.goto(origin+pathname,{waitUntil:'domcontentloaded',timeout:90000});
      assert.equal(response.status(),200,pathname);
      await page.locator('h1:visible').first().waitFor();
      assert.ok(!(await page.content()).includes('NEXT_HTTP_ERROR_FALLBACK;404'),pathname);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name} fits mobile`);
      await page.screenshot({path:`.media-cache/refresh-2026-11-17/qa/${name}-mobile.png`});
    }
    const result = await fetch(`${origin}/api/music/search?${new URLSearchParams({q:track.title,limit:'20'})}`).then(r=>r.json());
    assert.ok(result.items.some(item=>item.imdbCode===track.id),'new music appears in canonical search');
    const films = await fetch(`${origin}/api/suggest?${new URLSearchParams({q:film.originalTitle||film.title,limit:'20'})}`).then(r=>r.json());
    assert.ok(films.items.some(item=>item.imdbCode===(film.imdbCode||film.id)),'new film appears in title search');
    const allIds = music.newTrackIds.slice(0,80);
    const details = await fetch(`${origin}/api/music/tracks?${new URLSearchParams({ids:allIds.join(',')})}`).then(r=>r.json());
    assert.equal(details.tracks.length,allIds.length,'every new music ID resolves in the full library');
    await page.setViewportSize({width:1440,height:960});
    assert.equal((await page.goto(origin,{waitUntil:'domcontentloaded',timeout:90000})).status(),200);
    const news=JSON.parse(await readFile('public/data/vod-news.json','utf8'));
    const headline=news.history.find(batch=>batch.day==='2026-11-17').items[0];
    await page.getByText(headline.title,{exact:true}).first().waitFor();
    await page.screenshot({path:'.media-cache/refresh-2026-11-17/qa/home-desktop.png',fullPage:true});
    assert.deepEqual(errors,[],'no browser JavaScript errors on updated routes');
  } finally { await browser.close(); }
});
