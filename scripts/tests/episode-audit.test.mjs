import assert from "node:assert/strict";
import test from "node:test";
import { dedupeSeriesByImdb } from "../audit-series-episode-images.mjs";

test("episode audit counts one row per IMDb series", () => {
  const rows = dedupeSeriesByImdb([
    { imdbCode: "tt1234567", title: "Duplicate", posterUrl: null, genres: [] },
    { imdbCode: "tt1234567", title: "Duplicate", posterUrl: "poster.jpg", genres: ["Drama"] },
    { imdbCode: "tt7654321", title: "Other", genres: [] },
    { imdbCode: "legacy-no-imdb", title: "Unsupported" },
  ]);
  assert.deepEqual(rows.map((row) => row.imdbCode), ["tt1234567", "tt7654321"]);
  assert.equal(rows[0].posterUrl, "poster.jpg");
});
