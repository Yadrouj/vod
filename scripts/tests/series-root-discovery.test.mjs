import test from "node:test";
import assert from "node:assert/strict";
import { fetchText, inferSeriesRoots } from "../expand-series-episode-links.mjs";

test("flat episode files produce one directory request, not one media request per episode", () => {
  const item = { links: Array.from({ length: 100 }, (_, index) => ({ url: `https://cdn.example/Series/Example/Example.S01E${index + 1}.1080p.mkv?signature=private` })) };
  assert.deepEqual(inferSeriesRoots(item), ["https://cdn.example/Series/Example/"]);
});
test("group/season roots are deduplicated and non-video links never create roots", () => {
  const item = { links: [
    { url: "https://cdn.example/series/Example/SoftSub/S01/Example.S01E01.mkv" },
    { url: "https://cdn.example/series/Example/SoftSub/S02/Example.S02E01.mkv" },
    { url: "https://cdn.example/subtitle.srt" },
    { url: "javascript:alert(1)" },
  ], sourceDirectoryLinks: [{ url: "https://other.example/series/Example/" }] };
  assert.deepEqual(inferSeriesRoots(item), ["https://cdn.example/series/Example/", "https://other.example/series/Example/"]);
  assert.deepEqual(inferSeriesRoots({ links: [{ url: "https://cdn.example/Example.S01E01.mkv" }] }), []);
});
test("directory crawler rejects media bodies before reading them and bounds metadata responses", async () => {
  const original = globalThis.fetch;
  let cancelled = false;
  try {
    globalThis.fetch = async () => ({ ok: true, headers: new Headers({ "content-type": "video/mp4" }), body: { cancel: async () => { cancelled = true; } }, text: () => { throw new Error("Video body must not be read"); } });
    assert.equal(await fetchText("https://cdn.example/Series/"), null);
    assert.equal(cancelled, true);
    globalThis.fetch = async () => new Response("<title>Index of</title>", { headers: { "content-type": "text/html" } });
    assert.equal(await fetchText("https://cdn.example/Series/"), "<title>Index of</title>");
    globalThis.fetch = async () => new Response(new Uint8Array(8 * 1024 * 1024 + 1), { headers: { "content-type": "text/html" } });
    assert.equal(await fetchText("https://cdn.example/Series/"), null);
  } finally { globalThis.fetch = original; }
});
