import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { io } from "socket.io-client";

const origin = process.env.TEST_ORIGIN || "http://localhost:3004";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Local player test only");
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || path.resolve(".media-cache/browser-tools/node_modules/playwright/index.mjs")).href);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const wave = Buffer.alloc(44 + 16000 * 60);
wave.write("RIFF"); wave.writeUInt32LE(wave.length - 8, 4); wave.write("WAVEfmt ", 8); wave.writeUInt32LE(16, 16);
wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22); wave.writeUInt32LE(8000, 24); wave.writeUInt32LE(16000, 28);
wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34); wave.write("data", 36); wave.writeUInt32LE(wave.length - 44, 40);
try {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, serviceWorkers: "block" });
    await context.addCookies([{ name: "vod_locale", value: "fa", url: origin }]);
    let blocked = "router";
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === new URL(origin).origin) return route.continue();
      if (request.resourceType() !== "media") return route.abort();
      if ((blocked === "router" && url.hostname === "cdnzz.tmk51.ir.cdn.ir") || (blocked === "all" && url.hostname.endsWith("tmk51.ir.cdn.ir"))) return route.abort();
      const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers().range || "");
      const start = Number(range?.[1] || 0), end = Math.min(Number(range?.[2] || wave.length - 1), wave.length - 1);
      return route.fulfill({ status: range ? 206 : 200, contentType: "audio/wav", body: wave.subarray(start, end + 1),
        headers: { "Accept-Ranges": "bytes", ...(range ? { "Content-Range": `bytes ${start}-${end}/${wave.length}` } : {}) } });
    });
    const page = await context.newPage(); page.setDefaultNavigationTimeout(60000);
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    try {
      await page.goto(`${origin}/watch/tt0108778`, { waitUntil: "domcontentloaded" });
      const panel = page.locator("main [data-player-recovery]:visible");
      const video = page.locator("main video.player:visible");
      await page.waitForFunction(() => [...document.querySelectorAll("main video.player")].some(el => el.readyState >= 3 && el.currentSrc.includes("edge07")));
      assert.equal(await panel.count(), 0, "Closed router connections automatically use the next verified endpoint");
      assert.match(await video.getAttribute("src"), /Friends\.S01E01/);
      blocked = "all";
      await page.goto(`${origin}/watch/tt0108778`, { waitUntil: "domcontentloaded" });
      await panel.waitFor();
      assert.equal(new URL(await video.getAttribute("src")).hostname, "edge08.tmk51.ir.cdn.ir", "Automatic delivery attempts terminate");
      assert.ok(await panel.getAttribute("data-playback-error-code"), "Native failure code is exposed");
      // All three F2MY qualities use one server. The next action must actually
      // leave that server, without advancing the episode or reloading the page.
      await panel.getByRole("button", { name: "منبع بعدی", exact: true }).click();
      await page.waitForFunction(() => [...document.querySelectorAll("main video.player")].some(el => el.readyState >= 2 && el.currentSrc.includes("DonyayeSerial")));
      assert.match(await video.getAttribute("src"), /Friends\.S01E01/);
      assert.equal(await panel.count(), 0);

      blocked = false;
      await page.goto(`${origin}/watch/tt0108778`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => [...document.querySelectorAll("main video.player")].some(el => el.readyState >= 3 && el.currentSrc.includes("cdnzz")));
      await page.clock.install();
      // Force an in-flight buffering UI, then let the old 20s deadline expire
      // even though the browser still has playable data. No false error overlay.
      await video.evaluate(el => el.dispatchEvent(new Event("waiting")));
      await page.locator("main .player-loading:visible").waitFor();
      await page.clock.fastForward(21000);
      assert.equal(await panel.count(), 0, "A stalled notification is not a fatal error when buffered data is usable");
      await page.locator("main .player-loading:visible").waitFor({ state: "hidden" });

      await video.evaluate(el => {
        Object.defineProperty(el, "error", { configurable: true, value: { code: 3, message: "PIPELINE_ERROR_DECODE: fixture https://cdn.test/video?token=private" } });
        el.dispatchEvent(new Event("error"));
      });
      await panel.waitFor();
      assert.equal(await panel.getAttribute("data-playback-error-code"), "3");
      await panel.locator("summary").click();
      assert.match(await panel.locator("code").innerText(), /PIPELINE_ERROR_DECODE/);
      assert.doesNotMatch(await panel.locator("code").innerText(), /token=private/);
      await video.evaluate(el => { el.dataset.oldElement = "true"; });
      await panel.getByRole("button", { name: "تازه‌سازی پخش", exact: true }).click();
      await page.waitForFunction(() => [...document.querySelectorAll("main video.player")].some(el => el.readyState >= 3 && !el.dataset.oldElement));
      assert.equal(await panel.count(), 0, "Retry creates a clean element and removes the previous codec failure");
      assert.deepEqual(errors, []);
      // Receiving metadata is not enough while the user's play() is pending.
      // A slow source must retain its watchdog and move to a bounded fallback,
      // rather than silently waiting forever at 0:00 with no recovery controls.
      await video.evaluate(el => {
        el.pause(); el.dataset.pendingPlayback = "true";
        Object.defineProperty(el, "readyState", { configurable: true, value: 1 });
        el.play = () => new Promise(() => {});
      });
      await page.locator("main .pro-player:visible > button[data-player-ui]").click();
      await video.evaluate(el => el.dispatchEvent(new Event("loadedmetadata")));
      await page.locator("main .player-loading:visible").waitFor();
      await page.clock.fastForward(9000);
      await page.waitForFunction(() => [...document.querySelectorAll("main video.player")].some(el => !el.dataset.pendingPlayback && el.currentSrc.includes("edge07") && el.readyState >= 2));
      assert.equal(await panel.count(), 0, "Pending playback survives metadata and recovers on another delivery route");
      // A room participant's local transport fallback must not change the
      // authoritative shared source, time, permissions, or episode.
      const host = io(origin, { transports: ["websocket"], autoConnect: false });
      await new Promise((resolve, reject) => { host.once("connect", resolve); host.once("connect_error", reject); host.connect(); });
      const emit = (name, data) => new Promise((resolve, reject) => host.timeout(8000).emit(name, data, (error, value) => error ? reject(error) : resolve(value)));
      try {
        const profile = { id: `delivery-smoke-${width}-${Date.now()}`, name: "Delivery test", avatarUrl: null };
        const source = { url: "https://cdnzz.tmk51.ir.cdn.ir/pnot/Series/Friends/S01/Friends.S01E01.720p.Farsi.Sub.Film2Media.mkv", label: "Friends S01E01", season: 1, episode: 1 };
        const room = await emit("room:create", { profile, media: { itemId: "delivery-fixture", title: "Delivery test", posterUrl: null, source, sources: [source] } });
        assert.ok(room.ok, room.error);
        await page.evaluate(profile => localStorage.setItem("sarvnema_party_profile", JSON.stringify(profile)), profile);
        blocked = "router";
        await page.goto(`${origin}/watch-together/${room.roomId}?invite=${encodeURIComponent(room.inviteToken)}`, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => { const el = document.querySelector(".party-player-stage > video"); return el?.readyState >= 3 && el.currentSrc.includes("edge07"); });
        const joined = await emit("room:join", { roomId: room.roomId, inviteToken: room.inviteToken, profile });
        assert.equal(joined.snapshot.playback.media.source.url, source.url, "Local fallback does not replace the shared source");
        assert.equal(joined.snapshot.playback.media.source.episode, 1);
        host.emit("playback:command", { roomId: room.roomId, action: "seek", time: 17 });
        await page.waitForFunction(() => Math.abs((document.querySelector(".party-player-stage > video")?.currentTime ?? 0) - 17) < 1);
        assert.match(await page.locator(".party-player-stage > video").getAttribute("src"), /edge07/, "Shared seek still reaches the local alternate transport");
      } finally { host.disconnect(); }
      console.log(JSON.stringify({ width, directCdn: true, automaticDeliveryFallback: true, boundedAttempts: true, differentServerRecovery: true, sameEpisode: true, noFalseStall: true, details: true, cleanRetry: true, pendingPlayRecovery: true, roomLocalFallback: true }));
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
