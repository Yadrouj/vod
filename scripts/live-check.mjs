// Live integration check: real AI coach answer (Z.AI key) + Google Sign-In button render.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.argv[2] || "http://localhost:3002";
await mkdir("scripts/shots", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const gsiErrors = [];
page.on("console", (m) => {
  const t = m.text();
  if (/GSI_LOGGER|origin is not allowed|idpiframe/i.test(t)) gsiErrors.push(t);
});
page.on("dialog", (d) => d.accept());

let failures = 0;
const assert = (l, c) => { console.log(`${c ? "✓" : "✗"} ${l}`); if (!c) failures++; };
const shot = (n) => page.screenshot({ path: `scripts/shots/${n}.png` });

try {
  // seed onboarding
  await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /ساخت برنامه/ }).click();
  await page.waitForURL("**/program");

  // 1) Real AI answer in the coach
  await page.goto(`${BASE}/coach`, { waitUntil: "networkidle" });
  await page.getByPlaceholder(/سؤالت را بنویس/).fill("برای عضله‌سازی بعد از تمرین چی بخورم؟ کوتاه جواب بده.");
  await page.getByRole("button", { name: "ارسال" }).click();
  // an assistant bubble beyond the greeting must appear
  const answered = await page
    .waitForFunction(
      () => {
        const bubbles = document.querySelectorAll(".bg-card.text-ink");
        const last = bubbles[bubbles.length - 1];
        return bubbles.length >= 2 && last && last.textContent && last.textContent.trim().length > 20 && !last.textContent.includes("در حال فکر");
      },
      { timeout: 90000 }
    )
    .then(() => true)
    .catch(() => false);
  assert("AI coach returned a real answer (glm-4.5-flash)", answered);
  if (answered) {
    const reply = await page.evaluate(() => {
      const b = document.querySelectorAll(".bg-card.text-ink");
      return b[b.length - 1].textContent.trim().slice(0, 220);
    });
    const isPersian = /[؀-ۿ]/.test(reply);
    assert("answer is in Persian (no mojibake)", isPersian && !reply.includes("????"));
    console.log("   ↳ پاسخ:", reply.replace(/\s+/g, " ").slice(0, 160) + "…");
  }
  await shot("live-01-coach-answer");

  // 2) Google Sign-In button renders on /login
  // (GSI keeps sockets open, so "networkidle" never fires — wait for "load".)
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  const gsiFrame = await page
    .waitForSelector('iframe[src*="accounts.google.com"]', { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  assert("Google Sign-In button iframe rendered", gsiFrame);
  assert(
    `no GSI origin errors (${gsiErrors.length})`,
    gsiErrors.length === 0
  );
  gsiErrors.slice(0, 3).forEach((e) => console.log("   ⚠", e.slice(0, 160)));
  await shot("live-02-login-google");
} catch (e) {
  console.log("✗ EXCEPTION:", e.message);
  failures++;
  await shot("live-error");
} finally {
  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : "\nALL LIVE CHECKS PASSED");
  process.exit(failures ? 1 : 0);
}
