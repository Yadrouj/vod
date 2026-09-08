import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const origin = process.env.LOAD_BASE_URL || "http://localhost:3006";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.clock.install();
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.context().addCookies([{ name: "vod_locale", value: "fa", url: origin }]);
  await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 90000 });
  const nav = page.getByRole("navigation", { name: "دسترسی سریع" });
  await nav.waitFor();
  assert.ok((await nav.boundingBox()).x < 720, "Desktop history on left");
  await nav.getByRole("button", { name: "دانلودها" }).click();
  const dialog = page.getByRole("dialog", { name: "دانلودها", exact: true });
  await dialog.waitFor();
  assert.ok(await dialog.getByText("هنوز سابقه‌ای", { exact: false }).isVisible());
  await page.keyboard.press("Escape");
  assert.equal(await dialog.isVisible(), false);
  await page.screenshot({ path: ".media-cache/landing-desktop.png" });
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 850 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow at ${width}`);
    if (width <= 760) {
      const appNav = page.getByRole("navigation", { name: "منوی اصلی موبایل" });
      assert.ok(await appNav.getByRole("link", { name: "فیلم و سریال", exact: true }).isVisible());
      const box = await appNav.boundingBox();
      assert.ok(box.y > 700 && box.y + box.height <= 850, "Bottom nav inside viewport");
    }
  }
  await page.evaluate(() => {
    localStorage.setItem("sarvnema_downloads", JSON.stringify([{ title: "Test movie", href: "https://example.com/movie.mp4", label: "1080p", at: Date.now() }]));
  });
  await page.locator(".app-mobile-nav").getByRole("button", { name: "دانلودها" }).click();
  await page.getByRole("dialog", { name: "دانلودها", exact: true }).getByText("Test movie", { exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await page.screenshot({ path: ".media-cache/landing-mobile.png" });
  const response = await page.request.get(`${origin}/api/landing-pulse`);
  assert.equal(response.status(), 200);
  assert.ok((await response.body()).length < 1024);
  await page.route("**/api/landing-pulse", route => route.fulfill({ json: { version: "2099-01-01T00:00:00Z", updatedAt: "2099-01-01T00:00:00Z", recentCount: 2 } }));
  await page.clock.fastForward(61000);
  await page.getByRole("button", { name: "به‌روزرسانی جدید · نمایش", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS landing: mobile navigation, desktop activity, dialog, stored history, overflow, compact pulse API");
} finally { await browser.close(); }
