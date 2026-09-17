import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { signDelivery } from "../lib/telegram-delivery-token.mjs";

const origin = process.env.LOAD_BASE_URL || "http://127.0.0.1:3104";
const secret = process.env.SMOKE_BOT_TOKEN;
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Local fixtures only");
assert.equal(secret, "download-smoke-fixture-only", "Use an isolated app process with a test token; never a live bot");
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
page.setDefaultTimeout(90000);
const errors = []; page.on("pageerror", error => errors.push(error.message));
await mkdir(".media-cache", { recursive: true });
await page.route("**/*", route => {
  const url = new URL(route.request().url());
  if (url.origin !== new URL(origin).origin) return route.abort();
  return route.continue();
});
async function queue(action, extra = {}) {
  const response = await fetch(`${origin}/api/bot/deliveries?${new URLSearchParams({ action, ...extra })}`, { method: "POST", headers: { "x-bot-token": secret } });
  assert.equal(response.status, 200); return response.json();
}
try {
  const index = JSON.parse(await readFile("public/data/music-index.json", "utf8"));
  const track = index.tracks.find(item => item.sources.some(source => source.available !== false && /^https?:/.test(source.url)));
  const source = track.sources.find(item => item.available !== false && /^https?:/.test(item.url));
  const gate = `${origin}/download/continue?${new URLSearchParams({ url: source.url, musicId: track.id, title: "Original music fixture", quality: "320kbps" })}`;
  const started = Date.now();
  await page.goto(gate, { waitUntil: "domcontentloaded", timeout: 120000 });
  // Do not make an automated smoke test retrieve a third-party song. Unit tests
  // verify the exact attachment bytes; this one verifies the real waiting-page UI.
  await page.evaluate(() => window.addEventListener("click", event => {
    if (event.target instanceof Element && event.target.closest("a[download]")) event.preventDefault();
  }, true));
  await page.waitForFunction(() => document.querySelector("a[download]")?.getAttribute("href")?.includes("/api/music/media?"));
  assert.ok(Date.now() - started >= 4800, "Never enables download before the countdown");
  assert.ok(page.url().includes("/download/continue"), "Music attachment does not navigate to an inline player");
  const manual = page.locator("a[download]");
  await manual.waitFor();
  assert.match(await manual.getAttribute("href"), /download=1/);
  await manual.click();
  console.log("PASS music: attachment is enabled only after five seconds and stays on its gate page");

  const token = signDelivery({ chatId: Date.now(), title: "Original movie fixture", quality: "1080p · SoftSub", caption: "Original fixture · IMDb 8.7", sourceUrl: "https://example.com/original-fixture.mp4" }, secret);
  const telegramGate = `${origin}/download/continue?${new URLSearchParams({ delivery: token })}`;
  await fetch(telegramGate); // Telegram link previews must not queue deliveries.
  assert.equal((await queue("claim")).job, null);
  let startedAt = 0;
  page.on("response", response => { if (response.url().endsWith("/api/download/telegram") && response.request().postDataJSON()?.action === "begin") startedAt = Date.now(); });
  await page.goto(telegramGate, { waitUntil: "domcontentloaded" });
  await page.waitForResponse(response => response.url().endsWith("/api/download/telegram") && response.request().postDataJSON()?.action === "queue");
  assert.ok(Date.now() - startedAt >= 4900);
  const { job } = await queue("claim");
  assert.equal(job.title, "Original movie fixture");
  assert.equal(job.sourceUrl, "https://example.com/original-fixture.mp4");
  assert.equal((await queue("claim")).job, null, "A repeated claim cannot resend the same file");
  await queue("finish", { id: job.id }); // Mock Telegram acknowledgement; NO Telegram network call.
  await page.getByText(/فایل به همراه اطلاعات اثر در چت تلگرام شما ارسال شد|The file and its details were sent/).waitFor();
  await page.reload();
  await page.getByText(/فایل به همراه اطلاعات اثر در چت تلگرام شما ارسال شد|The file and its details were sent/).waitFor();
  assert.equal((await queue("claim")).job, null);
  await page.screenshot({ path: ".media-cache/telegram-delivery-mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log("PASS Telegram gate: preview-safe, server-timed wait, single claim, sent status, reload without resend");
} finally { await browser.close(); }
