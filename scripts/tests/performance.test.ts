import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter, once } from "node:events";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtemp, writeFile, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RequestLane, RequestBudget, verifiedClientIp, createRequestAdmission } from "../../lib/request-admission";
import { readFileSnapshot, type FileSnapshot } from "../../lib/file-snapshot";
import { searchMusic } from "../../lib/music";
import type { MusicIndex, MusicTrack } from "../../lib/music-types";
import { fetchStreamHeaders } from "../../lib/upstream-stream";

class Reply extends EventEmitter {
  headers: Record<string, unknown> = {}; status = 200; body = ""; destroyed = false; writableEnded = false;
  setHeader(key: string, value: unknown) { this.headers[key] = value; }
  writeHead(status: number, headers: Record<string, unknown>) { this.status = status; Object.assign(this.headers, headers); }
  end(body = "") { this.body = body; this.writableEnded = true; this.emit("finish"); }
  destroy() { this.destroyed = true; this.emit("close"); }
}
const request = (url = "/", accept = "text/html") => ({ url, headers: { accept }, socket: { remoteAddress: "127.0.0.1" } }) as IncomingMessage;
const enter = (lane: RequestLane, reply: Reply, run: () => void) => lane.enter(request(), reply as unknown as ServerResponse, run);

test("bounded FIFO queue drains, rejects excess, and releases once on disconnect", async () => {
  const lane = new RequestLane(1, 1, 500); const first = new Reply(), second = new Reply(), third = new Reply();
  const order: number[] = [];
  enter(lane, first, () => order.push(1)); enter(lane, second, () => order.push(2)); enter(lane, third, () => order.push(3));
  assert.equal(third.status, 503); assert.equal(third.headers["Retry-After"], "5"); assert.match(third.body, /مدیریت صف/);
  assert.equal(lane.active, 1); assert.equal(lane.queued, 1);
  first.destroy(); first.emit("finish");
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(order, [1, 2]); assert.equal(lane.active, 1);
  second.end(); assert.equal(lane.active, 0); assert.equal(lane.queued, 0);
});
test("queued cancellation and deadline do not leak entries", async () => {
  const lane = new RequestLane(1, 2, 15); const first = new Reply(), cancel = new Reply(), expired = new Reply();
  enter(lane, first, () => {}); enter(lane, cancel, () => assert.fail("cancelled job ran")); cancel.destroy();
  enter(lane, expired, () => assert.fail("expired job ran"));
  await once(expired, "finish"); assert.equal(expired.status, 503); assert.equal(lane.queued, 0); first.end();
});
test("rate budgets recover, isolate identities, and keep bounded memory", () => {
  const budget = new RequestBudget(2, 1, 2);
  assert.ok(budget.allow("a", 0)); assert.ok(budget.allow("a", 0)); assert.equal(budget.allow("a", 0), false);
  assert.ok(budget.allow("b", 0)); assert.equal(budget.allow("c", 0), false);
  assert.ok(budget.allow("a", 1000)); assert.ok(budget.allow("c", 4000));
});
test("forwarded addresses are ignored except from explicitly trusted proxy peers", () => {
  const req = request(); req.headers["x-real-ip"] = "198.18.0.5"; req.headers["x-forwarded-for"] = "spoof";
  assert.equal(verifiedClientIp(req, new Set()), "127.0.0.1");
  assert.equal(verifiedClientIp(req, new Set(["127.0.0.1"])), "198.18.0.5");
  req.headers["x-real-ip"] = "invalid";
  assert.equal(verifiedClientIp(req, new Set(["127.0.0.1"])), "127.0.0.1");
});
test("saturated page rendering does not starve media or readiness", () => {
  const gate = createRequestAdmission({ NODE_ENV: "test", HTTP_PAGE_CONCURRENCY: "1", HTTP_QUEUE_LIMIT: "1" });
  const first = new Reply(), second = new Reply(), media = new Reply(), ready = new Reply();
  gate.run(request(), first as unknown as ServerResponse, () => {});
  gate.run(request(), second as unknown as ServerResponse, () => {});
  gate.run(request("/api/watch-party/personal-media/test"), media as unknown as ServerResponse, () => media.end("media"));
  gate.run(request("/readyz"), ready as unknown as ServerResponse, () => ready.end("ready"));
  assert.equal(media.body, "media"); assert.equal(ready.body, "ready");
  second.destroy(); first.end();
});
test("JSON snapshots coalesce cold readers, preserve last good data and refresh", async () => {
  const root = await mkdtemp(join(tmpdir(), "sarvnema-snapshot-")); const file = join(root, "test.json");
  const cache: FileSnapshot<{ value: number }> = {};
  try {
    await writeFile(file, '{"value":1}');
    const values = await Promise.all(Array.from({ length: 100 }, () => readFileSnapshot(file, cache)));
    assert.ok(values.every(value => value === values[0]));
    await writeFile(file, "broken"); await utimes(file, new Date(), new Date(Date.now() + 1000));
    assert.equal((await readFileSnapshot(file, cache, 0)).value, 1);
    await writeFile(file, '{"value":2}'); await utimes(file, new Date(), new Date(Date.now() + 2000));
    assert.equal((await readFileSnapshot(file, cache, 0)).value, 2);
    const missing = join(root, "missing.json"); const cold: FileSnapshot<unknown> = {};
    await assert.rejects(readFileSnapshot(missing, cold)); await writeFile(missing, "{}"); await readFileSnapshot(missing, cold);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("indexed music search preserves relevance, popularity, year and filters on refresh", () => {
  const artist = { name: "ابی", slug: "ebi", sourceUrl: "https://example.com", aliases: [] };
  const track = (id: string, title: string, publishedAt: string, playCount = 0): MusicTrack => ({
    id, title, persianTitle: "", kind: "track", category: "Pop", artist, artists: [artist], publishedAt, playCount,
    coverUrl: null, description: null, sourceUrl: "https://example.com", sources: [],
    folder: { root: "Music", year: null, month: null, day: null },
  });
  const index = { tracks: [track("1", "Love", "2020-01-01"), track("2", "Lovely", "2026-01-01"), track("3", "My Love", "2026-01-01", 200)] } as MusicIndex;
  assert.deepEqual(searchMusic(index, "love").map(t => t.id), ["1", "2", "3"]);
  assert.deepEqual(searchMusic(index, "ابي").map(t => t.id), ["3", "2", "1"]);
  assert.equal(searchMusic(index, "love", "video").length, 0);
  assert.equal(searchMusic({ ...index, tracks: [...index.tracks, track("4", "Love again", "2027-01-01")] }, "love").length, 4);
});
test("media timeout covers headers only; disconnect cancels upstream streaming", async () => {
  let closed = false;
  const server = createServer((_req, res) => { res.writeHead(200); res.write("start"); res.once("close", () => { closed = true; }); });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address() as { port: number }; const controller = new AbortController();
  try {
    const response = await fetchStreamHeaders(`http://127.0.0.1:${address.port}`, new Headers(), controller.signal, 100);
    const reader = response.body!.getReader(); await reader.read();
    await new Promise(resolve => setTimeout(resolve, 140)); assert.equal(closed, false);
    controller.abort(); await assert.rejects(reader.read());
    await new Promise(resolve => setTimeout(resolve, 30)); assert.equal(closed, true);
  } finally { server.closeAllConnections(); server.close(); }
});
