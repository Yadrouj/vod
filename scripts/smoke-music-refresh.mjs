import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const origin = process.env.LOAD_BASE_URL || "http://localhost:3006";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const catalog = JSON.parse(await readFile("public/data/music-artists.json", "utf8"));
const artist = catalog.artists.find(a => (a.trackCount || a.trackIds.length) > 60 && a.name === "مهستی") || catalog.artists.find(a => a.trackIds.length > 60);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  // A deterministic PCM stream validates browser playback independently of source geo-blocking.
  const sampleRate = 8000, samples = sampleRate * 60;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(samples * 2, 40);
  await page.route("**/api/music/media?**", route => route.fulfill({ contentType: "audio/wav", body: wav }));
  await page.goto(origin + "/music", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.locator(".music-landing-hero").waitFor();
  await page.goto(origin + "/music/artists/" + encodeURIComponent(artist.slug), { waitUntil: "domcontentloaded" });
  await page.locator(".artist-track-list button").first().waitFor();
  assert.ok(await page.locator(".artist-track-list li").count() <= 50);
  await page.screenshot({ path: ".media-cache/artist-redesign.png" });
  await page.locator(".artist-track-list button").first().click();
  const audio = page.locator("[data-music-dock] audio");
  await audio.waitFor({ state: "attached" });
  await page.waitForFunction(() => document.querySelector("[data-music-dock] audio")?.currentTime > .2);
  await audio.evaluate(el => { el.dataset.instance = "same-media"; });
  await page.locator(".music-back").click();
  await page.waitForURL("**/music");
  assert.equal(await audio.getAttribute("data-instance"), "same-media");
  assert.equal(await audio.evaluate(el => el.paused), false);
  const firstSource = await audio.getAttribute("src");
  await audio.evaluate(el => el.dispatchEvent(new Event("ended")));
  await page.waitForFunction(previous => {
    const el = document.querySelector("[data-music-dock] audio");
    return el && el.getAttribute("src") !== previous && !el.paused;
  }, firstSource);
  await page.goBack();
  await page.locator(".artist-track-list button").first().waitFor();
  assert.equal(await audio.getAttribute("data-instance"), "same-media");
  assert.equal(await audio.evaluate(el => el.paused), false);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 850 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `artist overflow at ${width}`);
  }
  await page.getByRole("button", { name: "کوچک کردن پلیر", exact: true }).click();
  await page.screenshot({ path: ".media-cache/music-dock-mobile.png" });
  await page.getByRole("button", { name: "بستن و قطع موسیقی" }).click();
  assert.equal(await audio.count(), 0);
  await page.goto(origin + "/music");
  const search = page.getByRole("combobox").first();
  await search.fill(artist.name);
  await page.locator(".suggest-type-heading").filter({ hasText: "خواننده‌ها" }).waitFor();
  await page.locator(".suggest-type-heading").filter({ hasText: "آثار" }).waitFor();
  assert.ok((await page.locator('.suggest-item').first().getAttribute('href')).startsWith('/music/artists/'));
  await search.press("Escape");
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: ".media-cache/music-home-mobile.png" });
  assert.deepEqual(errors, []);
  console.log("PASS music: persistent media across navigation/back, close, artist window, mobile overflow and grouped search");
} finally { await browser.close(); }
