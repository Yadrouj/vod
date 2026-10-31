import test from "node:test";
import assert from "node:assert/strict";
import { looksLikeArchive, parseArchive } from "../scrape-vod-archive.mjs";

function block(heading, id = "tt0111161", type = "movie") {
  return `<hr><h3>1. ${heading}</h3><p><b>IMDb Code:</b> ${id}</p>
    <p><b>Title Type:</b> ${type}</p><p><b>IMDb Rates:</b> 9.3</p>
    <p><b>SoftSub</b></p><p><a href="https://media.example/movies/1994/${id}/Film.1994.1080p.BluRay.mkv">1080p BluRay</a> / 2.71 GB</p>`;
}
test("legacy placeholder and real-year archive headings preserve the same identity", () => {
  const legacy = parseArchive(block("The Shawshank Redemption start_year"))[0];
  const current = parseArchive(block("The Shawshank Redemption 1994"))[0];
  assert.deepEqual(current, legacy);
  assert.equal(current.year, 1994);
  assert.equal(current.title, "The Shawshank Redemption");
  assert.equal(current.links.length, 1);
});
test("series without a year and numeric film titles are retained", () => {
  const items = parseArchive(block("Breaking Bad", "tt0903747", "tvSeries") + block("1917 2019", "tt8579674"));
  assert.equal(items[0].title, "Breaking Bad");
  assert.equal(items[1].title, "1917");
  assert.equal(items[1].year, 2019);
  assert.equal(parseArchive(block("Not a title", "invalid")).length, 0);
});
test("archive health no longer depends on the obsolete start_year placeholder", () => {
  assert.equal(looksLikeArchive(block("The Shawshank Redemption 1994").repeat(200)), true);
  assert.equal(looksLikeArchive("Access denied".repeat(5000)), false);
});
