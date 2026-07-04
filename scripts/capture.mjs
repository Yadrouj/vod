// Drives the full app (training + diet) on the restyled build, asserts key things,
// and captures screenshots into scripts/shots/ for visual review.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.argv[2] || "http://localhost:3002";
await mkdir("scripts/shots", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const errs = [];
const badResponses = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  // "Failed to load resource" duplicates network info tracked via responses below.
  if (t.startsWith("Failed to load resource")) return;
  errs.push("console: " + t);
});
page.on("response", (r) => {
  // Only our own routes/assets matter; ignore upstream MuscleWiki 404s (a few posters
  // are missing on their CDN — handled gracefully by a thumbnail fallback).
  if (r.status() >= 400 && r.url().startsWith(BASE)) {
    badResponses.push(`[${r.status()}] ${r.url()}`);
  }
});
page.on("dialog", (d) => d.accept()); // auto-accept "Use this plan" confirms

let failures = 0;
const assert = (l, c) => {
  console.log(`${c ? "✓" : "✗"} ${l}`);
  if (!c) failures++;
};
const shot = (name) => page.screenshot({ path: `scripts/shots/${name}.png` });

try {
  // Onboarding
  await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" });
  await shot("01-onboarding");
  await page.getByRole("button", { name: /Create my program/ }).click();
  await page.waitForURL("**/program");

  // Program: assign Arms, then open day
  await page.getByRole("button", { name: /Arms/ }).first().click();
  await page.waitForTimeout(300);
  await shot("02-program");
  await page.getByRole("link", { name: /Edit exercises/ }).first().click();
  await page.waitForURL("**/program/**");

  // Add an exercise
  await page.getByRole("button", { name: /Add exercises/ }).click();
  await page.getByRole("button", { name: "All parts" }).click();
  await page.getByPlaceholder("Search exercises…").fill("Barbell Curl");
  const card = page.getByRole("button", { name: /Barbell Curl/ }).first();
  await card.waitFor({ timeout: 15000 });
  await card.click();
  await page.getByRole("button", { name: /Done \(/ }).click();
  await shot("03-day-editor");

  // Workout player
  await page.getByRole("link", { name: /Start/ }).first().click();
  await page.waitForURL("**/workout/**");
  await page.locator("video").first().waitFor({ timeout: 15000 });
  await page.evaluate(() => document.querySelector("video")?.play?.().catch(() => {}));
  const vLoaded = await page
    .waitForFunction(() => { const v = document.querySelector("video"); return !!v && v.readyState >= 2; }, { timeout: 15000 })
    .then(() => true).catch(() => false);
  assert("workout video loads", vLoaded);
  await page.waitForTimeout(500);
  await shot("04-workout");

  // Home
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot("05-home");

  // Library
  await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
  await page.locator('a[href^="/library/"]').first().waitFor({ timeout: 15000 });
  await shot("06-library");

  // Diet setup
  await page.goto(`${BASE}/diet`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Get started/ }).click();
  await page.waitForURL("**/diet/setup");
  await shot("07-diet-setup");
  await page.getByRole("button", { name: /Generate my plan/ }).click();
  await page.waitForURL(/\/diet$/, { timeout: 15000 });

  // Diet overview assertions
  await page.getByText(/Daily target/).waitFor({ timeout: 10000 });
  assert("diet shows Breakfast meal", (await page.getByText(/Breakfast/).count()) > 0);
  assert("diet shows kcal target", (await page.getByText(/kcal/).count()) > 0);
  assert("diet shows a supplement", (await page.getByText(/Creatine|protein|Omega|Vitamin/).count()) > 0);
  await shot("08-diet");

  // Week view
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await page.waitForTimeout(400);
  assert("week view shows Day labels", (await page.getByText(/Day 1/).count()) > 0);
  await shot("09-diet-week");

  // Marketplace
  await page.goto(`${BASE}/market`, { waitUntil: "networkidle" });
  assert("marketplace lists plans", (await page.locator('a[href^="/market/"]').count()) > 10);
  await shot("10-market");

  // Gym plan preview + apply
  await page.getByRole("link", { name: /Beginner Full-Body/ }).first().click();
  await page.waitForURL("**/market/**");
  await page.getByText("Weekly schedule").waitFor({ timeout: 15000 });
  assert("gym plan preview lists exercises", (await page.locator("li").count()) > 4);
  await shot("11-market-gym");
  await page.getByRole("button", { name: /Use this plan/ }).click();
  await page.waitForURL(/\/program$/, { timeout: 15000 });
  assert("applied gym plan -> program built", (await page.getByText(/exercises/).count()) > 0);

  // Diet plan preview
  await page.goto(`${BASE}/market`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /High-Protein Cut/ }).first().click();
  await page.waitForURL("**/market/**");
  await page.getByText("Sample day").waitFor({ timeout: 10000 });
  assert("diet plan shows sample day", (await page.getByText(/kcal/).count()) > 0);
  await shot("12-market-diet");

  assert(`no JS errors (${errs.length})`, errs.length === 0);
  errs.slice(0, 8).forEach((e) => console.log("   ⚠", e));
  assert(`no same-origin request failures (${badResponses.length})`, badResponses.length === 0);
  badResponses.slice(0, 8).forEach((e) => console.log("   ⚠", e));
} catch (e) {
  console.log("✗ EXCEPTION:", e.message);
  failures++;
  await shot("error");
} finally {
  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : "\nALL GOOD — shots in scripts/shots/");
  process.exit(failures ? 1 : 0);
}
