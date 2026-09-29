import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildMelodifyCatalog } from "../import-melodify-library.mjs";

const catalog = JSON.parse(await readFile(new URL("../../public/data/melodify-library.json", import.meta.url), "utf8"));

test("Melodify export contains every downloaded track as a catalogued local source", () => {
  assert.ok(catalog.tracks.length >= 4990, "Preserve the verified initial archive while allowing new arrivals");
  assert.equal(new Set(catalog.tracks.map((track) => track.id)).size, catalog.tracks.length);
  assert.ok(catalog.categories.includes("Chill"));
  assert.ok(catalog.categories.includes("پاپ"));
  assert.equal(catalog.categoryCounts.Chill, 731);
  assert.equal(catalog.categoryCounts["پاپ"], 2020);
  for (const track of catalog.tracks) {
    assert.match(track.id, /^melodify-\d+$/u);
    assert.ok(track.moods.length >= 1);
    assert.ok(Number.isFinite(Date.parse(track.addedAt)));
    for (const ref of track.artists) assert.ok(catalog.artists.some(a => a.slug === ref.slug && a.trackIds.includes(track.id)));
    assert.equal(track.sources.length, 1);
    assert.equal(track.sources[0].provider, "melodify");
    assert.equal(track.sources[0].kind, "stream");
    assert.match(track.sources[0].basePath, /^[^/\\]+\.mp3$/iu);
    assert.match(track.sources[0].url, /^https:\/\/sarvnema\.ir\/api\/music\/library\/melodify-\d+\.mp3$/u);
  }
});

const snapshot = { tracks: [{ id: 1, filename: "Song.mp3", title: "ترانه", downloadTitle: "Song",
  quality: "320", tags: ["Chill", "پاپ", "Chill"], artists: [{ name: "رضایا" }], image: "https://example.test/song.jpg" }] };
test("import preserves all tags, canonical singer aliases, arrival dates and stable IDs", () => {
  const baseArtists = [{ slug: "rezaya", name: "رضایا", aliases: ["رضایا"], sourceUrl: "https://example.test/rezaya" }];
  const first = buildMelodifyCatalog(snapshot, {}, "2026-09-01T00:00:00Z", baseArtists);
  const second = buildMelodifyCatalog(snapshot, first, "2026-09-02T00:00:00Z", baseArtists);
  assert.deepEqual(second, first, "An unchanged refresh is idempotent");
  assert.deepEqual(first.tracks[0].moods, ["Chill", "پاپ"]);
  assert.deepEqual(first.categoryCounts, { "Chill": 1, "پاپ": 1 });
  assert.equal(first.tracks[0].artist.slug, "rezaya");
  assert.equal(first.tracks[0].publishedAt, null, "An archive addition is not a new release");
  assert.deepEqual(first.libraryExistingArtistSlugs, ["rezaya"]);
  const changed = buildMelodifyCatalog({ tracks: [{ ...snapshot.tracks[0], tags: ["Workout"] }] }, first, "2026-09-03T00:00:00Z", baseArtists);
  assert.equal(changed.tracks[0].addedAt, first.tracks[0].addedAt);
  assert.deepEqual(changed.tracks[0].moods, ["Workout"]);
});
test("import refuses empty snapshots and unsafe filenames", () => {
  assert.throws(() => buildMelodifyCatalog({ tracks: [] }));
  assert.throws(() => buildMelodifyCatalog({ tracks: [{ ...snapshot.tracks[0], filename: "../secret.mp3" }] }));
});
