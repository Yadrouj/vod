import { chromium } from "playwright";
const BASE = process.argv[2] || "http://localhost:3003";
const MP4 =
  "https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-curl-front.mp4";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newContext().then((c) => c.newPage());

page.on("requestfailed", (r) => {
  if (r.url().includes(".mp4"))
    console.log("REQUESTFAILED:", r.failure()?.errorText, "->", r.url().split("/").pop());
});
page.on("response", (r) => {
  if (r.url().includes(".mp4")) console.log("RESPONSE:", r.status(), r.url().split("/").pop());
});

await page.goto(`${BASE}/library/barbell-curl`, { waitUntil: "load" });
await page.evaluate(() => document.querySelector("video")?.play?.().catch(() => {}));
await page.waitForTimeout(4000);

// fetch the mp4 from the page's JS context (no-cors)
const viaFetch = await page.evaluate(async (u) => {
  try {
    const r = await fetch(u, { mode: "no-cors" });
    return `status=${r.status} type=${r.type}`;
  } catch (e) {
    return "fetch-error: " + e.message;
  }
}, MP4);
console.log("page fetch (no-cors):", viaFetch);

// direct top-level navigation to the mp4
try {
  const resp = await page.goto(MP4, { waitUntil: "commit" });
  console.log("direct navigation status:", resp?.status());
} catch (e) {
  console.log("direct navigation error:", e.message);
}

await browser.close();
