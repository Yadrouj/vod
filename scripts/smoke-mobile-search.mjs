import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3004";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Local UI test only");
const modulePath = process.env.PLAYWRIGHT_MODULE || path.resolve(".media-cache/browser-tools/node_modules/playwright/index.mjs");
const { chromium, webkit } = await import(pathToFileURL(modulePath).href);
const engines = process.env.WEBKIT_EXECUTABLE ? ["chromium", "webkit"] : ["chromium"];
const reports = [];
const items = Array.from({ length: 16 }, (_, index) => ({
  title: index === 0 ? "House" : `House search result ${index + 1}`,
  imdbCode: index === 0 ? "tt0412142" : `tt00000${String(index).padStart(2, "0")}`,
  type: "series", year: 2004, imdbRating: 8.7 - index / 10, posterUrl: null,
}));

for (const engine of engines) {
  const browser = engine === "webkit"
    ? await webkit.launch({ headless: true, executablePath: process.env.WEBKIT_EXECUTABLE })
    : await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [320, 390, 430]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
      await context.addCookies([{ name: "vod_locale", value: "fa", url: origin }]);
      // Emulate the iOS keyboard reducing only visualViewport, including its
      // panning offset. This is not a claim of physical-device keyboard testing.
      await context.addInitScript(() => {
        const native = window.visualViewport;
        const viewport = new EventTarget();
        let visibleHeight = null, top = 0;
        Object.defineProperties(viewport, {
          height: { get: () => visibleHeight ?? native?.height ?? innerHeight },
          width: { get: () => native?.width ?? innerWidth },
          offsetTop: { get: () => top }, offsetLeft: { get: () => 0 },
        });
        Object.defineProperty(window, "visualViewport", { value: viewport });
        window.setSearchViewport = (height, offsetTop = 0) => {
          visibleHeight = height; top = offsetTop;
          viewport.dispatchEvent(new Event("resize"));
          viewport.dispatchEvent(new Event("scroll"));
        };
      });
      await context.route("**/api/suggest?*", async route => {
        const params = new URL(route.request().url()).searchParams;
        const typo = params.get("q") === "breakng bud";
        await route.fulfill({ json: {
          items: params.get("q") === "nothinghere" ? [] : items.map(item => ({ ...item, type: params.get("type") === "movie" ? "movie" : "series" })),
          corrections: typo ? ["Breaking Bad", "Breaking Bud", "Breaking Bad: Extras", "Breaking Bad documentary"] : [],
          matchedQuery: typo ? "Breaking Bad" : "",
        } });
      });
      await context.route("**/api/music/search?*", route => route.fulfill({ json: { items: items.slice(0, 8).map(item => ({ ...item, imdbCode: `music-${item.imdbCode}`, type: "Track" })), artists: [] } }));
      const page = await context.newPage();
      page.setDefaultTimeout(12000);
      page.setDefaultNavigationTimeout(60000);
      const errors = []; page.on("pageerror", error => errors.push(error.message));
      try {
        await page.goto(origin, { waitUntil: "domcontentloaded" });
        const launcher = page.locator(".app-nav-search");
        await launcher.focus();
        await launcher.click();
        const dialog = page.locator("dialog[open]").filter({ has: page.locator("[data-discovery-search]") });
        const input = dialog.getByRole("combobox");
        await input.fill("house");
        await dialog.locator(".suggest-item").first().waitFor();

        async function visibleResult(label) {
          const geometry = await dialog.evaluate(el => {
            const viewport = window.visualViewport;
            const bounds = selector => el.querySelector(selector).getBoundingClientRect().toJSON();
            return { top: viewport.offsetTop, bottom: viewport.offsetTop + viewport.height,
              input: bounds("input"), first: bounds(".suggest-item"), results: bounds(".suggest-results"),
              dialog: el.getBoundingClientRect().toJSON(), outerScroll: el.children[1].scrollTop,
              width: el.scrollWidth, clientWidth: el.clientWidth, viewportWidth: document.documentElement.clientWidth,
            };
          });
          assert.ok(geometry.input.top >= geometry.top - 1, `${label}: input in view`);
          assert.ok(geometry.first.top >= geometry.input.bottom, `${label}: results follow input`);
          assert.ok(geometry.first.bottom <= geometry.bottom - 8, `${label}: first complete result visible without scrolling`);
          assert.ok(geometry.results.height >= 68, `${label}: useful result area`);
          assert.ok(geometry.dialog.bottom <= geometry.bottom + 1, `${label}: dialog above keyboard`);
          assert.equal(geometry.outerScroll, 0, `${label}: dialog does not need scrolling`);
          assert.ok(geometry.width <= geometry.clientWidth + 1, `${label}: no horizontal overflow`);
          assert.ok(geometry.dialog.width <= geometry.viewportWidth + 1, `${label}: dialog fits mobile width`);
          return geometry;
        }
        await visibleResult("full screen");
        await page.evaluate(() => window.setSearchViewport(390, 37));
        await page.waitForFunction(() => Math.abs(document.querySelector("dialog[open]").getBoundingClientRect().height - 390) < 1);
        const compact = await visibleResult("keyboard open");
        assert.ok(await input.evaluate(el => el === document.activeElement), "Typing retains focus");
        await dialog.locator(".suggest-results").evaluate(el => { el.scrollTop = 220; });
        assert.ok(await dialog.locator(".suggest-results").evaluate(el => el.scrollTop > 0), "Results scroll independently");
        assert.equal((await input.boundingBox()).y, compact.input.y, "Search input stays in place while scrolling");

        await input.fill("breakng bud");
        await dialog.locator("[data-search-corrections]").waitFor();
        await visibleResult("spelling suggestions");
        await dialog.locator("[data-search-corrections] button").first().click();
        assert.equal(await input.inputValue(), "Breaking Bad", "Correction applies without navigating");
        await dialog.locator(".suggest-item").first().waitFor();
        await visibleResult("corrected query");

        const categories = dialog.locator('[data-discovery-search] [role="group"]').first().getByRole("button");
        await categories.nth(2).click();
        await dialog.locator(".suggest-item").first().waitFor();
        assert.equal(await input.inputValue(), "Breaking Bad", "Changing content type retains query");
        assert.ok(await input.evaluate(el => el === document.activeElement), "Changing content type retains keyboard focus");
        await visibleResult("series filter");
        await categories.nth(3).click();
        await dialog.locator(".suggest-item").first().waitFor();
        await visibleResult("music filter");
        assert.match(await dialog.locator(".suggest-item").first().getAttribute("href"), /^\/music\//);

        await input.fill("nothinghere");
        // Return to cinema where the fixture deliberately has no results.
        await categories.nth(2).click();
        await dialog.locator('.suggest-results[aria-busy="false"] [role="status"]').waitFor();
        const empty = await dialog.locator(".suggest-empty").boundingBox();
        assert.ok(empty.y + empty.height <= 427, "Empty state remains above keyboard");
        await dialog.locator(".suggest-clear").click();
        assert.equal(await input.inputValue(), "", "Clear keeps an editable search field");
        assert.ok(await input.evaluate(el => el === document.activeElement));
        await page.evaluate(() => window.setSearchViewport(844));
        await page.waitForFunction(() => document.documentElement.dataset.appKeyboard !== "true");
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
        assert.equal(await page.locator("html[data-media-dialog-open]").count(), 0, "Closing unlocks the page");
        assert.ok(!await page.evaluate(() => document.activeElement?.closest("dialog")), "Focus does not remain in the dismissed dialog");

        await page.evaluate(() => window.setSearchViewport(844));
        await page.goto(`${origin}/browse`, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => {
          const field = [...document.querySelectorAll('main input[role="combobox"]')].find(el => el.getClientRects().length);
          return field && Object.keys(field).some(key => key.startsWith("__reactProps$") && typeof field[key]?.onChange === "function");
        });
        await page.locator('main input[role="combobox"]:visible').fill("house");
        const standalone = page.locator("main .suggest-box.is-open:visible");
        await standalone.locator(".suggest-item").first().waitFor();
        await page.evaluate(() => window.setSearchViewport(420, 20));
        await page.waitForFunction(() => Math.abs(document.querySelector("main .suggest-box.is-open").getBoundingClientRect().height - 420) < 1);
        const first = await standalone.locator(".suggest-item").first().boundingBox();
        assert.ok(first.y + first.height < 440, "Browse search results remain visible above keyboard");
        assert.ok(await standalone.locator(".suggest-results").evaluate(el => el.scrollHeight > el.clientHeight));
        await standalone.locator(".suggest-mobile-head button").click();
        assert.equal(await page.locator("html.mobile-search-open").count(), 0, "Close restores page scrolling");
        assert.deepEqual(errors, []);
        reports.push({ engine, width, keyboard: true, visibleResults: true, independentScroll: true, corrections: true, filters: true, standalone: true });
        console.log(`${engine} ${width}px: mobile search checks passed`);
      } catch (error) {
        await page.screenshot({ path: `.media-cache/mobile-search-failure-${engine}-${width}.png` });
        console.error(await page.locator("[data-search-corrections]").evaluateAll(elements => elements.map(el => ({ box: el.getBoundingClientRect().toJSON(), buttons: [...el.querySelectorAll("button")].map(button => button.getBoundingClientRect().toJSON()) }))));
        throw error;
      } finally { await context.close(); }
    }
    // Desktop retains the introductory design and normal dialog scrolling.
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
    await context.addCookies([{ name: "vod_locale", value: "fa", url: origin }]);
    const page = await context.newPage();
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page.locator('.gradient-menu button[aria-haspopup="dialog"]').filter({ has: page.locator('svg.lucide-search') }).click();
    const desktop = page.locator("dialog[open]");
    assert.ok((await desktop.boundingBox()).width < 700);
    assert.ok(await desktop.getByText("اسمش دقیق یادت نیست؟", { exact: true }).isVisible());
    await context.close();
    reports.push({ engine, desktopUnchanged: true });
  } finally { await browser.close(); }
}
console.log(JSON.stringify(reports, null, 2));
