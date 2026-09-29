import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, utimes } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { mergeMelodifyCatalog } from "../../lib/music-library-merge";
import type { MusicArtist, MusicArtistIndex, MusicIndex, MusicLandingIndex, MusicTrack } from "../../lib/music-types";

const singer: MusicArtist = { slug: "rezaya", name: "رضایا", aliases: ["رضایا"], sourceUrl: "", coverUrl: null, trackIds: [], trackCount: 10, categories: ["آهنگ"] };
const empty: MusicIndex = { version: 1, source: "multi-source", updatedAt: "2026-01-01", scanned: { full: true, musicPages: 0, videoPages: 0 }, tracks: [], artists: [], categories: [] };
const track = (id: number, artist = { ...singer, slug: "رضایا" }): MusicTrack => ({
  id: `melodify-${id}`, kind: "track", title: `Song ${id}`, persianTitle: "ترانه", artist, artists: [artist],
  coverUrl: null, description: null, sourceUrl: "", publishedAt: null, addedAt: "2026-09-27", category: "پاپ", moods: ["Workout", "Chill"],
  folder: { root: "Music", year: null, month: null, day: null }, sources: [{ kind: "stream", provider: "melodify", url: `/api/music/library/melodify-${id}.mp3`, label: "320" }],
});

test("existing singer profile gets every local song, tag, count and alias without duplicate artists", () => {
  const base: MusicArtistIndex = { ...empty, scope: "artist", artists: [singer], artistTrackIds: { rezaya: ["old"] } };
  const library = { ...empty, updatedAt: "2026-09-27", tracks: [track(1), track(2)] };
  const result = mergeMelodifyCatalog(base, library);
  assert.equal(result.artists.length, 1);
  assert.equal(result.artists[0].trackCount, 12);
  assert.ok(result.artists[0].categories.includes("Workout"));
  assert.deepEqual(result.artistTrackIds.rezaya, ["old", "melodify-1", "melodify-2"]);
  assert.equal(result.tracks[0].artist.slug, "rezaya");
  assert.deepEqual(base.artists[0], singer, "Must not mutate the cached base catalog");
  assert.deepEqual(mergeMelodifyCatalog(result, library), result, "Merging twice cannot duplicate songs or counts");
});

test("compact homepage includes a bounded selection but correct complete archive counts", () => {
  const base: MusicLandingIndex = { ...empty, scope: "landing", archiveStats: { tracks: 100, artists: 25, videos: 9 } };
  const library = { ...empty, tracks: Array.from({ length: 100 }, (_, id) => track(id)), libraryExistingArtistSlugs: ["رضایا"] };
  const result = mergeMelodifyCatalog(base, library);
  assert.equal(result.tracks.length, 48);
  assert.equal(result.archiveStats.tracks, 200);
  assert.equal(result.archiveStats.artists, 25);
  assert.ok(result.categories.includes("Chill"));
  assert.equal(result.artists[0].trackIds.length, 100);
  assert.equal(mergeMelodifyCatalog({ ...base, scope: "home" }, library).tracks.length, 24);
});

test("a compact artist selection cannot merge canonical singers who share a display name", () => {
  const base = { ...empty, artists: [{ ...singer, slug: "another-rezaya" }] };
  const library = { ...empty, tracks: [track(1, singer)], libraryExistingArtistSlugs: ["rezaya"] };
  const result = mergeMelodifyCatalog(base, library);
  assert.equal(result.artists.length, 2);
  assert.equal(result.tracks[0].artist.slug, "rezaya");
  assert.equal(result.artists.find(a => a.slug === "another-rezaya")?.trackCount, 10);
});

test("a library-only update invalidates full, landing, home and singer caches", async t => {
  const cwd = process.cwd();
  const root = await mkdtemp(path.join(os.tmpdir(), "sarvnema-music-cache-"));
  const folder = path.join(root, "public/data");
  await mkdir(folder, { recursive: true });
  const files = {
    "music-index.json": empty,
    "music-landing.json": { ...empty, scope: "landing" },
    "music-home.json": { ...empty, scope: "home" },
    "music-artists.json": { ...empty, scope: "artist", artistTrackIds: {} },
    "melodify-library.json": { ...empty, tracks: [track(1)] },
  };
  for (const [file, data] of Object.entries(files)) await writeFile(path.join(folder, file), JSON.stringify(data));
  process.chdir(root);
  t.after(async () => { process.chdir(cwd); t.mock.restoreAll(); await rm(root, { recursive: true, force: true }); });
  const { loadMusicIndex, loadMusicLandingIndex, loadMusicHomeIndex, loadMusicArtistIndex } = await import("../../lib/music");
  const loaders = [loadMusicIndex, loadMusicLandingIndex, loadMusicHomeIndex, loadMusicArtistIndex];
  for (const load of loaders) assert.equal((await load()).tracks.length, 1);
  const updated = { ...empty, updatedAt: "2026-09-29", tracks: [track(1), track(2)] };
  const file = path.join(folder, "melodify-library.json");
  await writeFile(file, JSON.stringify(updated));
  const now = Date.now() + 31_000;
  await utimes(file, new Date(now), new Date(now));
  t.mock.method(Date, "now", () => now);
  for (const load of loaders) {
    const result = await load();
    assert.equal(result.tracks.length, 2);
    assert.equal(result.updatedAt, updated.updatedAt);
  }
});
