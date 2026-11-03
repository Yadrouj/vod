import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import { pathToFileURL } from "node:url";

// An isolated real-component browser fixture, NOT a production route. No Next
// server/build output is touched, so main's parallel build is unaffected.
const require = createRequire(import.meta.url);
const source = {
  videoId: "YE7VzlLtp-4", title: "Big Buck Bunny", channel: "Blender Foundation",
  sourceUrl: "https://www.youtube.com/watch?v=YE7VzlLtp-4",
  thumbnailUrl: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
  evidenceUrl: "https://peach.blender.org/about/", playbackStatus: "not-tested",
};
const command = 'npx yoinks@0.3.1 "https://www.youtube.com/watch?v=YE7VzlLtp-4"';

test("YouTube guidance: responsive keyboard UI, safe clipboard fallback and official embed", { timeout: 90_000 }, async t => {
  const { build } = await import("esbuild");
  const playwrightPath = process.env.PLAYWRIGHT_MODULE || require.resolve("../../.media-cache/browser-tools/node_modules/playwright");
  const playwright = await import(pathToFileURL(playwrightPath).href);
  const { chromium } = playwright.default ?? playwright;
  const bundle = await build({
    stdin: {
      contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
        import {YouTubePlayer} from './components/youtube-player'; import './app/globals.css';
        const root=createRoot(document.getElementById('root'));
        window.fixtureSource=${JSON.stringify(source)};
        window.renderSource=(source,title)=>root.render(<YouTubePlayer source={source} title={title}/>);
        window.renderSource(window.fixtureSource,window.fixtureSource.title);`,
      resolveDir: process.cwd(), loader: "tsx",
    },
    bundle: true, write: false, outfile: "youtube-fixture.js", jsx: "automatic",
    external: ["/fonts/*"], define: { "process.env.NODE_ENV": '"test"' },
  });
  const js = bundle.outputFiles.find(file => file.path.endsWith(".js")).text;
  const css = bundle.outputFiles.find(file => file.path.endsWith(".css")).text;
  const requests = [];
  const server = createServer((request, response) => {
    requests.push(request.url);
    const asset = request.url === "/youtube-fixture.js" ? ["text/javascript", js] :
      request.url === "/youtube-fixture.css" ? ["text/css", css] : request.url === "/" ? ["text/html", `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/youtube-fixture.css"></head><body style="margin:0"><main id="root" style="max-width:960px;padding:16px;margin:auto;min-width:0"></main><script type="module" src="/youtube-fixture.js"></script></body></html>`] : null;
    response.writeHead(asset ? 200 : 404, { "content-type": asset?.[0] || "text/plain" });
    response.end(asset?.[1] || "Not found");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ channel: process.env.YOUTUBE_TEST_BROWSER || "chrome", headless: true });
    await mkdir(".media-cache/youtube-ui-tests", { recursive: true });
    for (const width of [320, 390, 768, 1440]) {
      await t.test(`${width}px: disclosure, command copy, fallback, source change and restrictions`, async () => {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: "block" });
        context.setDefaultTimeout(8000);
        try {
          // No real clipboard is read/written; no external media is fetched.
          await context.addInitScript(() => {
            window.clipboardMode = "success";
            Object.defineProperty(navigator, "clipboard", { configurable: true, get: () => window.clipboardMode === "missing" ? undefined : {
              writeText: async text => {
                if (window.clipboardMode === "reject") throw new Error("Test clipboard permission denial");
                window.copiedCommand = text;
              },
            } });
          });
          const externalRequests = [];
          await context.route("**/*", route => {
            if (new URL(route.request().url()).origin === origin) return route.continue();
            externalRequests.push(route.request().url());
            return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>External media blocked by test</title>" });
          });
          const page = await context.newPage();
          const errors = [], downloads = [];
          page.on("pageerror", error => errors.push(error.message));
          page.on("download", item => downloads.push(item.url()));
          await page.goto(origin, { waitUntil: "networkidle" });
          const guidance = page.locator("[data-youtube-download-guidance]");
          const summary = guidance.locator("summary");
          await summary.waitFor();
          assert.equal(await page.locator("iframe").count(), 0, "embed remains click-to-load");
          assert.equal(externalRequests.length, 0);
          assert.match(await summary.innerText(), /نیازمند ابزار دسکتاپ.*دانلود مستقیم در مرورگر نیست/);
          await summary.focus();
          await page.keyboard.press("Enter");
          const field = page.getByLabel("دستور مخصوص این ویدیو", { exact: true });
          await field.waitFor({ state: "visible" });
          assert.equal(await field.inputValue(), command);
          assert.equal(await field.getAttribute("readonly"), "");
          assert.equal(await field.getAttribute("dir"), "ltr");
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "no horizontal overflow");
          assert.notEqual(await summary.evaluate(node => getComputedStyle(node).outlineStyle), "none", "visible keyboard focus");
          await page.keyboard.press("Space");
          assert.equal(await guidance.evaluate(node => node.open), false);
          await page.keyboard.press("Enter");
          const copy = page.getByRole("button", { name: "کپی دستور دانلود Big Buck Bunny", exact: true });
          assert.ok((await copy.boundingBox()).height >= 44, "touch target at least 44px");
          await copy.click();
          await page.getByRole("status").filter({ hasText: "دستور کپی شد" }).waitFor();
          assert.equal(await page.evaluate(() => window.copiedCommand), command);
          assert.equal(await page.locator("iframe").count(), 0, "copy never starts playback");
          assert.equal(downloads.length, 0, "copy never starts a browser download");
          assert.equal(externalRequests.length, 0, "opening/copying guidance never contacts a downloader or YouTube");
          assert.match(await guidance.innerText(), /هیچ دانلود موفقی تأیید نشده/);
          assert.match(await guidance.innerText(), /Failed to extract any player response/);
          assert.match(await guidance.innerText(), /دور نمی‌زنند/);
          assert.equal(await guidance.getByRole("link", { name: "ویدیوی اصلی در YouTube" }).getAttribute("href"), source.sourceUrl);
          await page.screenshot({ path: `.media-cache/youtube-ui-tests/guidance-${width}.png`, fullPage: true });
          for (const mode of ["reject", "missing"]) {
            await page.evaluate(mode => { window.clipboardMode = mode; }, mode);
            await copy.click();
            await page.getByRole("status").filter({ hasText: "کپی خودکار ممکن نشد" }).waitFor();
            assert.equal(await field.evaluate(node => document.activeElement === node && node.selectionStart === 0 && node.selectionEnd === node.value.length), true, mode);
          }
          await page.getByRole("button", { name: "Play Big Buck Bunny on YouTube", exact: true }).click();
          await page.locator("iframe").waitFor();
          assert.equal(await page.locator("iframe").getAttribute("src"), "https://www.youtube-nocookie.com/embed/YE7VzlLtp-4?rel=0&playsinline=1&autoplay=1");
          assert.equal(await page.locator("iframe").getAttribute("referrerpolicy"), "strict-origin-when-cross-origin");
          await page.evaluate(() => window.renderSource({ ...window.fixtureSource, videoId: "aqz-KE-bpKQ" }, "Blender alternate version"));
          await page.waitForFunction(() => document.querySelector("textarea")?.value.includes("aqz-KE-bpKQ"));
          // A new video's keyed guidance intentionally starts collapsed.
          await page.locator("[data-youtube-download-guidance] summary").click();
          assert.doesNotMatch(await page.getByRole("status").textContent(), /دستور کپی شد|کپی خودکار ممکن نشد/, "copy status resets for a new video");
          await page.evaluate(() => window.renderSource(window.fixtureSource, "Paris Has Fallen"));
          await page.getByText(/گزارش نقض حق نشر/).waitFor();
          assert.equal(await page.locator("textarea, iframe, [data-youtube-download-guidance]").count(), 0);
          await page.evaluate(() => window.renderSource({ ...window.fixtureSource, playbackStatus: "unavailable" }, "Big Buck Bunny"));
          await page.getByText(/دستور دانلود ارائه نمی‌شود/).waitFor();
          assert.equal(await page.locator("textarea, [data-youtube-download-guidance]").count(), 0);
          assert.deepEqual(errors, []);
          assert.deepEqual(downloads, []);
        } finally { await context.close(); }
      });
    }
    assert.ok(!requests.some(url => url.startsWith("/api/") || url.startsWith("/download/")), "no backend proxy or browser-download path");
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
