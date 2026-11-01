import test from "node:test";
import assert from "node:assert/strict";
import { curatedSourceType } from "../curated-source-type.mjs";

test("anime is a genre, not proof that a full film is a series", () => {
  assert.equal(curatedSourceType({ type: "anime", link: "https://example.test/anime/wolf-children/", title: "دانلود انیمه Wolf Children" }), "movie");
  assert.equal(curatedSourceType({ type: "anime", title: "دانلود انیمه سریالی Psyren" }), "tvSeries");
  assert.equal(curatedSourceType({ type: "series", title: "House" }), "tvSeries");
  assert.equal(curatedSourceType({ link: "https://example.test/series/made-in-korea/" }), "tvSeries");
});
