import test from "node:test";
import assert from "node:assert/strict";
import { downloadGateUrl } from "../../lib/download-gate";
import { botFilterFacets, parseBotSearchParams, searchBotItems } from "../../lib/bot-catalog";
import type { VodCard } from "../../lib/types";

const card = (title: string, type = "series", year = 2026, country = "United States"): VodCard => ({
  id: title, imdbCode: title, title, type, year, imdbRating: title === "Breaking Bad" ? 9.5 : 8, imdbVotes: 100,
  genres: ["Drama"], countries: [country], languages: [], qualities: ["1080p"], groups: [], linksCount: 1,
  overview: null, runtimeMinutes: null, posterUrl: null, backdropUrl: null,
});

test("bot search accepts the curated section aliases and keeps ten-item pagination", () => {
  const params = parseBotSearchParams(new URLSearchParams("section=top-250&type=movie&limit=10&minImdb=8"));
  assert.equal(params.section, "top-imdb");
  assert.equal(params.type, "movie");
  assert.equal(params.limit, 10);
  assert.equal(params.minImdb, 8);
});

test("bot download links stay on the five-second site gate", () => {
  const url = downloadGateUrl({ url: "https://cdn.example.test/movie.mkv", title: "Example", quality: "1080p" });
  assert.match(url, /^\/download\/continue\?/);
  assert.match(url, /url=https%3A%2F%2Fcdn\.example\.test/);
  assert.match(url, /title=Example/);
});

test("bot search shares whole-phrase correction with the site and keeps type/page filters", () => {
  const items = [card("Air Bud", "movie"), card("Breaking Bad"), card("Breaking News", "movie"), card("Bud")];
  const result = searchBotItems(items, parseBotSearchParams(new URLSearchParams("q=breakng+bud&sort=relevance")), "https://sarvnema.ir");
  assert.equal(result.matchedQuery, "Breaking Bad");
  assert.equal(result.mode, "similar");
  assert.deepEqual(result.corrections, ["Breaking Bad"]);
  assert.deepEqual(result.items.map(item => item.title), ["Breaking Bad"]);
  assert.equal(searchBotItems(items, parseBotSearchParams(new URLSearchParams("q=zzzzzz+bud")), "https://sarvnema.ir").pagination.total, 0);
  assert.equal(searchBotItems(items, parseBotSearchParams(new URLSearchParams("q=breakng+bud&type=movie")), "https://sarvnema.ir").pagination.total, 0);
});

test("facet years are numeric descending, independent of counts, and scoped to type/filters", () => {
  const items = [card("new"), ...Array.from({ length: 5 }, (_, i) => card(`old${i}`, "series", 2024)), card("film", "movie", 2025, "Iran"), card("local", "series", 2023, "Iran")];
  const scope = parseBotSearchParams(new URLSearchParams("type=series&country=United+States"));
  assert.deepEqual(botFilterFacets(items, scope).years.map(item => item.value), ["2026", "2024"]);
  assert.deepEqual(botFilterFacets(items, { ...scope, year: "2024" }).years.map(item => item.value), ["2026", "2024"]);
  assert.deepEqual(botFilterFacets(items, { ...scope, country: "Iran" }).years.map(item => item.value), ["2023"]);
});
