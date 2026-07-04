// End-to-end smoke test of the full user flow, driven through the system Chrome.
// Onboarding -> program -> add exercise -> workout (video + set logging + rest) -> save -> history.
//
// Usage: node scripts/e2e.mjs [baseURL]

import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3001";
const log = (...a) => console.log(...a);
let failures = 0;
function assert(label, cond) {
  log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failures++;
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await context.newPage();

const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  // Ignore upstream MuscleWiki media 404s (a few posters are missing on their CDN).
  if (t.startsWith("Failed to load resource")) return;
  pageErrors.push("console: " + t);
});

try {
  // 1) Onboarding ---------------------------------------------------------
  await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /♀ Female/ }).click();
  await page.getByRole("button", { name: /Advanced/ }).first().click();
  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: /Create my program/ }).click();
  await page.waitForURL("**/program", { timeout: 15000 });
  assert("onboarding saved and routed to /program", page.url().endsWith("/program"));

  // 2) Assign a focus + open the day -------------------------------------
  await page.getByRole("button", { name: /Arms/ }).first().click();
  await page.getByRole("link", { name: /Edit exercises/ }).first().click();
  await page.waitForURL("**/program/**");
  assert("opened day editor", /\/program\/[^/]+$/.test(page.url()));

  // 3) Add an exercise via the picker ------------------------------------
  await page.getByRole("button", { name: /Add exercises/ }).click();
  await page.getByRole("button", { name: "All parts" }).click();
  const search = page.getByPlaceholder("Search exercises…");
  await search.fill("Barbell Curl");
  const card = page.getByRole("button", { name: /Barbell Curl/ }).first();
  await card.waitFor({ timeout: 15000 });
  await card.click();
  await page.getByRole("button", { name: /Done \(/ }).click();
  assert(
    "exercise added to the day",
    (await page.getByText(/Barbell Curl/i).count()) > 0
  );

  // 4) Start the workout --------------------------------------------------
  await page.getByRole("link", { name: /Start/ }).first().click();
  await page.waitForURL("**/workout/**");
  const video = page.locator("video").first();
  await video.waitFor({ timeout: 15000 });
  const src = await video.getAttribute("src");
  assert("workout video uses the same-origin proxy", Boolean(src && src.startsWith("/api/media?u=")));
  // Actually load it and confirm the browser has playable data (readyState >= 2).
  await page.evaluate(() => document.querySelector("video")?.play?.().catch(() => {}));
  const loaded = await page
    .waitForFunction(
      () => {
        const v = document.querySelector("video");
        return !!v && v.readyState >= 2;
      },
      { timeout: 15000 }
    )
    .then(() => true)
    .catch(() => false);
  assert("video actually loads & plays (readyState>=2)", loaded);

  // 5) Log one set (-> rest), then skip through the rest of the workout ----
  await page.getByRole("button", { name: /Done set/ }).first().click();
  const restBtn = page.getByRole("button", { name: /Skip rest/ });
  const sawRest = await restBtn
    .waitFor({ timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  assert("rest timer appeared after a set", sawRest);
  if (sawRest) await restBtn.click();

  // Skip remaining exercises to reach the summary (auto-generated days are long).
  for (let i = 0; i < 60; i++) {
    if (await page.getByText("Workout complete!").isVisible().catch(() => false)) break;
    const skipEx = page.getByRole("button", { name: "Skip", exact: true });
    const skipRest = page.getByRole("button", { name: /Skip rest/ });
    if (await skipEx.isVisible().catch(() => false)) await skipEx.click();
    else if (await skipRest.isVisible().catch(() => false)) await skipRest.click();
    await page.waitForTimeout(120);
  }
  assert(
    "reached workout-complete screen",
    await page.getByText("Workout complete!").isVisible().catch(() => false)
  );

  // 6) Save -> history ----------------------------------------------------
  await page.getByRole("button", { name: /Save workout/ }).click();
  await page.waitForURL("**/history");
  const savedOk = await page
    .getByText(/Saturday/)
    .first()
    .waitFor({ timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  assert("session saved to history", savedOk);
  assert(
    "history shows logged sets",
    (await page.getByText(/\d+ sets/).count()) > 0
  );

  // 7) No runtime errors --------------------------------------------------
  assert(
    `no page/console errors (${pageErrors.length})`,
    pageErrors.length === 0
  );
  if (pageErrors.length) pageErrors.slice(0, 8).forEach((e) => log("   ⚠", e));
} catch (err) {
  log("✗ EXCEPTION:", err.message);
  failures++;
  await page.screenshot({ path: "scripts/e2e-failure.png" }).catch(() => {});
} finally {
  await browser.close();
  log(`\n${failures === 0 ? "E2E PASSED" : failures + " CHECK(S) FAILED"}`);
  process.exit(failures ? 1 : 0);
}
