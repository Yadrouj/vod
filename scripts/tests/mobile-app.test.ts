import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { countryFilms, validCountry, viewerCountry } from "../../lib/country-discovery";
import type { VodCard } from "../../lib/types";
import manifest from "../../app/manifest";

test("country discovery validates region hints and matches localized countries", () => {
  assert.equal(validCountry("ir"), "IR");
  for (const input of [null, "XX", "ZZ", "EU", "UN", "QQ", "../../IR", "Iran"]) assert.equal(validCountry(input), null);
  const cards = [
    { id: "a", imdbCode: "a", type: "movie", countries: ["ایران"], year: 2020, posterUrl: "a.jpg" },
    { id: "b", imdbCode: "b", type: "movie", countries: ["Iran"], year: 2026, posterUrl: "b.jpg" },
    { id: "b", imdbCode: "b", type: "movie", countries: ["Iran"], year: 2026, posterUrl: "b.jpg" },
    { id: "c", imdbCode: "c", type: "series", countries: ["Iran"], year: 2026, posterUrl: "c.jpg" },
    { id: "d", imdbCode: "d", type: "movie", countries: ["USA"], year: 2026, posterUrl: "d.jpg" },
  ] as VodCard[];
  assert.deepEqual(countryFilms(cards, "IR").map(card => card.id), ["b", "a"]);
  assert.deepEqual(countryFilms(cards, "US").map(card => card.id), ["d"]);
});

test("country detection is disabled unless explicitly trusted; no locale/IP inference", () => {
  const previous = { trusted: process.env.TRUST_VIEWER_CONNECTION_HEADERS, header: process.env.VIEWER_COUNTRY_HEADER };
  try {
    delete process.env.TRUST_VIEWER_CONNECTION_HEADERS;
    process.env.VIEWER_COUNTRY_HEADER = "x-test-country";
    const headers = new Headers({ "x-test-country": "IR", "cf-ipcountry": "IR", "accept-language": "fa", "x-forwarded-for": "1.2.3.4" });
    assert.equal(viewerCountry(headers), null);
    process.env.TRUST_VIEWER_CONNECTION_HEADERS = "1";
    assert.equal(viewerCountry(headers), "IR");
    headers.set("x-test-country", "XX"); assert.equal(viewerCountry(headers), null);
  } finally {
    if (previous.trusted === undefined) delete process.env.TRUST_VIEWER_CONNECTION_HEADERS; else process.env.TRUST_VIEWER_CONNECTION_HEADERS = previous.trusted;
    if (previous.header === undefined) delete process.env.VIEWER_COUNTRY_HEADER; else process.env.VIEWER_COUNTRY_HEADER = previous.header;
  }
});

test("PWA manifest has Android-sized icons, scope and cinema/music shortcuts", () => {
  const app = manifest();
  assert.equal(app.display, "standalone"); assert.equal(app.scope, "/"); assert.equal(app.lang, "fa-IR");
  assert.ok(app.icons?.some(icon => icon.sizes === "192x192"));
  assert.ok(app.icons?.some(icon => icon.sizes === "512x512" && icon.purpose === "maskable"));
  assert.equal(app.shortcuts?.length, 2);
});

test("offline worker does not intercept media, private APIs, RSC, or external navigation", async () => {
  const handlers: Record<string, (event: unknown) => void> = {};
  vm.runInNewContext(await readFile("public/sw.js", "utf8"), {
    self: { location: { origin: "https://example.test" }, addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; } },
    URL, Response, fetch: () => Promise.reject(new Error("offline")), caches: { match: async () => new Response("Offline shell") },
  });
  const intercepted: Promise<Response>[] = [];
  function request(path: string, mode = "navigate", method = "GET", range = false) {
    handlers.fetch({ request: { url: new URL(path, "https://example.test").href, method, mode, headers: { has: () => range } }, respondWith: (response: Promise<Response>) => intercepted.push(response) });
  }
  request("/api/music/media?track=1"); request("/watch/tt123", "cors"); request("/api/rooms", "navigate", "POST");
  request("/movie.mp4"); request("/music/track.mp3"); request("/watch/tt123", "navigate", "GET", true); request("https://another.test/watch/tt1");
  assert.equal(intercepted.length, 0);
  request("/watch/tt123"); request("/"); request("/music/artists/ebi");
  assert.equal(intercepted.length, 3);
  for (const response of intercepted) assert.equal(await (await response).text(), "Offline shell");
});
