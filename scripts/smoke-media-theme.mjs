// Run against a local dev server. Set PLAYWRIGHT_MODULE to a cached Playwright
// entry point if it is not installed in this workspace; no production dependency.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { io } from "socket.io-client";

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : "playwright");
const origin = process.env.LOAD_BASE_URL || "http://localhost:3004";
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname), "Only run this smoke test on localhost");
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "chrome", headless: true });
const socket = io(origin, { transports: ["websocket"], autoConnect: false });
const profile = { id: randomUUID(), name: "Theme smoke test", avatarUrl: null };
const mediaUrl = "https://example.com/media-theme-smoke.wav";
const source = { url: mediaUrl, label: "1080p", quality: "1080p", season: null, episode: null };
const video = { itemId: "theme-smoke", title: "Cinema theme test", posterUrl: null, mediaKind: "video", source, sources: [source], details: { type: "movie", year: 2026, endYear: null, runtimeMinutes: 120, imdbRating: 8, imdbVotes: null, imdbUrl: null, overview: null, tagline: null, certificate: null, countries: ["Iran"], languages: ["Persian"], genres: ["Drama"], credits: [] } };
const audio = { ...video, itemId: "music-theme-smoke", title: "Music theme test", catalogue: "music", mediaKind: "audio" };

// A tiny generated silent WAV provides real duration/seek/play events. No
// catalogue changes, remote media downloads, camera or microphone permissions.
function silentAudio() {
  const bytes = 8000 * 2 * 30;
  const wav = Buffer.alloc(44 + bytes);
  wav.write("RIFF"); wav.writeUInt32LE(36 + bytes, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(bytes, 40);
  return wav;
}
function ack(event, payload) {
  return new Promise((resolve, reject) => socket.timeout(12000).emit(event, payload, (error, result) => {
    if (error || !result?.ok) reject(error || new Error(result?.error || `${event} failed`));
    else resolve(result);
  }));
}
async function color(page, selector, property = "color") {
  return page.locator(selector).first().evaluate((el, property) => getComputedStyle(el)[property], property);
}
async function assertControls(page, accent) {
  const toolbar = page.locator(".party-controls");
  await page.waitForFunction((accent) => getComputedStyle(document.querySelector(".party-controls > button:first-child")).backgroundColor === accent, accent);
  const rects = await toolbar.locator("button").evaluateAll((buttons) => buttons.map((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top };
  }));
  assert.ok(rects.slice(1).every((r) => r.left > rects[0].right), "Play must be physically left of all utility controls");
  assert.ok(rects.every((r) => Math.abs(r.top - rects[0].top) < 2), "Buttons stay on one row");
  assert.equal(await color(page, ".party-controls", "direction"), "ltr");
  assert.equal(await color(page, ".party-seek-control", "direction"), "ltr");
  assert.equal(await color(page, ".party-seek-control", "accentColor"), accent);
  assert.equal(await color(page, ".party-controls > button:first-child", "backgroundColor"), accent);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "No page overflow");
}

try {
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve); socket.once("connect_error", reject); socket.connect();
  });
  // One private room, reused throughout the matrix to avoid seed data/rate limits.
  const room = await ack("room:create", { profile, media: video, visibility: "private" });
  const url = `${origin}/watch-together/${room.roomId}?invite=${room.inviteToken}`;
  for (const locale of ["fa", "en"]) {
    const context = await browser.newContext();
    await context.addCookies([{ name: "vod_locale", value: locale, url: origin }]);
    await context.addInitScript((profile) => localStorage.setItem("sarvnema_party_profile", JSON.stringify(profile)), profile);
    await context.route(mediaUrl, (route) => route.fulfill({ contentType: "audio/wav", body: silentAudio() }));
    await context.route("**/api/subtitles/theme-smoke?*", (route) => route.fulfill({ json: { tracks: [] } }));
    const page = await context.newPage();
    page.on("pageerror", (error) => console.error("Browser error:", error.message));
    page.on("console", (message) => { if (message.type() === "error") console.error("Console:", message.text()); });
    page.on("requestfailed", (request) => { if (request.failure()?.errorText !== "net::ERR_ABORTED") console.error("Failed request:", request.url(), request.failure()?.errorText); });
    console.log(`Opening ${locale} room`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    assert.equal(await page.locator("html").getAttribute("lang"), locale);
    await page.locator(".party-controls").waitFor({ timeout: 25000 }).catch(async (error) => {
      console.error("Room DOM:", (await page.locator("body").innerText()).slice(0, 2500));
      console.error("Room connection:", await page.evaluate(() => ({ state: document.readyState, profile: localStorage.getItem("sarvnema_party_profile"), scripts: [...document.scripts].map(s => s.src) })));
      await page.screenshot({ path: `.media-cache/theme-smoke-${locale}.png` });
      throw error;
    });
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await assertControls(page, "rgb(243, 203, 104)");
    }
    assert.equal(await color(page, ".party-personal-media-toggle"), "rgb(243, 203, 104)");
    assert.equal(await color(page, ".party-title-stats svg"), "rgb(243, 203, 104)");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator(".party-personal-media-toggle").click();
    assert.equal(await color(page, ".party-personal-media-tabs .is-active"), "rgb(243, 203, 104)");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Playback settings", exact: true }).click();
    await page.waitForFunction(() => getComputedStyle(document.querySelector(".party-controls .is-active")).color === "rgb(243, 203, 104)");
    await page.locator(".party-player-stage").screenshot({ path: `.media-cache/theme-player-${locale}.png` });
    await page.getByRole("button", { name: "Playback settings", exact: true }).click();
    await page.getByRole("button", { name: "Enter fullscreen", exact: true }).click();
    await page.locator(".party-player-stage.is-cinema-fullscreen").waitFor();
    await assertControls(page, "rgb(243, 203, 104)");
    await page.getByRole("button", { name: "Exit fullscreen", exact: true }).click();
    // Switch media in the same mounted room; music must not keep the cinema theme.
    await ack("playback:command", { roomId: room.roomId, action: "media", media: audio });
    await page.locator('[data-media-theme="music"].party-layout').waitFor();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await assertControls(page, "rgb(120, 237, 172)");
    }
    await ack("playback:command", { roomId: room.roomId, action: "media", media: video });
    await page.locator('[data-media-theme="cinema"].party-layout').waitFor();
    await assertControls(page, "rgb(243, 203, 104)");
    console.log(`PASS ${locale}: desktop/tablet/mobile/fullscreen, yellow film, green music, live theme switch`);
    await context.close();
  }
} finally {
  socket.disconnect();
  await browser.close();
}
