import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const origin = process.env.LOAD_BASE_URL || "http://127.0.0.1:3017";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const browser = await chromium.launch({ channel: "chrome", headless: true });
await mkdir(".media-cache", { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", serviceWorkers: "block" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.goto(`${origin}/kids`, { waitUntil: "networkidle", timeout: 120000 });
  assert.equal(await page.locator(".app-mobile-nav,[data-music-dock],[data-watch-together-launcher]").count(), 0);
  assert.equal(await page.locator('script[src*="googletagmanager"]').count(), 0);
  assert.equal(await page.locator('a[target="_blank"]').count(), 0);
  await page.screenshot({ path: ".media-cache/kids-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "🔒 برای بزرگ‌ترها", exact: true }).click();
  await page.getByLabel("رمز والدین", { exact: true }).fill("1234");
  await page.getByLabel("تکرار رمز", { exact: true }).fill("1234");
  await page.getByRole("button", { name: "ورود والدین", exact: true }).click();
  await page.getByRole("heading", { name: "یک برنامهٔ کوچک برای امروز" }).waitFor();
  assert.ok(await page.locator('a[href="https://ketabak.org/ava"]').count());
  await page.getByRole("button", { name: "پخش با پلیر آپارات، همراه بزرگ‌تر" }).first().click();
  assert.equal(await page.locator("iframe").count(), 0);
  await page.getByRole("button", { name: "همراه کودک هستم؛ پلیر رسمی بارگذاری شود" }).click();
  assert.equal(await page.locator('iframe[src*="aparat.com/video/video/embed/"]').count(), 1);
  await page.getByRole("button", { name: "شروع برنامهٔ ۲۰ دقیقه‌ای", exact: true }).click();
  assert.equal(await page.locator("iframe").count(), 0);
  assert.equal(await page.locator('a[target="_blank"]').count(), 0);
  await page.getByRole("button", { name: "شروع بیا ستاره‌ها را بشماریم", exact: true }).click();
  await page.getByText("چند ستاره می‌بینی؟", { exact: true }).waitFor();
  await page.getByRole("button", { name: "۱", exact: true }).click();
  await page.getByText("آفرین! حالا یکی دیگر را امتحان کنیم.", { exact: true }).waitFor();
  // Expired persisted session must not restart on reload.
  await page.evaluate(() => { const key = "sarvnema-kids-v1"; const data = JSON.parse(localStorage.getItem(key)); data.deadline = Date.now() - 1; localStorage.setItem(key, JSON.stringify(data)); });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "وقت یک استراحت کوچولو!" }).waitFor();
  assert.equal(await page.locator("video,audio,iframe").count(), 0);
  await page.getByRole("button", { name: "🔒 برای بزرگ‌ترها", exact: true }).click();
  await page.getByLabel("رمز والدین", { exact: true }).fill("9999");
  await page.getByRole("button", { name: "ورود والدین", exact: true }).click();
  await page.getByText("رمز درست نیست. بعد از پنج تلاش، ۳۰ ثانیه صبر کنید.", { exact: true }).waitFor();
  await page.getByLabel("رمز والدین", { exact: true }).fill("1234");
  await page.getByRole("button", { name: "ورود والدین", exact: true }).click();
  await page.getByRole("heading", { name: "یک برنامهٔ کوچک برای امروز" }).waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: ".media-cache/kids-parents-desktop.png", fullPage: true });
  await page.goto(`${origin}/kids/learn`, { waitUntil: "networkidle" });
  assert.equal(await page.locator(".app-mobile-nav").count(), 0);
  assert.equal((await page.request.get(`${origin}/api/kids/media/vod-unknown`)).status(), 404);
  const response = await page.request.get(`${origin}/api/kids/media/audio-roz-d82ba5a826fa27`);
  assert.equal(response.status(), 200);
  assert.ok((await response.json()).sources.length > 0);
  // Keep a handle to the actual player across client navigation: detached audio
  // must be paused and its source released, not merely hidden from the DOM.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/music/media?**", route => route.abort());
  await page.goto(`${origin}/music/roz-d82ba5a826fa27`, { waitUntil: "networkidle" });
  await page.locator('button[aria-label^="پخش "]').first().click();
  await page.locator("[data-music-dock] audio").waitFor({ state: "attached" });
  const detachedAudio = await page.locator("[data-music-dock] audio").elementHandle();
  await page.locator(".app-nav-library").click();
  await page.locator('.app-library-grid a[href="/kids"]').click();
  await page.waitForURL("**/kids");
  await page.locator("[data-kids-space]").waitFor();
  assert.equal(await page.locator("[data-music-dock]").count(), 0);
  assert.ok(await detachedAudio.evaluate(node => node.paused && !node.getAttribute("src")));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(origin, { waitUntil: "networkidle", timeout: 120000 });
  await page.locator(".mega-button").click();
  const dialog = page.locator("[data-category-dialog]");
  await dialog.waitFor({ state: "visible" });
  assert.ok(await dialog.locator("img[loading=eager]").count() <= 6);
  // Every external image fails in this test; links and placeholders must remain usable.
  await page.waitForTimeout(500);
  assert.equal(await dialog.locator("img").count(), 0);
  const buttons = dialog.locator("nav button");
  for (let i = 0; i < Math.min(5, await buttons.count()); i++) await buttons.nth(i).click();
  await page.screenshot({ path: ".media-cache/menu-fallback-desktop.png" });
  await page.keyboard.press("Escape");
  assert.equal(await dialog.isVisible(), false);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${origin}/kids`, { waitUntil: "networkidle" });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `No overflow at ${width}px`);
  }
  assert.deepEqual(errors, []);
  console.log("PASS: kids PIN, approval boundary, family embed consent, session expiry, learning, media API, menu failed-image fallback, responsive widths; no page errors");
} finally { await browser.close(); }
