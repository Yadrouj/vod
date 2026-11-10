import { test } from "node:test";
import assert from "node:assert/strict";
import { combineMusicLibraries, hostedCoverUrl, isHostedFileUrl } from "../../lib/hosted-music";
import { mergeMelodifyCatalog } from "../../lib/music-library-merge";
import type { MusicIndex, MusicTrack } from "../../lib/music-types";
import { musicPartyMedia } from "../../lib/watch-party-music";

const empty: MusicIndex = { version: 1, source: "multi-source", updatedAt: "", scanned: { musicPages: 0, videoPages: 0, full: false }, tracks: [], artists: [], categories: [] };
function track(id: string, provider: "melodify" | "sarvnema-hosted"): MusicTrack {
  const artist = { name: "ABBA", slug: "abba", sourceUrl: "/music/artists/abba" };
  return { id, title: id, persianTitle: id, kind: "track", artist, artists: [artist], category: "Pop", sourceUrl: "/music", coverUrl: null, description: null, publishedAt: null, folder: { root: "Music", year: null, month: null, day: null }, sources: [{ provider, url: `https://music.sarvnema.ir/files/ABBA/${id}.mp3`, kind: "stream", label: "Archive" }] };
}
test("credentials only go to the fixed HTTPS file origin", () => {
  assert.equal(isHostedFileUrl("https://music.sarvnema.ir/files/ABBA/test.mp3"), true);
  for (const url of ["https://evil.example/files/a/b.mp3", "http://music.sarvnema.ir/files/a/b.mp3", "https://music.sarvnema.ir.evil.com/files/a/b", "https://music.sarvnema.ir/api/files", "https://user@music.sarvnema.ir/files/a/b", "https://music.sarvnema.ir/files/a/b?token=x", "https://music.sarvnema.ir/files/a/%2fsecret"]) assert.equal(isHostedFileUrl(url), false, url);
});
test("hosted and old libraries retain tracks and counts in compact and full indexes", () => {
  const library = combineMusicLibraries({ ...empty, tracks: [track("old", "melodify")] }, { ...empty, tracks: [track("new", "sarvnema-hosted")] });
  assert.equal(library.categoryCounts?.Pop, 2);
  const result = mergeMelodifyCatalog(empty, library);
  assert.equal(result.tracks.length, 2);
  assert.equal(result.categoryCounts?.Pop, 2);
  assert.equal(mergeMelodifyCatalog(result, library).tracks.length, 2);
  assert.equal(mergeMelodifyCatalog(result, library).categoryCounts?.Pop, 2);
  const compact = mergeMelodifyCatalog({ ...empty, scope: "landing" }, library);
  assert.equal(compact.tracks.length, 2);
});
test("cover paths cannot turn into an arbitrary authenticated request", () => {
  assert.equal(hostedCoverUrl({ ...track("x", "sarvnema-hosted"), hostedCoverPath: "../../secret" } as MusicTrack), null);
});

test("listen together excludes download-only archival originals", () => {
  const song = track("test", "sarvnema-hosted");
  song.sources.push({ ...song.sources[0], url: "https://music.sarvnema.ir/files/ABBA/original.m4a", playback: false, kind: "download" });
  const media = musicPartyMedia(song);
  assert.equal(media?.sources.length, 1);
  assert.ok(media?.source.url.startsWith("/api/music/media?"));
});
