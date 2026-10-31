import assert from "node:assert/strict";
import test from "node:test";
import { matchingMusicArtists, compareMusicPopularityYear } from "../../lib/music-search-ranking";
import type { MusicArtist, MusicTrack } from "../../lib/music-types";
import { findMusicTrack } from "../../lib/music";
import type { MusicIndex } from "../../lib/music-types";
test("previously shared music IDs resolve after a provider deduplication", () => {
 const track = { id: "canonical", idAliases: ["shared-old"], kind: "track", title: "Example", persianTitle: "Example", artist: {slug:"artist",name:"Artist",sourceUrl:"https://source.example/"}, artists: [{slug:"artist",name:"Artist",sourceUrl:"https://source.example/"}], sources: [] } as unknown as MusicTrack;
 const index = { tracks: [track] } as MusicIndex;
 assert.equal(findMusicTrack(index, "shared-old")?.id, "canonical");
 assert.equal(findMusicTrack(index, "canonical")?.id, "canonical");
 assert.equal(findMusicTrack(index, "missing"), null);
});
test("artists use exact match then catalog size; Persian letter variants normalize", () => {
 const artists = [{ name: "علی", slug: "ali", trackIds: ["1"] }, { name: "علی بند", slug: "ali-band", trackIds: Array(100).fill("1") }] as MusicArtist[];
 assert.equal(matchingMusicArtists(artists, "علي")[0].slug, "ali");
});
test("measured popularity precedes publication date, absent popularity uses dates", () => {
 const old = { publishedAt: "2020-01-01", playCount: 20 } as MusicTrack;
 const recent = { publishedAt: "2026-01-01" } as MusicTrack;
 assert.ok(compareMusicPopularityYear(old, recent) < 0);
 assert.ok(compareMusicPopularityYear({ ...old, playCount: undefined }, recent) > 0);
});
