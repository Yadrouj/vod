import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const origin = process.env.LOAD_BASE_URL || "http://127.0.0.1:3006";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Local target only");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
await mkdir(".media-cache", { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", serviceWorkers: "block" });
  await context.addCookies([{ name: "vod_locale", value: "fa", url: origin }]);
  const page = await context.newPage();
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.addInitScript(() => {
    window.voiceStarts = 0; window.voiceAborts = 0; window.voiceMode = "result";
    window.SpeechRecognition = class {
      start() {
        window.voiceStarts++; window.voiceLanguage = this.lang;
        queueMicrotask(() => {
          if (window.voiceMode === "denied") return this.onerror?.({ error: "not-allowed" });
          this.onstart?.(); this.onresult?.({ results: [[{ transcript: "Breaking Bad" }]] });
        });
      }
      stop() { this.onend?.(); }
      abort() { window.voiceAborts++; }
    };
  });
  await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 90000 });
  const nav = page.locator(".app-mobile-nav");
  await nav.waitFor();
  for (const width of [320, 390, 600, 760]) {
    await page.setViewportSize({ width, height: 844 });
    const box = await nav.boundingBox();
    assert.ok(box && box.y > 730 && box.y + box.height <= 844);
    assert.equal(await nav.locator(":scope > *").count(), 5);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Home overflow: ${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const country = page.locator(".country-discovery select");
  await country.selectOption("IR");
  await page.locator("#country-film-rail a").first().waitFor({ timeout: 20000 });
  assert.ok(await page.locator("#country-film-rail a").count() <= 12);
  const data = await page.request.get(origin + "/api/discovery-country?country=US");
  assert.match(data.headers()["cache-control"], /private.*no-store/);
  const json = await data.json(); assert.equal(json.country, "US"); assert.ok(!("ip" in json));
  assert.equal((await page.request.get(origin + "/api/discovery-country?country=invalid")).status(), 400);
  await country.selectOption("off");
  assert.equal(await page.locator("#country-film-rail").count(), 0);
  await page.reload(); await country.waitFor(); await page.waitForFunction(() => document.querySelector(".country-discovery select")?.value === "off");

  await nav.locator(".app-nav-search").click();
  const search = page.locator(".app-search-dialog:not(.app-library-dialog)"); await search.waitFor();
  await search.getByRole("button", { name: "جستجوی صوتی", exact: true }).click();
  const voice = page.locator(".voice-dialog"); await voice.waitFor();
  assert.equal(await page.evaluate(() => window.voiceStarts), 0, "Never record on opening");
  await voice.getByRole("button", { name: "شروع گفتار", exact: true }).click();
  await voice.locator(".voice-transcript").getByText("Breaking Bad").waitFor();
  assert.equal(await page.evaluate(() => window.voiceLanguage), "fa-IR");
  assert.equal(await voice.locator(".voice-wave i").first().evaluate(el => getComputedStyle(el).animationName), "none");
  await voice.getByRole("button", { name: "جستجوی این عبارت", exact: true }).click();
  assert.equal(await search.locator("input.search").inputValue(), "Breaking Bad");
  await search.locator(".suggest-item").first().waitFor();
  assert.ok(await page.evaluate(() => window.voiceAborts > 0));
  // Clear/microphone controls stay inside the search field.
  const field = await search.locator(".suggest-input-shell").boundingBox();
  for (const selector of [".suggest-voice", ".suggest-clear"]) {
    await search.locator(selector).waitFor();
    const box = await search.locator(selector).boundingBox();
    assert.ok(box.x >= field.x && box.x + box.width <= field.x + field.width + 1);
  }
  await page.evaluate(() => { window.voiceMode = "denied"; });
  await search.locator(".suggest-voice").click(); await voice.getByRole("button", { name: "شروع گفتار", exact: true }).click();
  await voice.getByRole("alert").waitFor(); await page.keyboard.press("Escape");
  await page.evaluate(() => { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; });
  await search.locator(".suggest-voice").click(); await voice.getByRole("button", { name: "شروع گفتار", exact: true }).click();
  await voice.getByText("جستجوی صوتی در این مرورگر در دسترس نیست", { exact: false }).waitFor();
  await page.keyboard.press("Escape");
  await page.screenshot({ path: ".media-cache/mobile-search-app.png" });
  await page.keyboard.press("Escape");
  await nav.locator(".app-nav-library").click();
  await page.locator(".app-library-dialog").getByRole("button", { name: /دانلودها/ }).click();
  await page.getByRole("dialog", { name: "دانلودها", exact: true }).getByRole("button", { name: "آخرین نمایش‌ها", exact: true }).click();
  await page.getByRole("dialog", { name: "آخرین نمایش‌ها", exact: true }).waitFor(); await page.keyboard.press("Escape");

  await page.goto(origin + "/tt0903747");
  const dock = page.locator("[data-mobile-title] nav[aria-label='دسترسی سریع پخش و دانلود']"); await dock.waitFor();
  for (const width of [320, 390, 600, 760]) {
    await page.setViewportSize({ width, height: 844 });
    const bar = await dock.boundingBox(), bottom = await nav.boundingBox();
    assert.ok(bar && bar.y + bar.height <= bottom.y, `Playback/nav overlap: ${width}`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Detail overflow: ${width}`);
    assert.ok(await dock.getByRole("link", { name: "پخش آنلاین" }).isVisible());
    assert.ok(await dock.getByRole("button", { name: /تماشای همزمان/ }).isVisible());
  }
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: ".media-cache/mobile-detail-app.png" });
  // Both CTAs operate: room opens with preset; online takes the quality-picker route.
  await dock.getByRole("button", { name: /تماشای همزمان/ }).click();
  await page.locator(".watch-builder[role=dialog]").waitFor();
  await page.keyboard.press("Escape");
  await dock.getByRole("link", { name: "پخش آنلاین" }).click();
  await page.waitForURL(origin + "/watch/tt0903747");
  await page.locator(".pro-player").waitFor();
  assert.equal(await page.locator(".pro-player").getAttribute("dir"), "ltr");
  assert.equal(await page.locator(".player-timeline").evaluate(el => getComputedStyle(el).direction), "ltr");
  await page.goto(origin + "/music");
  await nav.locator(".app-nav-library").click();
  await page.locator(".app-library-dialog").getByRole("link", { name: /خواننده‌ها/ }).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await nav.getAttribute("data-theme"), "music");
  await nav.locator(".app-nav-search").click();
  assert.equal(await search.getAttribute("data-theme"), "music");
  await search.locator("input.search").fill("ebi"); await search.locator(".suggest-item").first().waitFor();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 900 }); assert.equal(await nav.isVisible(), false);
  assert.deepEqual(errors, []);
  await context.close();

  // Real service worker registration + offline navigation (no request interception).
  const pwa = await browser.newContext(); const offlinePage = await pwa.newPage();
  await offlinePage.goto(origin + "/music");
  await offlinePage.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 30000 });
  const manifest = await (await offlinePage.request.get(origin + "/manifest.webmanifest")).json();
  assert.equal(manifest.display, "standalone");
  for (const size of [192, 512]) {
    const icon = await offlinePage.request.get(origin + "/app-icon/" + size);
    assert.equal(icon.status(), 200); assert.match(icon.headers()["content-type"], /image\/png/);
    const bytes = await icon.body(); assert.equal(bytes.readUInt32BE(16), size); assert.equal(bytes.readUInt32BE(20), size);
  }
  await pwa.setOffline(true); await offlinePage.goto(origin + "/browse");
  await offlinePage.getByRole("heading", { name: "هنوز همین‌جاییم" }).waitFor();
  await pwa.setOffline(false); await offlinePage.getByRole("button", { name: "دوباره تلاش کن" }).click();
  await offlinePage.locator(".app-mobile-nav").waitFor({ state: "attached" });
  await pwa.close();
  console.log("PASS mobile: 320–760px, nav/CTAs, country privacy, voice mocked success/denial/unsupported, reduced motion, real PWA offline/reconnect/icons");
} finally { await browser.close(); }
