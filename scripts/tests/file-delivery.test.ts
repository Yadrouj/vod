import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { signDelivery, verifyDelivery, telegramDeliveryLink } from "../../lib/telegram-delivery-token.mjs";
import { DeliveryStore } from "../../lib/telegram-delivery-store";
import { sendDeliveryFile, publicIPv4, telegramFileLimit } from "../telegram-file-delivery.mjs";
import { musicAttachment, resolveMusicDownload } from "../../lib/music-download";
import { loadMusicIndex } from "../../lib/music";
import { GET as musicMedia } from "../../app/api/music/media/route";
import { POST as deliveryApi } from "../../app/api/download/telegram/route";
import { POST as workerApi } from "../../app/api/bot/deliveries/route";

const input = { chatId: 123, title: "فیلم آزمایشی", quality: "1080p · SoftSub", caption: "Film · 2026 · IMDb 8.7", sourceUrl: "https://media.example/film.mp4" };

test("signed delivery is recipient-bound, expiring and fails closed", () => {
  const token = signDelivery(input, "test-secret", 1000);
  assert.equal(verifyDelivery(token, "test-secret", 2000)?.chatId, 123);
  assert.equal(verifyDelivery(token, "wrong", 2000), null);
  assert.equal(verifyDelivery(token, "", 2000), null);
  assert.equal(verifyDelivery(token, "test-secret", 3601000), null);
  const [payload, signature] = token.split(".");
  assert.equal(verifyDelivery(`${payload}.${"ی".repeat(43)}`, "test-secret", 2000), null);
  const tampered = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), chatId: 999 })).toString("base64url");
  assert.equal(verifyDelivery(`${tampered}.${signature}`, "test-secret", 2000), null);
  assert.throws(() => signDelivery({ ...input, chatId: -5 }, "test-secret"));
  assert.throws(() => signDelivery({ ...input, sourceUrl: "file:///secret" }, "test-secret"));
});

test("bot links contain real quality/episode details and are disabled for groups", () => {
  const file = { url: `https://site.test/download/continue?${new URLSearchParams({ url: input.sourceUrl })}`, quality: "720p", group: "Dubbed" };
  const item = { title: "Series", year: 2026, imdbRating: 8.7, genres: ["Drama"], urls: { detail: "https://site.test/tt1" } };
  const link = telegramDeliveryLink(123, file, item, "test-secret", "https://site.test", "S02E03");
  assert.ok(link);
  const value = verifyDelivery(new URL(link).searchParams.get("delivery"), "test-secret");
  assert.equal(value?.sourceUrl, input.sourceUrl);
  assert.match(value?.caption, /IMDb 8.7/);
  assert.match(value?.quality, /720p · Dubbed · S02E03/);
  assert.equal(telegramDeliveryLink(-123, file, item, "test-secret", "https://site.test"), null);
});

