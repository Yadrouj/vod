import assert from "node:assert/strict";
import test from "node:test";
import { playableLinks, playbackSourceLabel, roomPlayableLinks } from "../../lib/link-labels";
import type { VodLink } from "../../lib/types";

function link(overrides: Partial<VodLink>): VodLink {
  return {
    label: "Source",
    url: "https://cdn.example.test/video.mp4",
    ...overrides,
  } as VodLink;
}

test("full releases win over trailer assets", () => {
  const trailer = link({ url: "https://cdn.example.test/title-trailer.mp4", mediaKind: "trailer" });
  const release = link({ url: "https://cdn.example.test/title.1080p.mp4", quality: "1080p", mediaKind: "video" });

  assert.deepEqual(playableLinks([trailer, release]), [release]);
});

test("trailer-only titles do not enter the full online player", () => {
  const trailer = link({ url: "https://cdn.example.test/title-teaser.mp4", mediaKind: "trailer" });

  assert.deepEqual(playableLinks([trailer]), []);
});

test("non-trailer stream URLs remain playable", () => {
  const stream = link({ url: "https://cdn.example.test/live/master.m3u8", mediaKind: "stream" });

  assert.deepEqual(playableLinks([stream]), [stream]);
});

test("subtitle and archive files never enter the video player", () => {
  const subtitle = link({ url: "https://cdn.example.test/title.fa.srt", mediaKind: "subtitle" });
  const archive = link({ url: "https://cdn.example.test/title.zip", mediaKind: "archive" });

  assert.deepEqual(playableLinks([subtitle, archive]), []);
});

test("watch rooms only receive containers supported by native browser video", () => {
  const mkv = link({ url: "https://cdn.example.test/title.1080p.mkv", quality: "1080p", mediaKind: "video" });
  const mp4 = link({ url: "https://cdn.example.test/title.720p.mp4", quality: "720p", mediaKind: "video" });

  assert.deepEqual(roomPlayableLinks([mkv, mp4]), [mp4]);
});

test("movie source labels never expose season or episode text", () => {
  const movie = link({ label: "S01E01 1080p", quality: "1080p" });

  assert.equal(playbackSourceLabel(movie, 0, false), "1080p");
});

test("series playback prioritizes labeled episodes over generic source files", () => {
  const genericMp4 = link({
    label: "Source file",
    fileName: "2645266-0-1080.mp4",
    url: "https://cdn.example.test/2645266-0-1080.mp4",
  });
  const episode = link({
    label: "S01E01 / 1080p / BluRay / Dubbed",
    fileName: "Series.S01E01.1080p.BluRay.Dubbed.mkv",
    url: "https://cdn.example.test/Series.S01E01.1080p.BluRay.Dubbed.mkv",
    season: 1,
    episode: 1,
    quality: "1080p",
    release: "BluRay",
    group: "Dubbed",
  });

  assert.deepEqual(playableLinks([genericMp4, episode], { isSeries: true }), [episode]);
  assert.equal(playbackSourceLabel(episode, 0, true), "Season 1 / Episode 1 / 1080p / BluRay / Dubbed");
});
