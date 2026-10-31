import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { GET as getState, PUT as putState } from "../../app/api/bot/channel/state/route";
import { GET as getData } from "../../app/api/bot/channel/data/[name]/route";

const TOKEN = "route-test-token";
const authed = { "x-bot-token": TOKEN };
const stateUrl = "https://site.example/api/bot/channel/state";
const data = (name: string, init?: RequestInit) =>
  getData(new Request(`https://site.example/api/bot/channel/data/${name}`, init), { params: Promise.resolve({ name }) });

async function sandbox(t: test.TestContext) {
  const root = await mkdtemp(path.join(tmpdir(), "channel-routes-"));
  process.env.BOT_API_TOKEN = TOKEN;
  process.env.TELEGRAM_CHANNEL_DATA_DIR = path.join(root, "channel");
  process.env.VOD_DATA_DIR = root;
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("routes refuse everyone when the server has no token configured", async t => {
  await sandbox(t);
  delete process.env.BOT_API_TOKEN;
  assert.equal((await getState(new Request(stateUrl))).status, 401);
  assert.equal((await putState(new Request(stateUrl, { method: "PUT", body: "{}" }))).status, 401);
  assert.equal((await data("vod-updates")).status, 401);
});

test("a wrong token is rejected", async t => {
  await sandbox(t);
  assert.equal((await getState(new Request(stateUrl, { headers: { "x-bot-token": "wrong" } }))).status, 401);
});

test("state starts null, then round-trips through gzip", async t => {
  await sandbox(t);
  assert.deepEqual(await (await getState(new Request(stateUrl, { headers: authed }))).json(), { document: null });
  const saved = await putState(new Request(stateUrl, {
    method: "PUT", headers: { ...authed, "content-encoding": "gzip" }, body: gzipSync(JSON.stringify({ posts: { a: 1 } })),
  }));
  assert.equal(saved.status, 200);
  assert.deepEqual(await (await getState(new Request(stateUrl, { headers: authed }))).json(), { document: { posts: { a: 1 } } });
});

test("invalid uploads leave the stored state untouched", async t => {
  await sandbox(t);
  await putState(new Request(stateUrl, { method: "PUT", headers: authed, body: '{"good":true}' }));
  for (const body of ["<!DOCTYPE html>", "[1]", "null"]) {
    assert.equal((await putState(new Request(stateUrl, { method: "PUT", headers: authed, body }))).status, 400);
  }
  assert.deepEqual(await (await getState(new Request(stateUrl, { headers: authed }))).json(), { document: { good: true } });
});

test("unknown documents are rejected", async t => {
  await sandbox(t);
  const response = await putState(new Request(`${stateUrl}?document=../../x`, { method: "PUT", headers: authed, body: "{}" }));
  assert.equal(response.status, 400);
  await assert.rejects(stat(path.join(process.env.TELEGRAM_CHANNEL_DATA_DIR!, "..", "..", "x.json")));
});

test("catalogue files are gzip streamed with an ETag; other names are 404", async t => {
  const root = await sandbox(t);
  await writeFile(path.join(root, "vod-updates.json"), '{"items":[1]}');
  await writeFile(path.join(root, "secret.json"), "{}");
  const first = await data("vod-updates", { headers: authed });
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("content-encoding"), "gzip");
  assert.equal(gunzipSync(Buffer.from(await first.arrayBuffer())).toString(), '{"items":[1]}');
  const tag = first.headers.get("etag")!;
  assert.equal((await data("vod-updates", { headers: { ...authed, "if-none-match": tag } })).status, 304);
  for (const name of ["secret", "../secret", "constructor", "music-index"]) {
    assert.equal((await data(name, { headers: authed })).status, 404);
  }
});
