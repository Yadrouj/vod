import test from "node:test";
import assert from "node:assert/strict";
import { keyboardSearchVariant, searchText, spellingDistance, TypoSearchIndex } from "../../lib/typo-search";
import { selectRankedSuggestions } from "../../lib/vod-search-order";
import { matchVodSearch } from "../../lib/vod-search-match";
import { browseVodIndex } from "../../lib/vod-index";
import type { VodCard, VodCatalogIndex } from "../../lib/types";

const names = ["House", "House of Cards", "House of the Dragon", "The Lighthouse", "Noise", "Horse", "Breaking Bad", "بریکینگ بد", "مهستی", "Mahasti", "Amélie", "کیانی", "1999"];
const index = new TypoSearchIndex(names.map(name => ({ item: name, text: name, names: [name] })));
test("hoise suggests House plus other real alternatives without mixing guesses into results", () => {
  const result = index.search("hoise");
  assert.equal(result.mode, "similar");
  assert.equal(result.matchedQuery, "House");
  assert.ok(result.corrections.includes("Noise") && result.corrections.includes("Horse"));
  assert.ok(result.corrections.length <= 5);
  assert.deepEqual(result.items, ["House", "House of Cards", "House of the Dragon", "The Lighthouse"]);
});
test("insertions, deletions, substitutions, transpositions, multiword typos and spacing", () => {
  for (const query of ["huose", "hoouse"]) assert.equal(index.search(query).matchedQuery, "House");
  for (const query of ["breking bad", "brekaing bad", "breakingbad", "brekin bad"]) assert.equal(index.search(query).matchedQuery, "Breaking Bad", query);
  assert.equal(index.search("بریکینگبد").matchedQuery, "بریکینگ بد");
  assert.equal(spellingDistance("huose", "house", 1), 1);
  assert.ok(spellingDistance("noise", "breaking", 2) > 2);
});
test("valid queries and partial titles are not corrected; ID/numeric/short/garbage inputs are bounded", () => {
  for (const query of ["house", "noise", "hous", "breaking ba"]) {
    assert.equal(index.search(query).mode, "exact");
    assert.deepEqual(index.search(query).corrections, []);
  }
  for (const query of ["zz", "tt0412143", "1998", "!!!!!!!!", "z".repeat(200), "zzzzzzzz"]) assert.deepEqual(index.search(query).items, [], query);
});

test("a typo in every word resolves the entire phrase, never just the second word", () => {
  const names = ["Breaking Bad", "Breaking Bad: Extras", "Air Bud", "Bud", "Buddies", "Bad", "Breaking News", "The Breaking Point",
    ...Array.from({ length: 100 }, (_, i) => `Bearing Buddy ${i}`),
    ...Array.from({ length: 100 }, (_, i) => `Bud Boy ${i}`)];
  const full = new TypoSearchIndex(names.map(item => ({ item, names: [item], text: item })));
  for (const query of ["breakng bud", "breking bed", "brekaing bda", "breakng ba"]) {
    const result = full.search(query);
    assert.equal(result.mode, "similar", query);
    assert.equal(result.matchedQuery, "Breaking Bad", query);
    assert.deepEqual(result.items, ["Breaking Bad", "Breaking Bad: Extras"], query);
    assert.ok(!result.corrections.includes("Bud"));
  }
  assert.deepEqual(full.search("zzzzzz bud").items, []);
  assert.equal(full.search("air bud").mode, "exact");
  assert.deepEqual(full.search("breaking 2026").items, []);
});
test("Persian/Arabic variants, diacritics, accented names and Persian typos", () => {
  assert.equal(searchText(" كِياني  "), "کیانی");
  assert.equal(index.search("مَهْسَتی").mode, "exact");
  assert.equal(index.search("مهستس").matchedQuery, "مهستی");
  assert.equal(index.search("mahsti").matchedQuery, "Mahasti");
  assert.deepEqual(index.search("amelie").items, ["Amélie"]);
});
test("catalog candidates and caches are deterministic and never cross index instances", () => {
  assert.deepEqual(index.search("hoise"), index.search("hoise"));
  const other = new TypoSearchIndex([{ item: "Noise", text: "Noise", names: ["Noise"] }]);
  assert.equal(other.search("hoise").matchedQuery, "Noise");
  assert.equal(index.search("hoise").matchedQuery, "House");
});

