import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const origin = process.env.LOAD_BASE_URL || "http://localhost:3004";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const response = await fetch(`${origin}/api/suggest?q=breakng%20bud&limit=14`);
assert.equal(response.status, 200);
const result = await response.json();
assert.equal(result.matchedQuery, "Breaking Bad");
assert.equal(result.items[0].imdbCode, "tt0903747");
assert.ok(!result.items.some(item => item.title === "Air Bud"));
console.log("PASS real catalog: breakng bud → Breaking Bad");

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  await mkdir(".media-cache", { recursive: true });
  for (const width of [360, 390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    let sdkRequests = 0;
    await page.route("https://telegram.org/js/telegram-web-app.js", async route => {
      sdkRequests++;
      await route.fulfill({ contentType: "application/javascript", body: `window.miniAppTest={backs:[],shown:false,ready:0}; window.Telegram={WebApp:{platform:'android',ready(){miniAppTest.ready++},expand(){},safeAreaInset:{top:20,bottom:16},contentSafeAreaInset:{top:10,bottom:8},onEvent(){},offEvent(){},BackButton:{show(){miniAppTest.shown=true},hide(){miniAppTest.shown=false},onClick(fn){miniAppTest.backs.push(fn)},offClick(fn){miniAppTest.backs=miniAppTest.backs.filter(x=>x!==fn)}}}};` });
    });
    await page.goto(`${origin}/browse?type=series`, { waitUntil: "domcontentloaded" });
    assert.equal(sdkRequests, 0, "No Telegram SDK on ordinary website visits");
    await page.goto(`${origin}/mini-app`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.telegramMiniApp === "true");
    await page.getByRole("heading", { name: "امشب چی ببینیم؟" }).waitFor();
    assert.equal(sdkRequests, 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).paddingTop), "20px");
    const input = page.locator('input[name="q"]').first();
    await input.fill("breakng bud");
    const suggestions = page.locator(".suggest-menu:visible");
    await suggestions.getByRole("button", { name: "Breaking Bad", exact: true }).waitFor();
    assert.equal(await suggestions.locator(".suggest-item").first().getAttribute("href"), "/tt0903747");
    await input.fill("");
    await page.screenshot({ path: `.media-cache/mini-app-${width}.png`, fullPage: true });
    await page.getByRole("navigation", { name: "انتخاب بخش" }).getByRole("link", { name: /سریال/ }).click();
    await page.waitForURL("**/browse?type=series");
    await page.waitForFunction(() => window.miniAppTest.shown && window.miniAppTest.backs.length === 1);
    await page.evaluate(() => window.miniAppTest.backs[0]());
    await page.waitForURL("**/mini-app");
    await page.waitForFunction(() => !window.miniAppTest.shown);
    assert.equal(sdkRequests, 1, "SDK stays mounted during navigation");
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS ${width}px Mini App: layout, correction, native Back, safe area, SDK isolation`);
  }
} finally { await browser.close(); }
