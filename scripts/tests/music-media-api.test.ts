import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("music relay preserves Safari byte ranges, bounds HEAD probes, rejects HTML and identifies missing library files", async t => {
  const cwd = process.cwd(), previous = process.env.MELODIFY_LIBRARY_DIR;
  const root = await mkdtemp(path.join(os.tmpdir(), "sarvnema-music-media-"));
  try {
    await mkdir(path.join(root, "public", "data"), { recursive: true });
    const source = { url: "https://dl.rozmusic.com/fixture.mp3", kind: "stream", provider: "rozmusic" };
    const local = { url: "https://sarvnema.ir/api/music/library/melodify-fixture.mp3", kind: "stream", provider: "melodify", basePath: "fixture.mp3" };
    const tracks = [{ id: "fixture", title: "Fixture", kind: "track", artists: [], sources: [source] }, { id: "local", title: "Local fixture", kind: "track", artists: [], sources: [local] }];
    await writeFile(path.join(root, "public", "data", "music-index.json"), JSON.stringify({ tracks, artists: [], categories: [], scanned: {} }));
    process.chdir(root); delete process.env.MELODIFY_LIBRARY_DIR;
    let html = false, calls = 0;
    t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, options?: RequestInit) => {
      calls++; const headers = new Headers(options?.headers);
      assert.equal(headers.get("Accept-Encoding"), "identity"); assert.equal(headers.get("Range"), "bytes=0-1");
      return html ? new Response("<html>login</html>", { headers: { "Content-Type": "text/html" } })
        : new Response(new Uint8Array([73, 68]), { status: 206, headers: { "Content-Type": "application/octet-stream", "Content-Range": "bytes 0-1/9999", "Content-Length": "2" } });
    });
    const { GET, HEAD } = await import("../../app/api/music/media/route");
    const url = "https://sarvnema.ir/api/music/media?" + new URLSearchParams({ id: "fixture", url: source.url });
    const response = await GET(new Request(url, { headers: { Range: "bytes=0-1" } }));
    assert.equal(response.status, 206); assert.equal(response.headers.get("Content-Type"), "audio/mpeg");
    assert.equal(response.headers.get("Accept-Ranges"), "bytes"); assert.match(response.headers.get("Cache-Control")!, /no-store/);
    assert.equal((await response.arrayBuffer()).byteLength, 2);
    const head = await HEAD(new Request(url, { method: "HEAD" }));
    assert.equal(head.status, 200); assert.equal(head.headers.get("Content-Length"), "9999"); assert.equal(head.headers.get("Content-Range"), null);
    html = true; assert.equal((await GET(new Request(url, { headers: { Range: "bytes=0-1" } }))).status, 502);
    const missing = await GET(new Request("https://sarvnema.ir/api/music/media?" + new URLSearchParams({ id: "local", url: local.url })));
    assert.equal(missing.status, 503); assert.equal((await missing.json()).code, "MUSIC_LIBRARY_UNAVAILABLE");
    assert.equal(missing.headers.get("X-Sarvnema-Media-Error"), "library-unavailable"); assert.equal(calls, 3);
  } finally {
    t.mock.restoreAll(); process.chdir(cwd);
    if (previous === undefined) delete process.env.MELODIFY_LIBRARY_DIR; else process.env.MELODIFY_LIBRARY_DIR = previous;
    assert.ok(path.resolve(root).startsWith(path.join(path.resolve(os.tmpdir()), "sarvnema-music-media-")));
    await rm(root, { recursive: true, force: true });
  }
});
