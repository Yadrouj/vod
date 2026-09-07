import assert from "node:assert/strict";
import test from "node:test";
import { browseVodIndex } from "../../lib/vod-index";
import { archiveCard } from "../../lib/archive-cards";
import type { VodCard, VodCatalogIndex } from "../../lib/types";

const items = Array.from({ length: 435 }, (_, index) => ({ id: String(index), imdbCode: `tt${index}`, title: `Film ${index}`, type: "movie", year: 2020, imdbRating: 8, imdbVotes: index, genres: [], countries: [], languages: [], qualities: [], overview: "Long description omitted from archive payload" } as unknown as VodCard));
const catalog = { items } as VodCatalogIndex;
test("archive windows contain at most 200 titles without gaps or overlap", () => {
  const pages = [1, 2, 3].map((page) => browseVodIndex(catalog, { page: String(page) }, 200));
  assert.deepEqual(pages.map((page) => page.items.length), [200, 200, 35]);
  assert.equal(new Set(pages.flatMap((page) => page.items.map((item) => item.id))).size, 435);
  assert.equal(browseVodIndex(catalog, {}).items.length, 30, "Existing consumers retain their page size");
  assert.equal(browseVodIndex(catalog, { page: "Infinity" }, 200).page, 1);
  assert.equal(browseVodIndex(catalog, { page: "1.5" }, 200).page, 1);
  assert.equal(browseVodIndex(catalog, { page: "999" }, 200).page, 3);
});
test("archive payload excludes descriptions and source lists", () => {
  assert.equal("overview" in archiveCard(items[0]), false);
  assert.equal("links" in archiveCard(items[0]), false);
});