test("missing spaces plus multiple misspellings still recover a complete real title", () => {
  for (const query of ["breakngbud", "brekingbad", "brekaingbad"]) assert.equal(index.search(query).matchedQuery,"Breaking Bad",query);
  assert.equal(index.search("hauze").matchedQuery,"House");
  assert.deepEqual(index.search("zzzzzzbud").items,[]);
});

test("wrong Persian keyboard layout recovers a catalog title without changing normal exact queries", () => {
  assert.equal(keyboardSearchVariant("اخعسث"),"house");
  const result=index.search("اخعسث");
  assert.equal(result.mode,"similar");assert.equal(result.matchedQuery,"House");
  assert.equal(index.search("house").mode,"exact");
  assert.equal(keyboardSearchVariant("tt0412142"),"");
});
const card = (title: string, id: string, type: string, rating: number): VodCard => ({
  id, imdbCode: id, title, type, imdbRating: rating, imdbVotes: 100, year: 2004,
  posterUrl: null, backdropUrl: null, genres: ["Drama"], countries: [], languages: [], qualities: ["720p"],
  overview: null, runtimeMinutes: null, groups: [], linksCount: 1,
});
test("submitted browse and suggestions share typo matches, IMDb ordering and type/quality filters", () => {
  const items = [card("House of Sand", "movie", "movie", 7.5), card("House", "tt0412142", "series", 8.7), card("House of Cards", "cards", "series", 8.6)];
  const catalog = { items } as VodCatalogIndex;
  const found = matchVodSearch(items, "hoise");
  assert.equal(found.matchedQuery, "House");
  const browse = browseVodIndex(catalog, { q: "hoise" });
  assert.deepEqual(browse.items.map(item => item.imdbCode), ["tt0412142", "cards", "movie"]);
  assert.deepEqual(browse.corrections, found.corrections);
  assert.equal(browseVodIndex(catalog, { q: "hoise", type: "movie" }).items[0].imdbCode, "movie");
  assert.equal(browseVodIndex(catalog, { q: "hoise", quality: "1080p" }).total, 0);
  assert.deepEqual(matchVodSearch(items, "tt0412142").items.map(item => item.imdbCode), ["tt0412142"]);
  assert.deepEqual(matchVodSearch(items, "tt0412143").items, []);
});

test("IMDb is first across film/series, ahead of recency or exact-name preference", () => {
  const old=card("House","old","series",9.1),fresh=card("House","fresh","movie",7.1),higher=card("House","higher","series",8.5),part=card("House of Dust","part","movie",9.9),substring=card("The Lighthouse","substring","movie",10);
  old.year=2004;fresh.year=higher.year=2026;part.year=2027;substring.year=2028;
  const items=[substring,part,old,fresh,higher];
  const expected=["substring","part","old","higher","fresh"];
  assert.deepEqual(selectRankedSuggestions(items,10,"all","House").map(i=>i.imdbCode),expected);
  assert.deepEqual(browseVodIndex({items} as VodCatalogIndex,{q:"hoise"}).items.map(i=>i.imdbCode),expected);
  assert.deepEqual(selectRankedSuggestions(items,10,"series","House").map(i=>i.imdbCode),["old","higher"]);
});

test("equal IMDb ratings use real search selections, vote count, and current trends in that order", () => {
  const one=card("House","one","series",8),two=card("House of Dust","two","movie",8),three=card("House of Cards","three","series",8),four=card("House Again","four","movie",9);
  one.imdbVotes=1000;two.imdbVotes=300;three.imdbVotes=300;
  const items=[one,two,three,four];
  const signals={searches:{two:10,three:10},trends:{three:1,two:2}};
  assert.deepEqual(selectRankedSuggestions(items,10,"all","house",signals).map(i=>i.imdbCode),["four","three","two","one"]);
  assert.deepEqual(browseVodIndex({items} as VodCatalogIndex,{q:"hoise"},30,signals).items.map(i=>i.imdbCode),["four","three","two","one"]);
  assert.deepEqual(selectRankedSuggestions(items,10,"series","house",signals).map(i=>i.imdbCode),["three","one"]);
});
