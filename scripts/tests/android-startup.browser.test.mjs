import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Exercises the exact read-only DOM probe shipped in both APKs, not a recreated expression.
test("Android startup DOM gate waits for the complete document, main content and fonts", { skip: !process.env.PLAYWRIGHT_MODULE, timeout: 30000 }, async () => {
  const source = readFileSync("applications/android-common/src/ir/sarvnema/shell/StartupScreen.java", "utf8");
  const literal = source.match(/private static final String READY = ("(?:\\.|[^"\\])*");/);
  assert.ok(literal);
  const probe = JSON.parse(literal[1]);
  const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
  const browser = await chromium.launch({ channel: process.env.APPS_TEST_BROWSER || "msedge", headless: true });
  const page = await browser.newPage();
  try {
    assert.equal(await page.evaluate(probe), false, "initial blank WebView must stay covered");
    await page.setContent("<!doctype html><title>Loading</title><div>Loading…</div>");
    assert.equal(await page.evaluate(probe), false, "a finished placeholder without main content isn't ready");
    await page.setContent("<!doctype html><main><h1>سرونما</h1><button>پخش</button></main>");
    assert.equal(await page.evaluate(probe), true, "complete page with loaded fonts can request its first frame");
    await page.evaluate(() => Object.defineProperty(document, "fonts", { value: { status: "loading" }, configurable: true }));
    assert.equal(await page.evaluate(probe), false, "no font flash before typography is ready");
    await page.evaluate(() => Object.defineProperty(document, "fonts", { value: { status: "loaded" }, configurable: true }));
    assert.equal(await page.evaluate(probe), true);
    await page.evaluate(() => Object.defineProperty(document, "readyState", { value: "interactive", configurable: true }));
    assert.equal(await page.evaluate(probe), false, "DOMContentLoaded alone isn't full load");
  } finally { await browser.close(); }
});
