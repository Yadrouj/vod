import test from "node:test";
import assert from "node:assert/strict";
import { addMoviezlandProfiles, moviezlandProfile, publisherPosterSource } from "../../lib/moviezland-profiles";
import type { VodCatalogIndex } from "../../lib/types";

test("researched Iranian profiles preserve names, real images and director/cast without fake ratings", () => {
  const item = moviezlandProfile("tt5833462")!;
  assert.equal(item.persianTitle, "چارخونه");
  assert.equal(item.imdbRating, null);
  assert.ok(item.posterUrl?.startsWith("https://"));
  assert.ok(item.credits?.some(credit => credit.name_text === "سروش صحت"));
  assert.equal(moviezlandProfile("unknown"), null);
});

test("profiles participate in browsing once, without polluting the classic-only collection", () => {
  const index = { items: [], sections: [], totalTitles: 0, totalLinks: 0 } as unknown as VodCatalogIndex;
  const result = addMoviezlandProfiles(index);
  assert.ok(result.items.some(item => item.imdbCode === "tt6221028"));
  assert.equal(new Set(result.items.map(item => item.imdbCode)).size, result.items.length);
  assert.equal(addMoviezlandProfiles(result).items.length, result.items.length);
  assert.equal(addMoviezlandProfiles(index, false).items.length, 0);
});

test("poster proxy accepts a known publisher image by ID, never arbitrary URLs", () => {
  assert.equal(publisherPosterSource("unknown"), null);
  assert.equal(publisherPosterSource("https://127.0.0.1/private"), null);
  assert.equal(publisherPosterSource("tt5833462"), null);
  const source = publisherPosterSource("moviezland-0c51bdba203443");
  assert.ok(source?.startsWith("https://movielandz.com/wp-content/uploads/"));
  assert.ok(moviezlandProfile("moviezland-0c51bdba203443")?.posterUrl?.startsWith("/api/publisher-poster/"));
});
