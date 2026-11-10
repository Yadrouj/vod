import { test } from "node:test";
import assert from "node:assert/strict";
import { categoryCounts, categoryCardBuckets } from "../../lib/category-counts";

test('one-pass buckets preserve eligible order, case-insensitive genres and unique titles', () => {
  const items = [{ imdbCode: 'a', genres: ['Drama', 'drama'], ready: true }, { imdbCode: 'b', genres: ['DRAMA'], ready: false }, { imdbCode: 'a', genres: ['Drama'], ready: true }, { imdbCode: 'c', genres: ['Drama'], ready: true }];
  assert.deepEqual(categoryCardBuckets(items, item => item.ready).get('drama')?.map(item => item.imdbCode), ['a', 'c']);
});

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
