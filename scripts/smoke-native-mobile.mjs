import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const origin = process.env.LOAD_BASE_URL || "http://127.0.0.1:3006";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname), "Local preview only");
const browser = await chromium.launch({ channel: "chrome", headless: true });
await mkdir(".media-cache", { recursive: true });

async function neutralEdge(locator) {
  const colors = await locator.evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().width > 0).map(el => getComputedStyle(el).borderTopColor));
  for (const color of colors) {
    const [r, g, b] = color.match(/[\d.]+/g).map(Number);
    assert.ok(r === g && g === b, `Decorative border must be neutral: ${color}`);
  }
}

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", serviceWorkers: "block", hasTouch: true });
  page.setDefaultTimeout(20000);
  await page.context().addCookies([{ name: "vod_locale", value: "fa", url: origin }]);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  // Only use remote images for the visual review, never start third-party media.
  await page.route("**/*", route => new URL(route.request().url()).origin === origin || route.request().resourceType() === "image" ? route.continue() : route.abort());
  const nav = page.locator(".app-mobile-nav");
  for (const music of [false, true]) {
    const theme = music ? "music" : "cinema";
    await page.goto(origin + (music ? "/music" : "/"), { waitUntil: "domcontentloaded", timeout: 90000 });
    const feature = page.locator(`[data-mobile-feature=${theme}]`);
    const article = feature.locator("article");
    const actions = article.locator("div[aria-label]");
    await feature.locator("h2").waitFor();
    // Waiting for hydration through an actual interaction also stops rotation.
    await feature.getByRole("button", { name: "پیشنهاد بعدی", exact: true }).click();
    await page.waitForFunction(theme => document.querySelector(`[data-mobile-feature=${theme}] [data-rotation-toggle]`)?.getAttribute("aria-pressed") === "true", theme);
    for (const [width, height] of [[320, 568], [390, 844], [430, 932], [760, 900]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => scrollTo(0, 0));
      const box = await article.boundingBox(), dock = await nav.boundingBox();
      assert.ok(box.y < 125, `Image should start near top: ${theme} ${width}, y=${box.y}`);
      assert.ok(box.x >= 0 && box.x + box.width <= width, "Card fits the viewport");
      assert.ok(box.y + box.height <= dock.y, `Feature controls must be above nav: ${theme} ${width}`);
      const pager = await feature.locator("nav").boundingBox();
      assert.ok(pager.y + pager.height <= dock.y, `Pager must also clear nav: ${theme} ${width}`);
      assert.equal(await actions.locator(":scope > *").count(), 3);
      const buttons = await actions.locator(":scope > *").all();
      for (const button of buttons) {
        const rect = await button.boundingBox();
        assert.ok(rect.width >= 44 && rect.height >= 44, `44px touch target: ${theme} ${width}`);
        assert.ok(rect.x >= box.x && rect.x + rect.width <= box.x + box.width + 1);
        assert.ok(rect.y > box.y + box.height / 2 && rect.y + rect.height < box.y + box.height, "Actions inside bottom of art");
      }
      const tops = await actions.locator(":scope > *").evaluateAll(els => els.map(el => el.getBoundingClientRect().top));
      assert.ok(tops.every(y => Math.abs(y - tops[0]) <= 1), "Three actions on one line");
      assert.equal(await page.locator(music ? ".music-landing-search" : ".film-landing-search").isVisible(), false);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Page overflow: ${theme} ${width}`);
      await neutralEdge(nav);
      await neutralEdge(article);
      if (width === 390 || width === 320) await page.screenshot({ path: `.media-cache/native-${theme}-${width}.png` });
      if (width === 320) {
        const meta = article.locator("p").first();
        const original = await meta.textContent();
        await meta.evaluate(el => { el.textContent = "هنرمند با نام طولانی • ".repeat(30); });
        assert.ok((await meta.boundingBox()).height <= 41, "Long artist credits must not displace controls or overlap the top badge");
        await meta.evaluate((el, text) => { el.textContent = text; }, original);
      }
    }
    const id = await feature.getAttribute("data-item-id");
    const links = await actions.locator("a").evaluateAll(els => els.map(el => el.getAttribute("href")));
    assert.ok(links.every(link => link.endsWith(id)), "Play and details point to the selected title");
    await page.setViewportSize({ width: 390, height: 844 });
    await actions.locator(".watch-together-launcher").click();
    const builder = page.locator(".watch-builder[role=dialog]");
    await builder.waitFor();
    assert.equal(await builder.getAttribute("data-media-theme"), theme);
    await builder.locator(".watch-builder-selected").waitFor();
    assert.ok((await builder.locator(".watch-builder-selected").innerText()).trim().length > 0);
    assert.equal(await feature.getAttribute("data-item-id"), id, "Opening a room must not change the selected title");
    await neutralEdge(builder);
    await page.keyboard.press("Escape");
    assert.ok(await actions.locator(".watch-together-launcher").evaluate(el => el === document.activeElement));
    await feature.getByRole("button", { name: "پیشنهاد بعدی", exact: true }).click();
    await page.waitForFunction(({ theme, id }) => document.querySelector(`[data-mobile-feature=${theme}]`)?.getAttribute("data-item-id") !== id, { theme, id });

    // Search is reachable in the dock without a second hero input.
    await nav.locator(".app-nav-search").click();
    const search = page.locator(".app-search-dialog:not(.app-library-dialog)");
    await search.waitFor();
    assert.ok(await search.evaluate(el => el.matches(":modal")));
    await search.locator("input.search").fill(music ? "ابی" : "Breaking Bad");
    await search.locator(".suggest-item").first().waitFor();
    await neutralEdge(search);
    await search.locator("header > button").click();
    await search.waitFor({ state: "hidden" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => scrollTo(0, 0));
    assert.equal(await feature.isVisible(), false);
    assert.equal(await page.locator(music ? ".music-landing-search" : ".film-landing-search").isVisible(), true);
    await neutralEdge(page.locator(music ? ".music-landing-hero, .music-landing-now-playing" : ".film-landing-hero, .film-landing-now-playing"));
    await page.screenshot({ path: `.media-cache/soft-desktop-${theme}.png` });
    console.log(`PASS ${theme}: native feature 320–760px, in-card actions, neutral surfaces, room preset, carousel, dock search, desktop retained`);
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await page.context().addCookies([{ name: "vod_locale", value: "en", url: origin }]);
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 320, height: 568 });
  const english = page.locator("[data-mobile-feature=cinema]");
  await english.waitFor();
  assert.equal(await english.getAttribute("dir"), "ltr");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  assert.equal(await english.locator("article").evaluate(el => getComputedStyle(el).animationName), "none");
  await page.screenshot({ path: ".media-cache/native-en-320.png" });
  const art = english.locator("article > [aria-hidden]").first();
  if (await art.locator("img").count()) {
    await art.locator("img").dispatchEvent("error");
    await art.locator("svg").waitFor();
    assert.equal(await art.locator("img").count(), 0, "A failed poster becomes a styled fallback, not a broken-image icon");
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
