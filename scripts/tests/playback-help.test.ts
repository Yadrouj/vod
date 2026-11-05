import test from "node:test";
import assert from "node:assert/strict";
import { isDonyayeSerial, matchesPlaybackSource, needsPlaybackBuffer, playbackFailureText, preferredPlaybackIndex, recoverySources } from "../../lib/playback-help";
import type { VodLink } from "../../lib/types";
import { GET } from "../../app/api/viewer-connection/route";

test("recovery prefers another server and never moves to another episode", () => {
  const source = { url: "https://example.com/DonyayeSerial/a.mkv", season: 1, episode: 2, group: "SoftSub" } as VodLink;
  const dub = { ...source, url: "https://other.example/a.mkv", group: "Dubbed" };
  const sameServer = { ...source, url: "https://example.com/DonyayeSerial/b.mkv" };
  const nextEpisode = { ...dub, episode: 3 };
  assert.deepEqual(recoverySources(source, [source, sameServer, nextEpisode, dub]).map(r => r.index), [3, 1]);
});

test("regional hints target DonyayeSerial, not every failing source", () => {
  assert.equal(isDonyayeSerial({ url: "https://dls3.aparatchi-dlcenter.top/DonyayeSerial/a.mkv" }), true);
  assert.equal(isDonyayeSerial({ sourceProvider: "donyaye-serial" }), true);
  assert.equal(isDonyayeSerial({ url: "https://example.com/movie.mp4" }), false);
  assert.match(playbackFailureText(4, true), /کُدک/);
  assert.doesNotMatch(playbackFailureText(2, true), /VPN/);
});

test("a source failure can prefer a genuinely different server without changing the episode", () => {
  const source = { url: "https://cdn.test/a.mkv", season: 1, episode: 1 } as VodLink;
  const sameServer = { ...source, url: "https://cdn.test/a.720p.mkv" };
  const independent = { ...source, url: "https://other.test/DonyayeSerial/a.mkv" };
  const nextEpisode = { ...independent, episode: 2 };
  assert.deepEqual(recoverySources(source, [source, sameServer, independent, nextEpisode], { differentServerFirst: true }).map(row => row.index), [2, 1]);
  assert.deepEqual(recoverySources(source, [source, sameServer, independent]).map(row => row.index), [1, 2], "Initial provider policy is unchanged");
});

test("verified CDN migration preserves explicit selection and passive resume episode", () => {
  const source = { url: "https://cdn.test/Friends.S01E02.mkv", sourceOriginalUrl: "https://old.test/Friends.S01E02.mkv", season: 1, episode: 2 } as VodLink;
  const sources = [{ ...source, url: "https://cdn.test/Friends.S01E01.mkv", sourceOriginalUrl: null, episode: 1 }, source];
  assert.equal(matchesPlaybackSource(source, source.sourceOriginalUrl!), true);
  assert.equal(matchesPlaybackSource(source, undefined), false);
  assert.equal(preferredPlaybackIndex(sources, source.sourceOriginalUrl!), 1);
  assert.equal(preferredPlaybackIndex(sources, undefined, source.sourceOriginalUrl!), 1);
});

test("stalled network notifications do not fail paused metadata or playable buffered video", () => {
  const media = { error: null, paused: false, readyState: 4, ended: false, seeking: false };
  assert.equal(needsPlaybackBuffer(media), false);
  assert.equal(needsPlaybackBuffer({ ...media, paused: true, readyState: 1 }), false);
  assert.equal(needsPlaybackBuffer({ ...media, paused: true, readyState: 1 }, true), true);
  assert.equal(needsPlaybackBuffer({ ...media, readyState: 2 }), true);
  assert.equal(needsPlaybackBuffer({ ...media, paused: true, seeking: true, readyState: 1 }), true);
  assert.equal(needsPlaybackBuffer({ ...media, readyState: 0 }), true);
  assert.equal(needsPlaybackBuffer({ ...media, readyState: 0, ended: true }), false);
});
test("connection information is unknown without trusted proxy configuration, private and never cached", async () => {
  const before = process.env.TRUST_VIEWER_CONNECTION_HEADERS;
  delete process.env.TRUST_VIEWER_CONNECTION_HEADERS;
  try {
    const response = GET(new Request("https://example.test/api/viewer-connection", { headers: { "x-real-ip": "8.8.8.8", "cf-ipcountry": "US" } }));
    assert.deepEqual(await response.json(), { ip: null, country: null });
    assert.match(response.headers.get("cache-control")!, /private, no-store/);
  } finally { if (before === undefined) delete process.env.TRUST_VIEWER_CONNECTION_HEADERS; else process.env.TRUST_VIEWER_CONNECTION_HEADERS = before; }
});
test("only configured trusted headers are used; invalid addresses and unknown countries are not displayed", async () => {
  const names = ["TRUST_VIEWER_CONNECTION_HEADERS", "VIEWER_IP_HEADER", "VIEWER_COUNTRY_HEADER"];
  const previous = names.map(name => process.env[name]);
  Object.assign(process.env, { TRUST_VIEWER_CONNECTION_HEADERS: "1", VIEWER_IP_HEADER: "x-test-ip", VIEWER_COUNTRY_HEADER: "x-test-country" });
  try {
    const result = async (ip: string, country: string) => GET(new Request("https://example.test", { headers: { "x-test-ip": ip, "x-test-country": country } })).json();
    assert.deepEqual(await result("1.2.3.4", "IR"), { ip: "1.2.3.4", country: "IR" });
    assert.deepEqual(await result("not-an-ip", "XX"), { ip: null, country: null });
  } finally { names.forEach((name, index) => { if (previous[index] === undefined) delete process.env[name]; else process.env[name] = previous[index]; }); }
});
