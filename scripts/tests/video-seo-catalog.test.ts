import assert from "node:assert/strict";
import test from "node:test";
import { findMusicTrack, loadMusicIndex } from "../../lib/music";
import { musicJsonLd } from "../../lib/seo";

const reported = [
  "roz-6a790afae23927", "roz-d570ce5a2a334f", "roz-c1df6976538d39",
  "roz-8a06d6a86ea460", "roz-e2371a46acf2e4", "roz-37cde9c05f4a9f",
  "roz-0b32594e32e815", "roz-d6e23ad697aaa7", "roz-8a8c4fa385e5c7",
];

test("all nine music pages reported by Search Console have complete video thumbnails and dates", async () => {
  const catalog = await loadMusicIndex();
  for (const id of reported) {
    const track = findMusicTrack(catalog, id);
    assert.ok(track, `Reported page missing from catalog: ${id}`);
    const entity = musicJsonLd(track)["@graph"][0] as Record<string, unknown>;
    assert.equal(entity["@type"], "VideoObject", id);
    assert.ok(Array.isArray(entity.thumbnailUrl) && entity.thumbnailUrl.length > 0, id);
    assert.ok(entity.thumbnailUrl.includes(track.coverUrl), `Use the real cover for ${id}`);
    assert.equal(entity.uploadDate, track.publishedAt, id);
  }
});

test("every catalog music-video schema has required fields or degrades to ordinary page metadata", async (t) => {
  const catalog = await loadMusicIndex();
  const videos = catalog.tracks.filter(track => track.kind === "video");
  assert.ok(videos.length > 0, "Music-video catalog must be available (fetch Git LFS data if needed)");
  let complete = 0;
  for (const track of videos) {
    const entity = musicJsonLd(track)["@graph"][0] as Record<string, unknown>;
    if (entity["@type"] === "WebPage") continue;
    complete++;
    assert.equal(entity["@type"], "VideoObject", track.id);
    assert.ok(typeof entity.name === "string" && entity.name.trim(), track.id);
    assert.ok(Array.isArray(entity.thumbnailUrl) && entity.thumbnailUrl.length, track.id);
    for (const thumbnail of entity.thumbnailUrl) {
      const url = new URL(thumbnail);
      assert.match(url.protocol, /^https?:$/, track.id);
      assert.equal(url.username, "", track.id);
    }
    assert.ok(typeof entity.uploadDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(entity.uploadDate), track.id);
    assert.ok(Number.isFinite(Date.parse(entity.uploadDate)), track.id);
    assert.ok(typeof entity.contentUrl === "string", track.id);
  }
  t.diagnostic(`Checked ${videos.length} music videos: ${complete} complete video schemas, ${videos.length - complete} metadata-only fallbacks`);
});
