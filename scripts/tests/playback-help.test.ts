import test from "node:test";
import assert from "node:assert/strict";
import { isDonyayeSerial, playbackFailureText, recoverySources } from "../../lib/playback-help";
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
