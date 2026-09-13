import test from "node:test";
import assert from "node:assert/strict";
import { compareImdbRank, selectRankedSuggestions, searchTitleKind } from "../../lib/vod-search-order";
import { continueEntries, validProgress, historyEpisode, safeMediaUrl, type ProgressEntry } from "../../lib/media-history";
import { resolveHistoryMetadata } from "../../lib/history-metadata";
import { selectTrendingTitles } from "../../lib/imdb-trending";
import type { VodCard } from "../../lib/types";

const card = (id: string, rating = 8, type = "movie", year = 2026): VodCard => ({
  id, imdbCode: id, title: id, type, year, imdbRating: rating, imdbVotes: 100,
  genres: [], countries: [], languages: [], posterUrl: "/poster.jpg", backdropUrl: "/backdrop.jpg", runtimeMinutes: 100,
  overview: null, qualities: ["720p"], groups: [], linksCount: 1,
});
test("search rating wins over release year and uses votes to break ties", () => {
  const items = [card("new", 7), card("old", 9, "movie", 1994), { ...card("voted", 9), imdbVotes: 9000 }];
  assert.deepEqual([...items].sort(compareImdbRank).map(i => i.id), ["voted", "old", "new"]);
  assert.equal(items[0].id, "new");
});
test("all search suggestions mix film and TV in descending IMDb order", () => {
  const items = [card("film1", 8.6), card("show2", 8.5, "tvMiniSeries"), card("film2", 7.5), card("house", 8.7, "series")];
  assert.deepEqual(selectRankedSuggestions(items, 4).map(i => i.id), ["house", "film1", "show2", "film2"]);
  assert.deepEqual(selectRankedSuggestions(items, 1).map(i => i.id), ["house"]);
  assert.deepEqual(items.map(i => i.id), ["film1", "show2", "film2", "house"], "Do not mutate the catalog");
});
test("all search takes the highest scores before applying the limit, with no type quota", () => {
  for (const dominantType of ["movie", "series"]) {
    const items = Array.from({ length: 20 }, (_, i) => card(`top${i}`, 10 - i / 10, dominantType));
    items.push(card("lower", 8.5, dominantType === "movie" ? "series" : "movie"));
    assert.deepEqual(selectRankedSuggestions(items, 8).map(i => i.id), Array.from({ length: 8 }, (_, i) => `top${i}`));
  }
});
test("search type filter, missing scores, duplicate IDs and limits are stable", () => {
  const missing = { ...card("missing"), imdbRating: null };
  const items = [card("same", 7), missing, card("same", 9), card("show", 10, "series")];
  assert.deepEqual(selectRankedSuggestions(items, 10, "movie").map(i => i.imdbRating), [9, null]);
  assert.equal(selectRankedSuggestions(items, 1, "series")[0].id, "show");
  assert.deepEqual(selectRankedSuggestions(items, -4), []);
  assert.equal(searchTitleKind("tvEpisode"), "series");
});
const progress = (url: string, at: number, extra: Partial<ProgressEntry> = {}): ProgressEntry => ({ itemId: "tt1234567", title: "Example", url, time: 90, at, ...extra });
test("continue watching combines quality variants but keeps separate episodes", () => {
  const a = progress("https://cdn.example/a.mp4", 100);
  const b = progress("https://cdn.example/b.mp4", 200);
  const c = progress("https://cdn.example/show.S01E01.mp4", 300);
  const d = progress("https://cdn.example/show.S01E02.mp4", 400);
  assert.deepEqual(continueEntries({ a, b, c, d }).map(i => i.url), [d.url, c.url, b.url]);
});
test("legacy numeric entries and malformed progress never become broken cards", () => {
  assert.deepEqual(continueEntries({ a: 24, b: progress("javascript:alert(1)", 1) }), []);
  assert.equal(validProgress(progress("https://example.com/file.mp4", 1, { time: NaN })), false);
  assert.equal(safeMediaUrl("file:///secret.mp4"), false);
  assert.deepEqual(historyEpisode({ title: "Show · S02E13", at: 1 }), { season: 2, episode: 13 });
});
test("history resolves IDs and old filename-only entries without guessing remakes", () => {
  const cards = [{ ...card("tt1234567"), title: "Breaking Bad", type: "series", persianTitle: "بریکینگ بد" }, { ...card("old"), title: "Dune", year: 1984 }, { ...card("new"), title: "Dune", year: 2021 }];
  const result = resolveHistoryMetadata([
    { key: "explicit", itemId: "tt1234567" },
    { key: "legacy", title: "قسمت ۱", url: "https://cdn.example/Breaking.Bad.S01E01.1080p.mp4" },
    { key: "ambiguous", title: "Dune" },
    { key: "__proto__", itemId: "tt1234567" },
  ], cards);
  assert.equal(result.explicit.image, "/backdrop.jpg");
  assert.equal(result.legacy.title, "بریکینگ بد");
  assert.equal(result.ambiguous, undefined);
  assert.equal(Object.getPrototypeOf(result), null);
});
const now = Date.parse("2026-09-07T14:00:00Z");
const chart = (kind: "movie" | "series", capture: "direct" | "search-cache" = "direct", date = "2026-09-07T12:00:00Z") => ({
  observedAt: date, capture, sourceUrl: `https://www.imdb.com/chart/${kind === "movie" ? "moviemeter" : "tvmeter"}/`,
  items: [{ rank: 1, card: card(`${kind}1`, 6, kind) }, { rank: 2, card: card(`${kind}2`, 9, kind) }],
});
test("hero alternates the two popularity charts without sorting by rating", () => {
  const items = selectTrendingTitles({ movie: chart("movie"), series: chart("series") }, now);
  assert.deepEqual(items.map(i => i.id), ["movie1", "series1", "movie2", "series2"]);
  assert.ok(items.every(i => i.popularity.current));
});
test("cached excerpts and aged snapshots must never claim to be this week's live chart", () => {
  const items = selectTrendingTitles({ movie: chart("movie", "search-cache"), series: chart("series", "direct", "2026-08-25T00:00:00Z") }, now);
  assert.equal(items.length, 4);
  assert.ok(items.every(i => !i.popularity.current));
});
test("hero rejects old, future and malformed charts without losing a valid other chart", () => {
  assert.deepEqual(selectTrendingTitles({ movie: chart("movie", "direct", "2026-07-01T00:00:00Z") }, now), []);
  assert.deepEqual(selectTrendingTitles({ movie: chart("movie", "direct", "2027-01-01T00:00:00Z") }, now), []);
  assert.equal(selectTrendingTitles({ movie: { ...chart("movie"), sourceUrl: "broken" }, series: chart("series") }, now).length, 2);
});
