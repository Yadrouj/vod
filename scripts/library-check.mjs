// Smoke test the library browse -> filter -> detail -> video path.
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3002";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newContext({ viewport: { width: 420, height: 900 } }).then((c) => c.newPage());

let failures = 0;
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text()));
const assert = (l, c) => { console.log(`${c ? "✓" : "✗"} ${l}`); if (!c) failures++; };

try {
  await page.goto(`${BASE}/library`, { waitUntil: "load" });
  const firstCard = page.locator('a[href^="/library/"]').first();
  await firstCard.waitFor({ timeout: 15000 });
  assert("library renders exercise cards", (await page.locator('a[href^="/library/"]').count()) > 5);

  // Filter by a body part
  await page.getByRole("button", { name: /💪 Arms/ }).click();
  await page.waitForTimeout(400);
  assert("body-part filter keeps results", (await page.locator('a[href^="/library/"]').count()) > 0);

  // Equipment filter
  await page.getByRole("button", { name: "Dumbbells", exact: true }).click();
  await page.waitForTimeout(400);
  assert("equipment filter works", (await page.locator('a[href^="/library/"]').count()) > 0);

  // Open a detail page and confirm the video loads
  await page.locator('a[href^="/library/"]').first().click();
  await page.waitForURL("**/library/**");
  const video = page.locator("video").first();
  await video.waitFor({ timeout: 15000 });
  await page.evaluate(() => document.querySelector("video")?.play?.().catch(() => {}));
  const loaded = await page
    .waitForFunction(() => { const v = document.querySelector("video"); return !!v && v.readyState >= 2; }, { timeout: 15000 })
    .then(() => true).catch(() => false);
  assert("detail page video loads", loaded);
  assert("detail shows how-to steps", (await page.getByText("How to").count()) > 0);

  assert(`no page/console errors (${errs.length})`, errs.length === 0);
  errs.slice(0, 5).forEach((e) => console.log("   ⚠", e));
} catch (e) {
  console.log("✗ EXCEPTION:", e.message);
  failures++;
} finally {
  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : "\nLIBRARY OK");
  process.exit(failures ? 1 : 0);
}
