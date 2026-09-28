import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = JSON.parse(await readFile(new URL("../../public/data/melodify-library.json", import.meta.url), "utf8"));

test("Melodify export contains every downloaded track as a catalogued local source", () => {
  assert.equal(catalog.tracks.length, 4990);
  assert.equal(new Set(catalog.tracks.map((track) => track.id)).size, catalog.tracks.length);
  assert.ok(catalog.categories.includes("Chill"));
  assert.ok(catalog.categories.includes("پاپ"));
  for (const track of catalog.tracks) {
    assert.match(track.id, /^melodify-\d+$/u);
    assert.ok(track.moods.length >= 1);
    assert.equal(track.sources.length, 1);
    assert.equal(track.sources[0].provider, "melodify");
    assert.equal(track.sources[0].kind, "stream");
    assert.match(track.sources[0].basePath, /^[^/\\]+\.mp3$/iu);
    assert.match(track.sources[0].url, /^https:\/\/sarvnema\.ir\/api\/music\/library\/melodify-\d+\.mp3$/u);
  }
});
