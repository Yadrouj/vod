import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { io } from "socket.io-client";

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const origin = process.env.LOAD_BASE_URL || "http://127.0.0.1:3006";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Local target only");
const browser = await chromium.launch({ channel: "chrome", headless: true });
await mkdir(".media-cache", { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", serviceWorkers: "block" });
  await page.context().addCookies([{ name: "vod_locale", value: "fa", url: origin }]);
  const errors = [];
  const createdRooms = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  // Only catalogue transport is stubbed. Room creation and guest admission use the real socket server.
  for (const music of [false, true]) {
    const id = music ? "nav-fixture-track" : "tt0000001";
    const media = { itemId: id, title: music ? "Navigation test track" : "Navigation test film", posterUrl: null,
      mediaKind: music ? "audio" : "video", catalogue: music ? "music" : "vod", artistName: music ? "Test artist" : null,
      source: { url: `https://example.com/nav.${music ? "mp3" : "mp4"}`, label: "Test source", quality: music ? "320kbps" : "720p", origin: "catalogue" }, sources: [] };
    await page.route(`**/api/${music ? "music/search" : "suggest"}?q=navfixture`, route => route.fulfill({ json: { items: [{ title: media.title, imdbCode: id, year: 2026, type: music ? "track" : "movie", posterUrl: null, imdbRating: null }] } }));
    await page.route(`**/api/watch-party/${music ? "music" : "title"}/${id}`, route => route.fulfill({ json: media }));
  }

  const nav = page.locator(".app-mobile-nav");
  const library = page.locator(".app-library-dialog");
  const builder = page.locator(".watch-builder[role=dialog]");
  const roomButton = nav.locator(".watch-together-dock");
  await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 90000 });
  for (const music of [false, true]) {
    await nav.waitFor();
    await page.locator(music ? ".music-spotify-page h1" : ".film-spotify-page h1").first().waitFor();
    assert.equal(await nav.getAttribute("data-theme"), music ? "music" : "cinema");
    assert.match(await roomButton.innerText(), music ? /شنیدن همزمان/ : /تماشای همزمان/);
    assert.equal(await nav.evaluate(el => getComputedStyle(el).getPropertyValue("--app-accent").trim()), music ? "#a5edc2" : "#ebcf76");
    for (const width of [320, 390, 430, 760]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow ${width}`);
      const box = await nav.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width && box.y + box.height <= 844);
      assert.equal(await nav.locator(":scope > *").count(), 5);
      for (const control of await nav.locator(":scope > *").all()) {
        const rect = await control.boundingBox();
        assert.ok(rect.width >= 44 && rect.height >= 44, `Touch target ${width}`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `.media-cache/floating-nav-${music ? "music" : "cinema"}.png` });
    await nav.locator(".app-nav-library").click();
    await library.waitFor();
    assert.ok(await library.evaluate(el => el.matches(":modal")));
    assert.equal(await library.getAttribute("data-theme"), music ? "music" : "cinema");
    assert.equal(await library.locator(`a[href="${music ? "/music/artists" : "/browse"}"]`).count(), 1);
    await page.screenshot({ path: `.media-cache/floating-library-${music ? "music" : "cinema"}.png` });
    await page.keyboard.press("Escape");
    assert.ok(await nav.locator(".app-nav-library").evaluate(el => el === document.activeElement));

    await roomButton.click();
    await builder.waitFor();
    assert.equal(await builder.getAttribute("data-media-theme"), music ? "music" : "cinema");
    await page.waitForFunction(() => document.activeElement?.classList.contains("watch-builder-close"));
    await page.keyboard.press("Shift+Tab");
    assert.ok(await builder.locator(".watch-builder-actions button").last().evaluate(el => el === document.activeElement));
    await page.keyboard.press("Tab");
    assert.ok(await builder.locator(".watch-builder-close").evaluate(el => el === document.activeElement));
    await builder.locator(".watch-builder-search input").fill("navfixture");
    await builder.locator(".watch-builder-results button").first().click();
    if (await builder.locator(".watch-builder-profile-fields").count()) await builder.locator(".watch-builder-profile-fields input").first().fill("Navigation tester");
    await builder.locator(".watch-builder-actions .play-glow").click();
    const inviteInput = builder.locator(".watch-builder-link input");
    await inviteInput.waitFor({ timeout: 20000 });
    const invite = new URL(await inviteInput.inputValue());
    createdRooms.push({ url: invite.href, music });
    assert.equal(invite.origin, origin);
    const guest = io(origin, { transports: ["websocket"], forceNew: true });
    try {
      const result = await new Promise((resolve, reject) => {
        guest.timeout(10000).emit("room:join", { roomId: invite.pathname.split("/").at(-1), inviteToken: invite.searchParams.get("invite"), profile: { id: `nav-guest-${music}`, name: "Test guest", avatarUrl: null } }, (error, result) => error ? reject(error) : resolve(result));
      });
      assert.equal(result.ok, true, JSON.stringify(result));
    } finally { guest.disconnect(); }
    await page.keyboard.press("Escape");
    assert.ok(await roomButton.evaluate(el => el === document.activeElement));
    assert.equal(await roomButton.locator(".watch-together-launcher-icon").evaluate(el => getComputedStyle(el).animationName), "none");
    // Persistent client navigation: route changes also change the dock, not the whole document.
    await page.evaluate(() => window.navDocumentMarker = "preserved");
    await nav.locator(".app-nav-switch").click();
    await page.waitForURL(origin + (music ? "/" : "/music"));
    assert.equal(await page.evaluate(() => window.navDocumentMarker), "preserved");
  }
  for (const room of createdRooms) {
    await page.goto(room.url, { waitUntil: "domcontentloaded" });
    await page.locator(".party-layout").waitFor({ timeout: 20000 });
    await page.waitForFunction(music => document.querySelector(".app-mobile-nav")?.getAttribute("data-theme") === (music ? "music" : "cinema"), room.music);
    assert.match(await roomButton.innerText(), room.music ? /شنیدن همزمان/ : /تماشای همزمان/);
  }
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  assert.equal(await roomButton.locator(".watch-together-launcher-icon").evaluate(el => getComputedStyle(el).animationName), "app-room-welcome");
  // English/LTR must remain usable without overflowing narrow screens.
  await page.context().addCookies([{ name: "vod_locale", value: "en", url: origin }]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 320, height: 700 });
  assert.equal(await nav.getAttribute("dir"), "ltr");
  assert.ok(await nav.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  await page.setViewportSize({ width: 1440, height: 900 });
  assert.equal(await nav.isVisible(), false);
  assert.deepEqual(errors, []);
  console.log("PASS floating dock: RTL/LTR, 320–760px, themes, library, focus/escape, reduced motion, SPA switch, real watch/listen room creation + guest admission");
} finally { await browser.close(); }
