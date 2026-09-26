import test from "node:test";
import assert from "node:assert/strict";
import { episodeImages, pageTitle, seasonNumbers, tvCandidates } from "../scrape-tmdb-episode-images.mjs";

const fixture = "<!doctype html><title>Example Show (TV Series 2024) — The Movie Database (TMDB)</title>" +
  "<a data-media-type=\"tv\" href=\"/tv/123-example-show\"><img alt=\"Example Show\"></a>" +
  "<a data-media-type=\"tv\" href=\"/tv/456-other-show\"><img alt=\"Other Show\"></a>" +
  "<a href=\"/tv/123-example-show/season/1\"><img alt=\"season\"></a>" +
  "<div data-episode-number=\"1\"><img class=\"backdrop w-full\" src=\"https://media.themoviedb.org/t/p/w227/a.jpg\" srcset=\"https://media.themoviedb.org/t/p/w227/a.jpg 1x, https://media.themoviedb.org/t/p/w454/a.jpg 2x\" alt=\"Pilot\"></div>" +
  "<div data-episode-number=\"2\"><img class=\"backdrop w-full\" src=\"https://media.themoviedb.org/t/p/w227/b.jpg\" alt=\"Second\"></div>";

test("TMDB season HTML yields distinct high-resolution episode stills", () => {
  const rows = episodeImages(fixture, 1);
  assert.equal(rows.size, 2);
  assert.equal(rows.get(1).imageUrl, "https://media.themoviedb.org/t/p/w454/a.jpg");
  assert.equal(rows.get(2).imageUrl, "https://media.themoviedb.org/t/p/w227/b.jpg");
  assert.notEqual(rows.get(1).imageUrl, rows.get(2).imageUrl);
});

test("TMDB show candidates and season links are parsed without trusting a title-only match", () => {
  assert.deepEqual(tvCandidates(fixture).map(row => row.id), ["123", "456"]);
  assert.deepEqual(seasonNumbers(fixture), [1]);
  assert.deepEqual(pageTitle(fixture), { title: "Example Show", year: 2024 });
});
