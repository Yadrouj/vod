import assert from "node:assert/strict";
import test from "node:test";
import { mirroredImageUrl, sizedImageUrl } from "@/lib/image-url";
import { mirroredTmdbUrl, parseTmdbImageUrl, tmdbFallbackSizes, tmdbImageType } from "@/lib/tmdb-image-path.mjs";
import { resetTmdbUpstreamCooldown, resolveTmdbImage, type TmdbMirrorConfig } from "@/lib/tmdb-mirror";
import { collectTmdbImages, scanTmdbText, sizesForReference } from "../mirror-tmdb-images.mjs";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 2, 3]);
const config: TmdbMirrorConfig = { endpoint: "http://minio.test:9000", bucket: "sarvnema-tmdb", accessKey: "k", secretKey: "s", upstream: true };

test("pages never reference TMDB directly", () => {
  assert.equal(sizedImageUrl("https://image.tmdb.org/t/p/w342/abc123.jpg", 400), "/media/tmdb/w500/abc123.jpg");
  assert.equal(sizedImageUrl("https://image.tmdb.org/t/p/original/abc123.jpg", 1280), "/media/tmdb/w1280/abc123.jpg");
  assert.equal(mirroredImageUrl("https://media.themoviedb.org/t/p/w454_and_h254_face/still.jpg"), "/media/tmdb/w454_and_h254_face/still.jpg");
  assert.equal(mirroredImageUrl("https://m.media-amazon.com/images/M/x.jpg"), "/media/img/m.media-amazon.com/images/M/x.jpg");
  assert.equal(mirroredImageUrl(null), null);
});

test("only well-formed raster TMDB paths are mirrored", () => {
  assert.equal(parseTmdbImageUrl("https://image.tmdb.org/t/p/w500/logo.svg"), null);
  assert.equal(parseTmdbImageUrl("https://image.tmdb.org/t/p/w500/../etc.jpg"), null);
  assert.equal(parseTmdbImageUrl("https://user:pw@image.tmdb.org/t/p/w500/a.jpg"), null);
  assert.equal(parseTmdbImageUrl("https://evil.test/t/p/w500/a.jpg"), null);
  assert.equal(mirroredTmdbUrl("https://image.tmdb.org/t/p/bad size/a.jpg"), "https://image.tmdb.org/t/p/bad size/a.jpg");
});

test("fallback sizes go nearest first and prefer larger ties", () => {
  assert.deepEqual(tmdbFallbackSizes("w185").slice(0, 4), ["w185", "w300", "w342", "w500"]);
  assert.deepEqual(tmdbFallbackSizes("original").slice(0, 2), ["original", "w1280"]);
  assert.deepEqual(tmdbFallbackSizes("w454_and_h254_face"), ["w454_and_h254_face"]);
});

test("image signatures gate what the mirror serves", () => {
  assert.equal(tmdbImageType(JPEG), "image/jpeg");
  assert.equal(tmdbImageType(new TextEncoder().encode("<html>blocked page</html>")), null);
});

test("route serves the nearest mirrored size from MinIO", async () => {
  const seen: string[] = [];
  const fetchImpl = (async (url: string) => {
    seen.push(String(url));
    return String(url).endsWith("/w500/poster1.jpg") ? new Response(JPEG) : new Response(null, { status: 404 });
  }) as typeof fetch;
  const result = await resolveTmdbImage("w342", "poster1.jpg", config, fetchImpl);
  assert.equal(result.kind, "image");
  assert.equal(result.kind === "image" && result.exact, false);
  assert.equal(seen[0], "http://minio.test:9000/sarvnema-tmdb/w342/poster1.jpg");
});

test("route redirects to TMDB when nothing is mirrored and upstream is blocked", async () => {
  resetTmdbUpstreamCooldown();
  let upstreamCalls = 0;
  const fetchImpl = (async (url: string) => {
    if (String(url).startsWith("https://image.tmdb.org/")) { upstreamCalls++; throw new Error("filtered"); }
    return new Response(null, { status: 404 });
  }) as typeof fetch;
  const first = await resolveTmdbImage("w500", "missing.jpg", config, fetchImpl);
  assert.deepEqual(first, { kind: "redirect", location: "https://image.tmdb.org/t/p/w500/missing.jpg" });
  await resolveTmdbImage("w500", "missing2.jpg", config, fetchImpl);
  assert.equal(upstreamCalls, 1, "a blocked upstream is not retried on every request");
  assert.deepEqual(await resolveTmdbImage("w500", "x.svg", config, fetchImpl), { kind: "not-found" });
  resetTmdbUpstreamCooldown();
});

test("mirror script lists the sizes the site requests", () => {
  assert.deepEqual(sizesForReference("posterUrl", "w342"), ["w500"]);
  assert.deepEqual(sizesForReference("backdropUrl", "original"), ["w1280", "w300"]);
  assert.deepEqual(sizesForReference("imageUrl", "w454_and_h254_face"), ["w454_and_h254_face"]);
  const found = collectTmdbImages({ items: [{ posterUrl: "https://image.tmdb.org/t/p/w342/p1.jpg", backdropUrl: "https://image.tmdb.org/t/p/original/b1.jpg" }], other: "https://example.com/x.jpg" });
  assert.deepEqual([...found].sort(), ["w1280/b1.jpg", "w300/b1.jpg", "w500/p1.jpg"]);
});

test("streaming text scan matches the JSON walk, including escaped slashes and bare array items", () => {
  const doc = { items: [{ posterUrl: "https://image.tmdb.org/t/p/w342/p1.jpg", backdropUrl: "https://image.tmdb.org/t/p/original/b1.jpg" }], gallery: ["https://image.tmdb.org/t/p/w185/g1.jpg"] };
  const text = JSON.stringify(doc, null, 2) + '{"posterUrl":"https:\\/\\/image.tmdb.org\\/t\\/p\\/w342\\/esc1.jpg"}';
  const found = [...scanTmdbText(text)].sort();
  assert.deepEqual(found, ["w1280/b1.jpg", "w300/b1.jpg", "w500/esc1.jpg", "w500/g1.jpg", "w500/p1.jpg"]);
});
