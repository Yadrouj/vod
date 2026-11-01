import test from "node:test";
import assert from "node:assert/strict";
import { exactImdbIdentities } from "../imdb-exact-source-identities.mjs";

const rows = [
  "tconst\ttitleType\tprimaryTitle\toriginalTitle\tisAdult\tstartYear",
  "tt1234567\tmovie\tA Perfect Film\tUn film parfait\t0\t2026",
  "tt1234568\tmovie\tA Perfect Film\tA Perfect Film\t0\t1980",
  "tt1234569\tshort\tA Perfect Film\tA Perfect Film\t0\t2026",
  "tt1234570\ttvSeries\tA Show\tA Show\t0\t2025",
  "tt1234571\ttvSeries\tA Show\tA Show\t0\t1990",
  "tt1234572\ttvMiniSeries\tUnique Show\tUnique Show\t0\t2026",
];

test("official identities require exact movie title, release year and full-film type", async () => {
  const result = await exactImdbIdentities(rows, [
    { kind: "movie", title: "Un.film.parfait", year: 2026 },
    { kind: "movie", title: "A Perfect Film", year: null },
    { kind: "movie", title: "A Perfect", year: 2026 },
  ]);
  assert.deepEqual(result.identities.map(item => item.id), ["tt1234567"]);
  assert.equal(result.resolvedRequests, 1);
  assert.equal(result.unresolved[0].reason, "missing-release-year");
});

test("same-name series remakes remain ambiguous without a release year", async () => {
  const result = await exactImdbIdentities(rows, [
    { kind: "series", title: "A Show", year: null },
    { kind: "series", title: "Unique Show", year: null },
  ]);
  assert.deepEqual(result.identities.map(item => item.id), ["tt1234572"]);
  assert.equal(result.unresolved[0].reason, "ambiguous-exact-title");
  assert.equal(result.unresolved[0].candidates.length, 2);
});

test("filename punctuation and accents do not block a full exact match", async () => {
  const result = await exactImdbIdentities([
    "tt1234567\tmovie\tDaddy's Home\tDaddy's Home\t0\t2015",
    "tt1234568\tmovie\tCingöz Recai\tCingöz Recai\t0\t2017",
    "tt1234569\tmovie\tFast & Furious\tFast & Furious\t0\t2009",
  ], [
    { kind: "movie", title: "Daddys.Home", year: 2015 },
    { kind: "movie", title: "Cingoz Recai", year: 2017 },
    { kind: "movie", title: "Fast and Furious", year: 2009 },
  ]);
  assert.equal(result.resolvedRequests, 3);
  assert.deepEqual(result.identities[0].sourceTitleAliases, ["Daddys.Home"]);
});
