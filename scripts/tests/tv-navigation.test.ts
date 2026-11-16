import assert from "node:assert/strict";
import test from "node:test";
import { nextTVFocus, tvSearchParams, type TVRect } from "../../lib/tv-navigation";
import { releaseKind, sortedQualities } from "../../lib/release-options";

const rect = (left: number, top: number, width = 100, height = 60): TVRect => ({ left, top, width, height });
test("D-pad stays in its rail rather than jumping diagonally to a sidebar", () => {
  assert.equal(nextTVFocus(rect(300, 200), [rect(430, 200), rect(410, 50), rect(1000, 400)], "ArrowRight"), 0);
  assert.equal(nextTVFocus(rect(300, 200), [rect(180, 200), rect(200, 30)], "ArrowLeft"), 0);
});
test("vertical navigation finds the aligned item on the next row, including offscreen rails", () => {
  assert.equal(nextTVFocus(rect(300, 200), [rect(310, 410), rect(40, 300), rect(310, 100)], "ArrowDown"), 0);
  assert.equal(nextTVFocus(rect(300, 200), [rect(310, -110), rect(100, 120)], "ArrowUp"), 0);
});
test("no directional candidate means stay put, never wrap or select behind the user", () => {
  assert.equal(nextTVFocus(rect(300, 200), [rect(100, 200)], "ArrowRight"), -1);
  assert.equal(nextTVFocus(rect(300, 200), [], "ArrowUp"), -1);
});
test("TV search bounds hostile parameters without accepting arbitrary types or years", () => {
  assert.deepEqual(tvSearchParams(new URLSearchParams("q=++house++&type=movie&year=2004&minScore=8&page=2")), { q: "house", type: "movie", genre: "All", year: "2004", minScore: "8", page: "2" });
  const invalid = tvSearchParams(new URLSearchParams({ q: "x".repeat(500), type: "anything", year: "<script>", minScore: "Infinity", page: "NaN", genre: "a".repeat(100) }));
  assert.equal(invalid.q.length, 160); assert.equal(invalid.genre.length, 64);
  assert.equal(invalid.type, "all"); assert.equal(invalid.year, "All"); assert.equal(invalid.page, "1"); assert.equal(invalid.minScore, "0");
  assert.equal(tvSearchParams(new URLSearchParams("page=-9&minScore=50")).page, "1");
  assert.equal(tvSearchParams(new URLSearchParams("page=999999&minScore=50")).page, "10000");
});
test("TV selection reuses canonical version classification and descending actual qualities", () => {
  assert.equal(releaseKind("Persian Dubbed"), "dubbed");
  assert.equal(releaseKind("HardSub"), "hardsub");
  assert.deepEqual(sortedQualities(["480p", "1080p", "720p", "1080p", "2160p"]), ["2160p", "1080p", "720p", "480p"]);
});
