// Verifies the Persian (رمق) build + captures screenshots. Default UI is Persian/RTL.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.argv[2] || "http://localhost:3002";
await mkdir("scripts/shots", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  if (t.startsWith("Failed to load resource")) return;
  errs.push("console: " + t);
});
page.on("dialog", (d) => d.accept());

let failures = 0;
const assert = (l, c) => { console.log(`${c ? "✓" : "✗"} ${l}`); if (!c) failures++; };
const shot = (n) => page.screenshot({ path: `scripts/shots/${n}.png` });

try {
  // Onboarding (Persian brand رمق)
  await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" });
  assert("onboarding shows brand رمق", (await page.getByText("رمق").count()) > 0);
  assert("RTL direction", (await page.evaluate(() => document.documentElement.dir)) === "rtl");
  await shot("fa-01-onboarding");
  await page.getByRole("button", { name: /ساخت برنامه/ }).click();
  await page.waitForURL("**/program");
  await shot("fa-02-program");

  // Library + body map
  await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
  await page.locator('a[href^="/library/"]').first().waitFor({ timeout: 15000 });
  assert("library has a body map (2 svg bodies)", (await page.locator("svg").count()) >= 2);
  await shot("fa-03-library");

  // Diet setup -> generate (Iranian foods + Torob)
  await page.goto(`${BASE}/diet`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /شروع/ }).click();
  await page.waitForURL("**/diet/setup");
  await shot("fa-04-diet-setup");
  await page.getByRole("button", { name: /ساخت برنامه‌ی من/ }).click();
  await page.waitForURL(/\/diet$/, { timeout: 15000 });
  assert("diet shows Iranian food (برنج/نان/عدس/…)", (await page.getByText(/برنج|نان|عدس|مرغ|تخم‌مرغ|ماست/).count()) > 0);
  // wait for a live Torob price
  const gotPrice = await page.getByText(/تومان/).first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
  assert("live Torob price loaded (تومان)", gotPrice);
  await shot("fa-05-diet");

  // Market
  await page.goto(`${BASE}/market`, { waitUntil: "networkidle" });
  assert("market lists plans", (await page.locator('a[href^="/market/"]').count()) > 10);
  await shot("fa-06-market");
  await page.locator('a[href^="/market/"]').first().click();
  await page.waitForURL("**/market/**");
  await shot("fa-07-market-detail");

  // Language toggle -> English (LTR)
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "EN" }).click();
  await page.waitForTimeout(400);
  assert("switched to English", (await page.getByText("Let's move.").count()) > 0);
  assert("LTR after switch", (await page.evaluate(() => document.documentElement.dir)) === "ltr");
  await shot("fa-08-home-en");

  assert(`no JS errors (${errs.length})`, errs.length === 0);
  errs.slice(0, 8).forEach((e) => console.log("   ⚠", e));
} catch (e) {
  console.log("✗ EXCEPTION:", e.message);
  failures++;
  await shot("fa-error");
} finally {
  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : "\nALL GOOD — shots in scripts/shots/");
  process.exit(failures ? 1 : 0);
}
