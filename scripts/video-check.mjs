// Confirms MuscleWiki videos actually LOAD (not just that the <video src> is set),
// and reports any media.musclewiki.com responses with their status + whether the SW handled them.
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3002";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newContext().then((c) => c.newPage());

const media = [];
page.on("response", (r) => {
  const u = r.url();
  if (u.includes("media.musclewiki.com")) {
    let fromSW = false;
    try {
      fromSW = r.fromServiceWorker();
    } catch {}
    media.push({ status: r.status(), fromSW, url: u.split("/").pop() });
  }
});

await page.goto(`${BASE}/library/barbell-curl`, { waitUntil: "load" });
const video = page.locator("video").first();
await video.waitFor({ timeout: 15000 });
await page.evaluate(() => {
  const v = document.querySelector("video");
  if (v) {
    v.muted = true;
    return v.play().catch(() => {});
  }
});
await page.waitForTimeout(4000);

const state = await page.evaluate(() => {
  const v = document.querySelector("video");
  return v
    ? { readyState: v.readyState, networkState: v.networkState, error: v.error?.code ?? null, currentSrc: v.currentSrc }
    : null;
});

console.log("media.musclewiki.com responses:");
for (const m of media) console.log(`  ${m.status} ${m.fromSW ? "(SW)" : "     "} ${m.url}`);
console.log("\nvideo element state:", JSON.stringify(state));
console.log(
  state && state.readyState >= 2
    ? "\n✓ VIDEO LOADED (has playable data)"
    : "\n✗ VIDEO DID NOT LOAD"
);
await browser.close();
process.exit(state && state.readyState >= 2 ? 0 : 1);
