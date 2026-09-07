import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdir } from "node:fs/promises";
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : "playwright");
const origin = process.env.LOAD_BASE_URL || "http://localhost:3004";
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname));
await mkdir(".media-cache", { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "chrome", headless: true });
try {
  for (const locale of ["fa", "en"]) {
    const context = await browser.newContext();
    await context.addCookies([{ name: "vod_locale", value: locale, url: origin }]);
    const page = await context.newPage();
    const browserErrors = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForLoadState("load");
    assert.equal(await page.locator("html").getAttribute("lang"), locale);
    const section = page.locator('[data-section="catalog-updates"]');
    await section.waitFor();
    assert.equal(await section.locator(".release-update-card").count(), 8);
    assert.equal(await section.locator('[data-change-type="links-refreshed"]').count(), 0);
    const lanterns = page.locator('[data-section="new-episodes"] a[href="/tt26545992"]');
    assert.equal(await lanterns.count(), 1, "Lanterns episode update is visible without duplicate profiles");
    assert.match(await lanterns.innerText(), locale === "fa" ? /قسمت ۴/ : /Episode 4/);
    assert.doesNotMatch(await section.innerText(), /آماده تماشا|Ready to watch/);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      if (width < 761) assert.equal(await page.locator(".mega-panel").evaluate((el) => getComputedStyle(el).visibility), "hidden", "Closed categories do not leak over landing cards");
      await section.scrollIntoViewIfNeeded();
      const boxes = await section.locator(".release-update-card").evaluateAll((cards) => cards.map((card) => {
        const r = card.getBoundingClientRect();
        return { left: r.left, right: r.right, fits: card.scrollWidth <= card.clientWidth + 1 };
      }));
      assert.ok(boxes.every((box) => box.left >= 0 && box.right <= width + 1 && box.fits), `${locale}/${width}: update cards fit the viewport`);
      assert.equal(await section.locator(".release-update-status").first().evaluate((el) => getComputedStyle(el).color), "rgb(243, 203, 104)");
      if (width === 390 || width === 1440) {
        const options = { path: `.media-cache/updates-${locale}-${width}.png`, animations: "disabled" };
        await section.screenshot(options).catch(async (error) => {
          if (!/not attached/.test(error.message)) throw error;
          await section.screenshot(options); // Development hydration/HMR can replace the server DOM once.
        });
      }
    }
    await page.goto(`${origin}/updates`, { waitUntil: "domcontentloaded", timeout: 120000 });
    assert.ok(await page.locator(".release-update-card").count() > 8);
    assert.deepEqual(browserErrors, [], "No hydration or runtime errors");
    console.log(`PASS ${locale}: eight distinct landing updates, Lanterns E04, yellow theme, mobile/tablet/desktop and full update page`);
    await context.close();
  }
} finally { await browser.close(); }
