import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { mirroredImageUrl, sizedImageUrl } from "@/lib/image-url";
import { externalMirrorPath, parseMirrorableImageUrl, upstreamFromMirrorPath } from "@/lib/image-mirror-path.mjs";
import { externalObjectKey, resetImageMirrorState, resolveExternalImage } from "@/lib/image-mirror";
import type { TmdbMirrorConfig } from "@/lib/tmdb-mirror";
import { mirrorItem, scanExternalText } from "../mirror-tmdb-images.mjs";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 2, 3]);
const config: TmdbMirrorConfig = { endpoint: "http://minio.test:9000", bucket: "sarvnema-tmdb", accessKey: "k", secretKey: "s", upstream: true };

test("external images are rewritten to same-origin paths that round-trip exactly", () => {
  for (const original of [
    "https://static.tvmaze.com/uploads/images/medium_landscape/0/1148.jpg",
    "https://m.media-amazon.com/images/M/MV5Bx@._V1_CR427,126,1366,2049_.jpg",
    "https://img.melodify.pw/covers/%D8%A2%D9%87%D9%86%DA%AF%20one.jpg",
    "https://is3-ssl.mzstatic.com/image/thumb/Music/600x600bb.jpg",
    "http://worldofmusic.ir/wp-content/uploads/a.jpg",
    "https://i.ytimg.com/vi/abc/hqdefault.jpg?sqp=xyz",
  ]) {
    const mirrored = externalMirrorPath(original)!;
    assert.match(mirrored, /^\/media\/img\//);
    const url = new URL(mirrored, "https://sarvnema.ir");
    assert.equal(upstreamFromMirrorPath(url.pathname.slice("/media/img/".length), url.search), new URL(original).href);
  }
});

test("videos, unknown hosts and odd URLs are never mirrored", () => {
  assert.equal(mirroredImageUrl("https://static.tvmaze.com/clip.mp4"), "https://static.tvmaze.com/clip.mp4");
  assert.equal(mirroredImageUrl("https://www.moviesho.com/trailer.m3u8"), "https://www.moviesho.com/trailer.m3u8");
  assert.equal(mirroredImageUrl("https://evil.test/a.jpg"), "https://evil.test/a.jpg");
  assert.equal(mirroredImageUrl("/media/hero/a.webp"), "/media/hero/a.webp");
  assert.equal(parseMirrorableImageUrl("https://static.tvmaze.com:8443/a.jpg"), null);
  assert.equal(parseMirrorableImageUrl("https://static.tvmaze.com/logo.svg"), null);
  assert.equal(upstreamFromMirrorPath("evil.test/a.jpg"), null);
  assert.equal(upstreamFromMirrorPath("static.tvmaze.com/../a.jpg"), null);
});

test("sized IMDb images snap to a few widths and are mirrored", () => {
  const imdb = "https://m.media-amazon.com/images/M/MV5Bposter._V1_.jpg";
  assert.equal(sizedImageUrl(imdb, 400), "/media/img/m.media-amazon.com/images/M/MV5Bposter._V1_QL75_UX480_.jpg");
  assert.equal(sizedImageUrl(imdb, 410), sizedImageUrl(imdb, 470));
  assert.equal(sizedImageUrl("https://intocdn.top/wp-content/uploads/x.webp", 300), "/media/img/intocdn.top/wp-content/uploads/x.webp");
});

test("resolver serves MinIO, then the reachable upstream, then redirects", async () => {
  resetImageMirrorState();
  const dir = await mkdtemp(path.join(os.tmpdir(), "img-mirror-"));
  const upstream = "https://img.melodify.pw/covers/a.jpg";
  const key = externalObjectKey(new URL(upstream));
  assert.equal(key, "ext/img.melodify.pw/covers/a.jpg");
  const puts: string[] = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    if (init?.method === "PUT") { puts.push(String(url)); return new Response(null, { status: 200 }); }
    if (String(url).startsWith("http://minio.test")) return new Response(null, { status: 404 });
    return new Response(JPEG);
  }) as typeof fetch;
  const fetched = await resolveExternalImage(upstream, config, fetchImpl, dir);
  assert.equal(fetched.kind === "image" && fetched.source, "upstream");

  resetImageMirrorState();
  let tvmazeCalls = 0;
  const blocked = (async (url: string) => {
    if (String(url).startsWith("http://minio.test")) return new Response(null, { status: 404 });
    tvmazeCalls++; throw new Error("filtered");
  }) as typeof fetch;
  const a = await resolveExternalImage("https://static.tvmaze.com/uploads/images/a.jpg", config, blocked, dir);
  await resolveExternalImage("https://static.tvmaze.com/uploads/images/b.jpg", config, blocked, dir);
  assert.deepEqual(a, { kind: "redirect", location: "https://static.tvmaze.com/uploads/images/a.jpg" });
  assert.equal(tvmazeCalls, 1, "a filtered host is not retried per request");
  resetImageMirrorState();
});

test("redirects may only lead to allow-listed image hosts", async () => {
  resetImageMirrorState();
  const fetchImpl = (async (url: string) => {
    if (String(url).startsWith("http://minio.test")) return new Response(null, { status: 404 });
    return new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } });
  }) as typeof fetch;
  const result = await resolveExternalImage("https://commons.wikimedia.org/wiki/Special:FilePath/a.jpg", config, fetchImpl);
  assert.equal(result.kind, "redirect");
  resetImageMirrorState();
});

test("nothing is stored when the disk is below the free-space floor", async () => {
  resetImageMirrorState();
  const puts: string[] = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    if (init?.method === "PUT") { puts.push(String(url)); return new Response(null); }
    if (String(url).startsWith("http://minio.test")) return new Response(null, { status: 404 });
    return new Response(JPEG);
  }) as typeof fetch;
  // statfs fails for this directory, which the guard treats as "no room".
  const result = await resolveExternalImage("https://rozmusic.com/covers/b.jpg", config, fetchImpl, "/nonexistent-dir");
  assert.equal(result.kind, "image");
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(puts.length, 0, "an unreadable/full disk never gets writes");
  resetImageMirrorState();
});

test("bulk script lists and keys external URLs like the route does", () => {
  const text = '{"imageUrl":"https://static.tvmaze.com/uploads/images/medium_landscape/0/1148.jpg","x":"https:\\/\\/i.ytimg.com\\/vi\\/a\\/hqdefault.jpg","y":"https://m.media-amazon.com/a.jpg","v":"https://static.tvmaze.com/v.mp4"}';
  const found = [...scanExternalText(text, new Set(["static.tvmaze.com", "i.ytimg.com"]))].sort();
  assert.deepEqual(found, ["https://i.ytimg.com/vi/a/hqdefault.jpg", "https://static.tvmaze.com/uploads/images/medium_landscape/0/1148.jpg"]);
  assert.deepEqual(mirrorItem(found[1]), { key: "ext/static.tvmaze.com/uploads/images/medium_landscape/0/1148.jpg", upstream: found[1] });
  assert.deepEqual(mirrorItem("w500/abc.jpg"), { key: "w500/abc.jpg", upstream: "https://image.tmdb.org/t/p/w500/abc.jpg" });
  assert.equal(mirrorItem("https://evil.test/a.jpg"), null);
});