test("durable queue enforces five seconds and claims once across workers/reloads", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "sarvnema-queue-test-"));
  try {
    const store = new DeliveryStore(root), other = new DeliveryStore(root), now = Date.now();
    const ticket = verifyDelivery(signDelivery(input, "secret", now), "secret", now);
    const waiting = await store.begin(ticket, now);
    assert.equal(waiting.readyAt, now + 5000);
    assert.equal((await other.begin(ticket, now + 1000)).readyAt, waiting.readyAt);
    assert.equal(await store.claim(now), null);
    await assert.rejects(store.enqueue(ticket.id, now + 4999));
    await store.enqueue(ticket.id, now + 5000);
    const claims = await Promise.all(Array.from({ length: 8 }, (_, i) => (i % 2 ? store : other).claim(now + 5001)));
    assert.equal(claims.filter(Boolean).length, 1);
    assert.equal((await store.state(ticket.id)).status, "sending");
    await other.finish(ticket.id);
    assert.equal((await store.enqueue(ticket.id, now + 6000)).status, "sent");
    assert.equal(await store.claim(now + 6001), null);
    await assert.rejects(store.state("../escape"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("crashed uploads become uncertain instead of sending a second copy", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "sarvnema-lease-test-"));
  try {
    const store = new DeliveryStore(root), now = Date.now();
    const ticket = verifyDelivery(signDelivery(input, "secret", now), "secret", now);
    await store.begin(ticket, now - 6000); await store.enqueue(ticket.id, now); await store.claim(now);
    await utimes(path.join(root, ticket.id, "active"), new Date(now - 26 * 60000), new Date(now - 26 * 60000));
    assert.equal(await store.claim(now), null);
    assert.equal((await store.state(ticket.id)).error, "delivery_unknown");
    assert.equal(await store.claim(now + 1), null);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("upload uses actual multipart bytes and caption, without live Telegram calls", async () => {
  const bytes = Buffer.from("original-test-media-bytes");
  let uploads = 0;
  const openSource = async () => Object.assign(Readable.from([bytes]), { headers: { "content-length": String(bytes.length) } });
  const sent = await sendDeliveryFile(input, { telegram: "https://telegram.test/botfixture", maxBytes: 500,
    openSource, sendFetch: async (url, options) => {
      uploads++;
      assert.equal(url, "https://telegram.test/botfixture/sendDocument");
      const form = options?.body as FormData;
      assert.equal(form.get("chat_id"), "123");
      assert.equal(form.get("caption"), input.caption);
      const file = form.get("document") as File;
      assert.match(file.name, /\.mp4$/);
      assert.deepEqual(Buffer.from(await file.arrayBuffer()), bytes);
      return Response.json({ ok: true, result: { message_id: 12 } });
    } });
  assert.equal(uploads, 1); assert.equal(sent.messageId, 12);
});

test("oversized, chunked oversized and HTML sources never reach Telegram", async () => {
  for (const [content, headers, error] of [
    [Buffer.alloc(100), { "content-length": "100" }, "file_too_large"],
    [Buffer.alloc(100), {}, "file_too_large"],
    [Buffer.from("<!doctype html>not media"), {}, "source_unavailable"],
  ] as const) {
    await assert.rejects(sendDeliveryFile(input, { telegram: "https://telegram.test", maxBytes: 50,
      openSource: async () => Object.assign(Readable.from([content]), { headers }),
      sendFetch: async () => { assert.fail("Must not upload invalid media"); },
    }), new RegExp(error));
  }
  assert.equal(telegramFileLimit({ NODE_ENV: "test" }), 50_000_000);
  assert.equal(telegramFileLimit({ NODE_ENV: "test", TELEGRAM_LOCAL_API: "1", TELEGRAM_API_BASE_URL: "http://bot-api:8081" }), 2_000_000_000);
  for (const ip of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "172.16.0.2", "192.168.1.1", "100.64.0.1", "::1", "::ffff:127.0.0.1"]) assert.equal(publicIPv4(ip), false, ip);
  assert.equal(publicIPv4("8.8.8.8"), true);
});

test("attachment keeps Unicode filename safe and relay preserves playback semantics", async () => {
  assert.match(musicAttachment("آهنگ\r\n\"bad", "https://media.test/song.mp3"), /^attachment; filename="SarvNema.mp3"; filename\*=UTF-8''/);
  assert.ok(!musicAttachment("x\r\ny", "https://media.test/song.mp3").includes("\r"));
  const track = (await loadMusicIndex()).tracks.find(item => item.sources.some(source => source.available !== false && /^https?:/.test(source.url)));
  assert.ok(track, "Catalog needs a track");
  const source = track.sources.find(item => item.available !== false && /^https?:/.test(item.url))!;
  const target = await resolveMusicDownload(source.url, track.id);
  assert.match(target!, /download=1/);
  assert.equal(await resolveMusicDownload("https://not-in-catalog.test/song.mp3", track.id), null);
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response("fixture", { headers: { "Content-Type": "audio/mpeg", "Content-Disposition": "attachment" } });
  try {
    const downloaded = await musicMedia(new Request(`https://site.test${target}`));
    assert.equal(downloaded.status, 200); assert.match(downloaded.headers.get("Content-Disposition")!, /^attachment/); await downloaded.text();
    const playback = await musicMedia(new Request(`https://site.test${target!.replace("&download=1", "")}`));
    assert.equal(playback.headers.get("Content-Disposition"), null); await playback.text();
    globalThis.fetch = async () => new Response("blocked", { headers: { "Content-Type": "text/html" } });
    assert.equal((await musicMedia(new Request(`https://site.test${target}`))).status, 502);
  } finally { globalThis.fetch = previous; }
});

test("public and worker delivery endpoints reject forged tickets/missing configuration", async () => {
  const previous = process.env.BOT_API_TOKEN;
  try {
    delete process.env.BOT_API_TOKEN;
    assert.equal((await workerApi(new Request("https://site.test/api/bot/deliveries?action=claim", { method: "POST" }))).status, 401);
    assert.equal((await deliveryApi(new Request("https://site.test/api/download/telegram", { method: "POST", body: JSON.stringify({ token: "forged", action: "queue" }) }))).status, 401);
    assert.equal((await deliveryApi(new Request("https://site.test/api/download/telegram", { method: "POST", body: "x".repeat(17000) }))).status, 413);
  } finally { if (previous === undefined) delete process.env.BOT_API_TOKEN; else process.env.BOT_API_TOKEN = previous; }
});
