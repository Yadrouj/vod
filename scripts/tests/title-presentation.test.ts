import assert from "node:assert/strict";
import test from "node:test";
import { bestDownloadLink, detailHeroVideo, titleDownloadLinks, trailerPlayback, videoUrlExpired } from "../../lib/title-presentation";
import type { VodLink } from "../../lib/types";

const now = Date.parse("2026-09-07T12:00:00Z");
const file = (url: string, extra: Partial<VodLink> = {}): VodLink => ({ url, label: "Release", group: "SoftSub", quality: "1080p", size: null, release: null, ...extra });

test("unsigned trailer URLs are not expired; malformed and unsafe URLs are rejected", () => {
  assert.equal(videoUrlExpired("https://cdn.example.com/trailer.mp4", now), false);
  assert.equal(videoUrlExpired("https://cdn.example.com/trailer.mp4?Expires=", now), false);
  assert.equal(videoUrlExpired("bad-url", now), true);
  assert.equal(videoUrlExpired("javascript:alert(1)", now), true);
});
test("expiration supports legacy, lowercase and AWS signed query parameters", () => {
  assert.equal(videoUrlExpired("https://cdn.example.com/trailer.mp4?Expires=1", now), true);
  assert.equal(videoUrlExpired(`https://cdn.example.com/trailer.mp4?expires=${now / 1000 + 600}`, now), false);
  assert.equal(videoUrlExpired(`https://cdn.example.com/trailer.mp4?exp=${now / 1000 + 30}`, now), true);
  assert.equal(videoUrlExpired("https://cdn.example.com/trailer.mp4?X-Amz-Date=20260907T110000Z&X-Amz-Expires=300", now), true);
  assert.equal(videoUrlExpired("https://cdn.example.com/trailer.mp4?X-Amz-Date=20260907T120000Z&X-Amz-Expires=3600", now), false);
});
test("choose a valid low-bandwidth trailer after an expired trailer", () => {
  const video = { name: "Official trailer", playback_urls: [
    { url: "https://example.com/old.mp4?Expires=1", quality: "480p" },
    { url: "https://example.com/full-hd.mp4", quality: "1080p" },
    { url: "https://example.com/hd.mp4", quality: "720p" },
  ] };
  assert.equal(trailerPlayback(video, now), "https://example.com/hd.mp4");
  assert.equal(detailHeroVideo({ imdbVideos: [{ name: "Trailer", playback_urls: [{ url: "https://example.com/old.mp4?Expires=1" }] }, video] }, now), "https://example.com/hd.mp4");
  assert.equal(detailHeroVideo({ imdbVideos: [{ ...video, name: "Interview with cast" }] }, now), null);
});
test("MP4 mime metadata works without a file extension, unsupported HLS is excluded", () => {
  assert.equal(trailerPlayback({ name: "Trailer", playback_urls: [{ url: "https://example.com/play", mime_type: "video/mp4" }] }, now), "https://example.com/play");
  assert.equal(trailerPlayback({ name: "Trailer", playback_urls: [{ url: "https://example.com/file.m3u8", mime_type: "HLS" }] }, now), null);
});
test("best file is a release with the highest resolution, never trailer, subtitles or a folder", () => {
  const links = [file("https://example.com/trailer.mp4", { quality: "2160p", mediaKind: "trailer" }),
    file("https://example.com/source/", { quality: "2160p" }), file("https://example.com/movie.srt"),
    file("https://example.com/movie.720p.mp4", { quality: "720p" }), file("https://example.com/movie.1080p.mkv"),
    file("https://example.com/movie.zip", { mediaKind: "archive", quality: "2160p" })];
  assert.equal(bestDownloadLink(links)?.url, "https://example.com/movie.1080p.mkv");
  assert.equal(bestDownloadLink([links[0], links[1], links[2], links[5]]), null);
  assert.equal(titleDownloadLinks(links).length, 4, "Keep source directories and season archives available for downloads");
});
test("preview filenames are excluded even when mediaKind is missing", () => {
  assert.equal(bestDownloadLink([file("https://example.com/movie-teaser.mp4")]), null);
  assert.equal(titleDownloadLinks([file("javascript:alert(1)")]).length, 0);
});
