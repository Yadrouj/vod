// Verifies the service worker actually registers and activates (production build only).
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3002";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newContext().then((c) => c.newPage());

let failures = 0;
const assert = (l, c) => {
  console.log(`${c ? "✓" : "✗"} ${l}`);
  if (!c) failures++;
};

try {
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  const reg = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return null;
    const r = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((res) => setTimeout(() => res(null), 12000)),
    ]);
    if (!r) return null;
    return { scope: r.scope, active: !!r.active, state: r.active?.state };
  });
  assert("service worker registered & activated", Boolean(reg?.active));
  if (reg) console.log(`   scope=${reg.scope} state=${reg.state}`);
} catch (e) {
  console.log("✗ EXCEPTION:", e.message);
  failures++;
} finally {
  await browser.close();
  console.log(failures ? `${failures} FAILED` : "SW OK");
  process.exit(failures ? 1 : 0);
}
