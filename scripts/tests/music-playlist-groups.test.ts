import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { musicPlaylistGroups, musicPlaylistKind } from "../../components/music-playlist-groups";
import type { MoodPlaylist } from "../../lib/mood-playlists";

const playlist = (id: string, selection: string, scope = "persian", mood = "road") => ({
  id, selection, scope, mood, title: id, description: "", trackIds: [id], artistCount: 1, covers: [], updatedAt: "",
}) satisfies MoodPlaylist;

test("landing groups prioritize curated Iranian moods, real styles and recent publication years", () => {
  const input = [
    playlist("provider", "meloobit-source"),
    playlist("literal-tag", "library-tags", "tags"),
    playlist("curated-persian-road", "curated-mood"),
    playlist("curated-style-persian-pop", "genre-tags", "styles"),
    playlist("curated-year-mix-2025", "published-year", "years", "2025"),
    playlist("curated-year-mix-2026", "published-year", "years", "2026"),
    playlist("curated-year-persian-2026", "published-year", "years", "2026"),
  ];
  const groups = musicPlaylistGroups(input);
  assert.deepEqual(groups.map(group => group.id), ["moods", "styles", "years"]);
  assert.deepEqual(groups[0].playlists.map(p => p.id), ["curated-persian-road"]);
  assert.deepEqual(groups[2].playlists.map(p => p.id), ["curated-year-persian-2026", "curated-year-mix-2026", "curated-year-mix-2025"]);
  assert.equal(musicPlaylistKind(input[0]), "sources");
  assert.equal(musicPlaylistKind(input[1]), "tags");
  assert.equal(input[4].id, "curated-year-mix-2025", "sorting must not mutate input");
});

test("landing omits empty groups and bounds each preview", () => {
  assert.deepEqual(musicPlaylistGroups([]), []);
  const moods = Array.from({ length: 20 }, (_, i) => playlist(`mood-${i}`, "curated-mood"));
  assert.equal(musicPlaylistGroups(moods)[0].playlists.length, 8);
  assert.equal(musicPlaylistGroups([playlist("persian-road", "editorial-tags")])[0].playlists[0].id, "persian-road");
});

test("categories stay near filtered results but move below landing content", async () => {
  const source = await readFile(new URL("../../app/music/page.tsx", import.meta.url), "utf8");
  assert.match(source, /\{hasFilter && <MusicCategoryNav/);
  assert.match(source, /\{!hasFilter && <MusicCategoryNav/);
  assert.equal(source.match(/<MusicCategoryNav/g)?.length, 2);
  assert.ok(source.indexOf("{hasFilter && <MusicCategoryNav") < source.indexOf("<LandingPulse"));
  assert.ok(source.indexOf("{!hasFilter && <MusicCategoryNav") > source.indexOf("<LandingSeoContent"));
  assert.match(source, /key !== "page" && asText\(val\)/, "pagination retains active search filters");
});
