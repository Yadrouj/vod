import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const origin = process.env.LOAD_BASE_URL || "http://127.0.0.1:3006";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) throw new Error("Local targets only");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    // Keep this UX test independent of third-party images/analytics/media.
    await page.route("**/*", route => {
      if (new URL(route.request().url()).origin !== origin) return route.abort();
      return route.continue();
    });
    await page.goto(origin + "/music");
    const card = page.locator("a.music-card").first();
    await card.waitFor();
    const href = await card.getAttribute("href");
    await page.route(`${origin}${href}*`, async route => {
      await new Promise(resolve => setTimeout(resolve, 1500)); await route.continue();
    });
    // Programmatic click avoids hover prefetch and measures the slow-path
    // acknowledgement independently from Playwright's actionability wait.
    const latency = await card.evaluate(node => new Promise(resolve => {
      const start = performance.now();
      const observer = new MutationObserver(() => {
        if (node.getAttribute("data-route-pending") === "true") { observer.disconnect(); resolve(performance.now() - start); }
      });
      observer.observe(node, { attributes: true }); node.click();
    }));
    assert.ok(latency < 150, `Click feedback took ${latency}ms`);
    await page.waitForFunction(() => document.querySelector(".route-status")?.textContent);
    await page.waitForURL(origin + href);
    await page.waitForFunction(() => !document.documentElement.classList.contains("is-route-pending"));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.goBack(); await page.waitForURL(origin + "/music");
    await page.waitForFunction(() => !document.documentElement.classList.contains("is-route-pending"));
    await page.route("**/api/music/search?**", route => route.fulfill({ status: 429, contentType: "application/json", headers: { "Retry-After": "5" }, body: '{"code":"RATE_LIMITED"}' }));
    await page.locator("input.search").first().fill("ebi");
    await page.getByText("درخواست‌ها زیاد است؛ چند لحظه دیگر جستجو کنید.").waitFor();
    console.log(JSON.stringify({ width, clickFeedbackMs: Math.round(latency), routeCompleted: true, back: true, searchOverload: true }));
    await page.close();
  }
} finally { await browser.close(); }
