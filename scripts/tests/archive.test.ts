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
test("search results keep all, movie and series tabs in IMDb order", () => {
  const searchCatalog = {
    items: [
      { id: "movie-low", imdbCode: "tt100", title: "Movie low", type: "movie", year: 2024, imdbRating: 6, imdbVotes: 20, genres: [], countries: [], languages: [], qualities: [] },
      { id: "series-high", imdbCode: "tt101", title: "Series high", type: "series", year: 2023, imdbRating: 9, imdbVotes: 40, genres: [], countries: [], languages: [], qualities: [] },
      { id: "movie-high", imdbCode: "tt102", title: "Movie high", type: "movie", year: 2022, imdbRating: 8, imdbVotes: 30, genres: [], countries: [], languages: [], qualities: [] },
    ],
  } as unknown as VodCatalogIndex;
  assert.deepEqual(browseVodIndex(searchCatalog, { q: "e" }, 10).items.map(item => item.id), ["series-high", "movie-high", "movie-low"]);
  assert.deepEqual(browseVodIndex(searchCatalog, { q: "e", type: "movie" }, 10).items.map(item => item.id), ["movie-high", "movie-low"]);
  assert.deepEqual(browseVodIndex(searchCatalog, { q: "e", type: "series" }, 10).items.map(item => item.id), ["series-high"]);
});
