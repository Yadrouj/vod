import { test } from "node:test";
import assert from "node:assert/strict";
import { matchWeeklyPicks, recentlyUpdatedTitles } from "../../lib/home-discovery";
import type { VodCard } from "../../lib/types";

const card = (id: string, title: string, year: number, type = "movie") => ({ id, imdbCode: id, title, year, type, linksCount: 2, genres: [], posterUrl: "/test.jpg", imdbRating: 8 } as unknown as VodCard);
test("weekly picks never mix remakes or movie and series titles, nor invent pages", () => {
  const items = [card("old", "Carrie", 1976), card("series", "Carrie", 2026, "series"), card("movie", "Carrie", 2013)];
  assert.deepEqual(matchWeeklyPicks(items, [{ title: "Carrie", year: 2026, type: "series", rank: 3 }, { title: "Absent", year: 2026, type: "movie", rank: 1 }]).map(t => t.imdbCode), ["series"]);
});
test("updated shelves use real timestamps, not release years or future dates", () => {
  const items = [{ ...card("a", "Old film updated today", 1980), catalogUpdatedAt: "2026-11-10T01:00:00Z" },
    { ...card("b", "New film updated yesterday", 2026), sourceUpdatedAt: "2026-11-09T01:00:00Z" },
    { ...card("c", "Future timestamp", 2026), catalogUpdatedAt: "2026-11-12T01:00:00Z" }, card("d", "No timestamp", 2026)];
  assert.deepEqual(recentlyUpdatedTitles(items, Date.parse("2026-11-10T10:00:00Z")).map(t => t.imdbCode), ["a", "b"]);
});
