import { test } from "node:test";
import assert from "node:assert/strict";
import { categoryCounts } from "../../lib/category-counts";

test("counts unique titles per genre, without limiting the number of categories", () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ imdbCode: `tt${i}`, genres: ["Drama", `Genre ${i}`, "Drama", " "] }));
  const counts = categoryCounts([...items, items[0]]);
  assert.equal(counts.length, 31);
  assert.deepEqual(counts[0], ["Drama", 30]);
  assert.equal(counts.find(([genre]) => genre === "Genre 0")?.[1], 1);
});

test("empty archives have no invented categories", () => {
  assert.deepEqual(categoryCounts([]), []);
});
