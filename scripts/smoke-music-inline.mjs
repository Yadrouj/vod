import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const origin = process.env.LOAD_BASE_URL || "http://localhost:3004";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const catalog = JSON.parse(await readFile("public/data/music-landing.json", "utf8"));
const track = catalog.tracks.find(item => item.kind === "track" && item.sources.some(source => /\.mp3(?:$|\?)/.test(source.url)));
const video = catalog.tracks.find(item => item.kind === "video" && item.sources.length);
assert.ok(track && video, "Need one audio and one video catalog entry");
await mkdir(".media-cache", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  // Original silent PCM fixture: exercise actual browser media without relying
  // on the external hosts or downloading copyrighted audio/video.
  const wav = Buffer.alloc(44 + 8000 * 120 * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(wav.length - 44, 40);
  await page.route("**/api/music/media?**", route => {
    const range = route.request().headers().range?.match(/bytes=(\d+)-(\d*)/);
    const start = Number(range?.[1] || 0), end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
    return route.fulfill({ status: range ? 206 : 200, contentType: "audio/wav", headers: { "Accept-Ranges": "bytes", ...(range ? { "Content-Range": `bytes ${start}-${end}/${wav.length}` } : {}) }, body: wav.subarray(start, end + 1) });
  });
  const host = page.locator("[data-music-player-host]");
  const media = host.locator("audio,video");
  for (const item of [track, video]) {
    console.log(`Checking ${item.kind}: ${item.id}`);
    await page.goto(`${origin}/music/${item.id}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.locator("[data-music-inline] .music-play-toggle").waitFor();
    assert.equal(await page.locator("[data-music-dock]:visible").count(), 0, "No popup on the track page");
    assert.equal(await media.count(), 1, "Only one media element");
    assert.equal(await media.evaluate(el => el.paused), true, "Visiting a track must not autoplay");
    await host.locator(".music-play-toggle").click();
    await page.waitForFunction(() => document.querySelector("[data-music-player-host] audio, [data-music-player-host] video")?.currentTime > .2);
    await media.evaluate(el => {
      el.dataset.instance = "persistent";
      el.dataset.interruptions = "0";
      for (const event of ["pause", "emptied"]) el.addEventListener(event, () => el.dataset.interruptions = String(Number(el.dataset.interruptions) + 1));
    });
    await host.locator(".music-player-together button").click();
    const room = page.locator(".watch-builder[role=dialog]");
    await room.waitFor();
    assert.ok((await room.locator(".watch-builder-selected").innerText()).includes(item.persianTitle || item.title));
    await page.keyboard.press("Escape");
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForFunction(() => {
        const slot = document.querySelector("[data-music-slot]").getBoundingClientRect();
        const host = document.querySelector("[data-music-inline]").getBoundingClientRect();
        return Math.abs(slot.x - host.x) < 2 && Math.abs(slot.width - host.width) < 2 && Math.abs(slot.height - host.height) < 2;
      });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `No page overflow at ${width}`);
      assert.ok(await host.evaluate(el => el.scrollWidth <= el.clientWidth + 1), `No player overflow at ${width}`);
      if (width === 1440 || width === 390) await page.screenshot({ path: `.media-cache/music-inline-${item.kind}-${width}.png` });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    const before = await media.evaluate(el => el.currentTime);
    await page.locator(".music-back").click();
    await page.waitForURL("**/music");
    await page.locator("[data-music-dock]:visible").waitFor();
    assert.equal(await media.getAttribute("data-instance"), "persistent");
    assert.equal(await media.evaluate(el => el.paused), false);
    assert.ok(await media.evaluate(el => el.currentTime) >= before);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.screenshot({ path: `.media-cache/music-mini-${item.kind}-${width}.png` });
      assert.ok(await host.evaluate(el => el.scrollWidth <= el.clientWidth + 1), `Mini player has no horizontal overflow at ${width}`);
      const bounds = await host.boundingBox();
      const toggle = await host.locator('.music-play-toggle').boundingBox();
      assert.ok(toggle && toggle.x >= bounds.x && toggle.x + toggle.width <= bounds.x + bounds.width + 1, 'Mini play button stays inside its box');
      assert.ok(toggle.y >= bounds.y && toggle.y + toggle.height <= bounds.y + bounds.height + 1, 'Mini play button remains visible');
      if (item.kind === 'video') {
        const stage = await host.locator('.music-player-video-stage').boundingBox();
        assert.ok(stage && stage.width > 200 && stage.height > 100, 'Mini video remains visible');
        assert.ok(Math.abs(stage.width / stage.height - 16 / 9) < .02, 'Mini video retains 16:9 aspect ratio');
        assert.ok(bounds.height < 360, 'Video dock stays compact');
      } else assert.ok(bounds.height < 170, 'Audio dock stays compact');
      assert.equal(await media.getAttribute('data-interruptions'), '0');
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goBack();
    await page.locator("[data-music-inline]").waitFor();
    assert.equal(await page.locator("[data-music-dock]:visible").count(), 0);
    assert.equal(await media.getAttribute("data-instance"), "persistent");
    assert.equal(await media.evaluate(el => el.paused), false);
    assert.equal(await media.getAttribute("data-interruptions"), "0", "Navigation must never pause or reload media");
    await host.getByRole("button", { name: "نمای تمام‌صفحهٔ موسیقی و متن" }).click();
    await page.waitForFunction(() => document.querySelector("[data-music-player-host]")?.matches(":modal"));
    assert.equal(await media.getAttribute("data-instance"), "persistent");
    await page.keyboard.press("Escape");
    await page.locator("[data-music-inline]").waitFor();
    assert.equal(await media.evaluate(el => el.paused), false);
    await page.locator(".music-back").click();
    await page.waitForURL("**/music");
    await host.getByRole("button", { name: "بستن و قطع موسیقی" }).click();
    assert.equal(await media.count(), 0);
    console.log(`PASS ${item.kind}: inline, matching room, responsive, uninterrupted back/return, fullscreen, close`);
  }
  // Reproduce the reported path with actual browser Back/Forward, not just the
  // in-page return link. This must keep the original video node and playback.
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto(`${origin}/music?kind=video`, { waitUntil: 'domcontentloaded' });
  const videoLink = `a[href="/music/${video.id}"]`;
  await page.waitForFunction(selector => {
    const link = document.querySelector(selector);
    return link && Object.keys(link).some(key => key.startsWith('__reactProps$') && typeof link[key]?.onClick === 'function');
  }, videoLink);
  await page.locator(videoLink).first().click();
  await page.waitForURL(`**/music/${video.id}`, { waitUntil: 'domcontentloaded' });
  await host.locator('.music-play-toggle').click();
  await page.waitForFunction(() => document.querySelector('[data-music-player-host] video')?.currentTime > .2);
  await media.evaluate(el => {
    el.dataset.instance = 'browser-history';
    el.dataset.interruptions = '0';
    for (const event of ['pause', 'emptied']) el.addEventListener(event, () => el.dataset.interruptions = String(Number(el.dataset.interruptions) + 1));
  });
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-music-dock] .music-player-video-stage').waitFor();
  assert.equal(await media.getAttribute('data-instance'), 'browser-history');
  assert.equal(await media.evaluate(el => el.paused), false);
  await page.goForward({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-music-inline]').waitFor();
  assert.equal(await media.getAttribute('data-instance'), 'browser-history');
  assert.equal(await media.getAttribute('data-interruptions'), '0');
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await host.getByRole('button', { name: 'بستن و قطع موسیقی' }).click();
  console.log('PASS browser Back/Forward: visible mini video and uninterrupted original media');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${origin}/music/${track.id}`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-music-inline] .music-play-toggle").waitFor();
  await page.locator(".music-back").click();
  await page.waitForURL("**/music");
  assert.equal(await page.locator("[data-music-dock]:visible").count(), 0, "An unplayed preview must not become a popup");
  await page.goto(`${origin}/music/${track.id}`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-music-inline] .music-play-toggle").click();
  await page.waitForFunction(() => document.querySelector("[data-music-player-host] audio")?.currentTime > .2);
  const originalSource = await media.getAttribute("src");
  const related = page.locator('main section').last().locator('a').first();
  const relatedHref = await related.getAttribute('href');
  await related.click();
  await page.waitForURL(url => url.pathname === relatedHref);
  assert.equal(await media.getAttribute("src"), originalSource, "Browsing another track must not replace playback");
  assert.equal(await media.evaluate(el => el.paused), false);
  assert.ok(await page.locator("[data-music-dock]").isVisible());
  const directPlay = page.locator("[data-music-slot] button:visible");
  assert.equal((await directPlay.innerText()).trim(), '', 'The initial play control is an icon, not another text CTA');
  assert.ok(await directPlay.getAttribute('aria-label'), 'Icon-only play has an accessible name');
  await directPlay.click();
  await page.locator("[data-music-inline]").waitFor();
  await page.waitForFunction(source => {
    const el = document.querySelector("[data-music-player-host] audio, [data-music-player-host] video");
    return el?.getAttribute("src") !== source && !el.paused && el.currentTime > .1;
  }, originalSource);
  await host.getByRole("button", { name: "Listening queue", exact: true }).click();
  await host.locator('.music-player-queue').waitFor();
  const queueButtons = host.locator('.music-player-queue li button');
  if (await queueButtons.count() > 1) {
    const nextTitle = await queueButtons.nth(1).locator('strong').innerText();
    await queueButtons.nth(1).click();
    await page.waitForFunction(() => document.querySelector("[data-music-player-host] audio, [data-music-player-host] video")?.currentTime > .1);
    await host.locator('.music-player-together button').click();
    await page.locator('.watch-builder[role=dialog]').waitFor();
    assert.ok((await page.locator('.watch-builder-selected').innerText()).includes(nextTitle), "Room follows the queue selection");
    await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors, []);
  console.log("PASS idle browsing, explicit track changes, queue/room selection; no browser errors");
} finally { await browser.close(); }
