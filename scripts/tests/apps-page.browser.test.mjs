import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

test("applications page: mobile/TV editions, real branding, safe release state and responsive layouts", { skip: !process.env.APPS_TEST_ORIGIN || !process.env.PLAYWRIGHT_MODULE, timeout: 180000 }, async () => {
  const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
  const browser = await chromium.launch({ channel: process.env.APPS_TEST_BROWSER || "msedge", headless: true });
  const page = await browser.newPage({ serviceWorkers: "block" });
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  try {
    await mkdir(".media-cache/android-app-tests", { recursive: true });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      const response = await page.goto(`${process.env.APPS_TEST_ORIGIN}/apps`, { waitUntil: "domcontentloaded", timeout: 90000 });
      assert.equal(response.status(), 200);
      await page.getByRole("heading", { level: 1 }).waitFor();
      // Wait for React's streamed hidden fragments to be committed/removed.
      await page.waitForFunction(() => {
        const cards = [...document.querySelectorAll('[data-app-edition]')];
        return cards.length === 2 && cards.every(card => card.getBoundingClientRect().height > 0 && !card.closest('[hidden]'));
      });
      assert.match(await page.title(), /اندروید موبایل.*Android TV/);
      assert.equal(await page.locator('[data-app-edition]').count(), 2);
      for (const [edition, id] of [["android-mobile", "ir.sarvnema.app"], ["android-tv", "ir.sarvnema.tv"]]) {
        const card = page.locator(`[data-app-edition="${edition}"]`);
        assert.match(await card.innerText(), new RegExp(id.replaceAll(".", "\\.")));
        assert.equal(await card.locator('img[src="/brand/sarvnema-mark.svg"]').count(), 1);
        const ready = await card.locator('[data-release-ready]').getAttribute("data-release-ready");
        if (ready === "false") assert.match(await card.innerText(), /دانلود عمومی هنوز فعال نشده/);
        else assert.ok((await card.locator('a[href^="https:"]').getAttribute('href')).startsWith('https://'));
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px: no horizontal overflow`);
      await page.screenshot({ path: `.media-cache/android-app-tests/apps-${width}.png`, fullPage: width === 390 });
      await page.locator('header a[href="#android-mobile"]').click();
      await page.waitForFunction(() => location.hash === "#android-mobile");
      const first = await page.locator('#android-mobile').boundingBox();
      assert.ok(first.x >= -1 && first.x + first.width <= width + 1);
      await page.getByText("چرا نام هر دو اپ یکی است اما شناسه‌ها فرق دارند؟", { exact: true }).click();
      assert.equal(await page.locator('details[open]').count(), 1);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
