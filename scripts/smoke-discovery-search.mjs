import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const origin = process.env.LOAD_BASE_URL || "http://127.0.0.1:3004";
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname), "Smoke tests run locally only");
await mkdir(".media-cache", { recursive: true });
for (const [q, expected] of [["hoise", "House"], ["hauze", "House"], ["breakng bud", "Breaking Bad"], ["breakngbud", "Breaking Bad"], ["اخعسث", "House"]]) {
  const response = await fetch(`${origin}/api/suggest?${new URLSearchParams({ q, suggest: "spelling-v2", sort: "relevance-newest-imdb" })}`);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.matchedQuery, expected);
  assert.equal(result.items[0].title, expected);
  console.log(`PASS API: ${q} → ${expected}`);
}
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ serviceWorkers: "block" });
  page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(120000);
  await page.context().addCookies([{ name: "vod_locale", value: "fa", url: origin }]);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => { if (request.url().includes("/api/") && request.failure()?.errorText !== "net::ERR_ABORTED") console.log("REQUEST FAILED", request.url(), request.failure()?.errorText); });
  const trigger = page.locator("header.gradient-menu button:has(svg.lucide-search)");
  const dialog = page.locator("dialog[data-responsive-dialog][open]");
  const input = dialog.locator('input[role="combobox"]');
  const ready = async () => page.waitForFunction(() => [...document.querySelectorAll("header.gradient-menu button")].some(el => el.querySelector("svg.lucide-search") && Object.keys(el).some(key => key.startsWith("__reactProps") && typeof el[key].onClick === "function")));
  const resultsReady = async () => page.waitForFunction(() => [...document.querySelectorAll("dialog[open] .suggest-results")].some(el => el.getAttribute("aria-busy") === "false" && el.querySelector(".suggest-item")));
  const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "No horizontal page overflow");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin, { waitUntil: "domcontentloaded" }); await ready();
    await trigger.click(); await dialog.waitFor();
    await input.fill("breakngbud"); await resultsReady();
    assert.equal(await input.inputValue(), "breakngbud", "Never silently replace the typed query");
    assert.equal(await dialog.locator(".suggest-item").first().getAttribute("href"), "/tt0903747");
    const corrections = dialog.locator("[data-search-corrections]");
    await corrections.getByRole("button", { name: "Breaking Bad", exact: true }).click();
    assert.equal(await input.inputValue(), "Breaking Bad"); await resultsReady();
    assert.equal(await corrections.count(), 0, "Stale corrections disappear");
    const geometry = await dialog.evaluate(el => {
      const panel = el.getBoundingClientRect(), field = el.querySelector('input[role="combobox"]').getBoundingClientRect();
      return { x: panel.x, y: panel.y, width: panel.width, height: panel.height, inputInside: field.left >= panel.left && field.right <= panel.right };
    });
    assert.ok(geometry.inputInside);
    if (width <= 760) { assert.ok(Math.abs(geometry.width - width) <= 1); assert.ok(Math.abs(geometry.height - 900) <= 1); }
    await noOverflow();
    await page.screenshot({ path: `.media-cache/discovery-search-${width}.png` });
    await input.focus(); await page.keyboard.press("ArrowDown");
    assert.ok(await input.getAttribute("aria-activedescendant"), "Arrow keys select results");
    await page.keyboard.press("Escape");
    if (await dialog.count()) await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    assert.ok(await trigger.evaluate(el => el === document.activeElement), "Focus returns to the search launcher");
    await trigger.click();
    await dialog.getByRole("button", { name: "hoise", exact: true }).click(); await resultsReady();
    assert.equal(await input.inputValue(), "hoise");
    await dialog.locator(".suggest-clear").click();
    await dialog.getByRole("button", { name: "hoise", exact: true }).click(); await resultsReady();
    assert.equal(await input.inputValue(), "hoise", "Repeated example buttons still work");
    await dialog.getByRole("button", { name: "سریال", exact: true }).click(); await resultsReady();
    assert.ok((await dialog.locator(".suggest-item").allTextContents()).every(text => text.includes("سریال")), "Series category filters results");
    await dialog.getByRole("button", { name: "بستن جستجو", exact: true }).click();
    console.log(`PASS ${width}px: full-screen mobile panel, corrections, keyboard, focus, category and input bounds`);
  }
  let heldMusic;
  const hold = route => { heldMusic = route; };
  await page.route("**/api/music/search?*", hold);
  await trigger.click(); const startedAt = performance.now();
  await input.fill("breakngbud"); await resultsReady();
  assert.ok(performance.now() - startedAt < 5000, "Cinema results do not wait for the optional music request");
  assert.equal(await dialog.locator(".suggest-item").first().getAttribute("href"), "/tt0903747");
  assert.ok(heldMusic, "The independent music lookup is still pending");
  await heldMusic.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], artists: [] }) });
  await page.unroute("**/api/music/search?*", hold);
  await dialog.getByRole("button", { name: "بستن جستجو", exact: true }).click();
  console.log("PASS progressive search: film results are usable while music is pending");
  for (const route of ["/browse?q=hoise&type=series", "/music", "/tt0903747"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200); await noOverflow();
    console.log(`PASS mobile route ${route}`);
  }
  assert.deepEqual(errors, [], "No browser JavaScript errors");
} catch (error) {
  const page = browser.contexts()[0]?.pages()[0];
  if (page) { await page.screenshot({ path: ".media-cache/discovery-search-failure.png" }); console.error((await page.locator("dialog[open]").allTextContents()).join("\n")); }
  throw error;
} finally { await browser.close(); }
