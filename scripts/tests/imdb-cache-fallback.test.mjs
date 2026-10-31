import test from "node:test";
import assert from "node:assert/strict";
import { enrichItem } from "../enrich-vod-imdb.mjs";
test("stale IMDb fallback fills gaps without downgrading current source votes, title or year", () => {
  const item = { id: "tt1234567", imdbCode: "tt1234567", title: "Current title", year: 2026, type: "movie", imdbRating: 8.1, imdbVotes: 12000, links: [{ url: "retained" }] };
  const basics = new Map([[item.id, {primaryTitle:"Old title",startYear:2025,titleType:"movie",genres:["Drama"]}]]);
  const ratings = new Map([[item.id, {averageRating:7.4,numVotes:3000}]]);
  const result = enrichItem(item, basics, ratings, true);
  assert.equal(result.title, item.title); assert.equal(result.year, 2026);
  assert.equal(result.imdbRating, 8.1); assert.equal(result.imdbVotes, 12000);
  assert.equal(result.imdb.averageRating, 8.1); assert.deepEqual(result.links, item.links);
  assert.equal(enrichItem({...item,imdbRating:null},basics,ratings,true).imdbRating,7.4);
  assert.equal(enrichItem(item,basics,ratings,false).imdbRating,7.4);
});
