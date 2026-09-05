import assert from "node:assert/strict";
import test from "node:test";
import { normalizeVodType } from "../../lib/catalog";
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

test("series playback keeps browser-playable episode mirrors", () => {
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

  const playable = playableLinks([genericMp4, episode], { isSeries: true });
  assert.deepEqual(playable, [{ ...genericMp4, season: 1, episode: 1 }]);
  assert.equal(playbackSourceLabel(playable[0], 0, true), "Season 1 / Episode 1 / 1080p");
});

test("matching MP4 mirrors inherit episode identity from the archive", () => {
  const genericEpisodeOne = link({
    label: "Source file",
    fileName: "2645266-0-1080.mp4",
    url: "https://traffic.example.test/2645266-0-1080.mp4?ref=abc",
  });
  const genericEpisodeTwo = link({
    label: "Source file",
    fileName: "2645268-0-1080.mp4",
    url: "https://traffic.example.test/2645268-0-1080.mp4?ref=abc",
  });
  const archiveEpisodeOne = link({
    label: "S01E01 / 1080p / BluRay / Dubbed",
    url: "https://archive.example.test/Series.S01E01.1080p.mkv",
    season: 1,
    episode: 1,
    quality: "1080p",
    release: "BluRay",
    group: "Dubbed",
  });
  const archiveEpisodeTwo = link({
    label: "S01E02 / 1080p / BluRay / Dubbed",
    url: "https://archive.example.test/Series.S01E02.1080p.mkv",
    season: 1,
    episode: 2,
    quality: "1080p",
    release: "BluRay",
    group: "Dubbed",
  });

  const playable = playableLinks(
    [genericEpisodeOne, genericEpisodeOne, genericEpisodeTwo, archiveEpisodeOne, archiveEpisodeTwo],
    { isSeries: true, title: "Example series" },
  );

  assert.equal(playable.length, 3);
  assert.equal(playable[0].season, 1);
  assert.equal(playable[0].episode, 1);
  assert.equal(playbackSourceLabel(playable[0], 0, true), "Season 1 / Episode 1 / 1080p");
});

test("source-specific series filenames recover Persian season and episode", () => {
  const datedEpisode = link({
    label: "Source file",
    fileName: "Zendegi.pas.az.Zendegi.1404.10.Farvardin.720p.mp4",
    url: "https://cdn.example.test/Series/Zendegi.pas.az.Zendegi/1404/Zendegi.pas.az.Zendegi.1404.10.Farvardin.720p.mp4",
    quality: "720p",
    group: "Files",
  });

  const [parsed] = playableLinks(
    [datedEpisode],
    { isSeries: true, title: "زندگی پس از زندگی ۱۴۰۴ فصل ششم" },
  );

  assert.equal(parsed.season, 6);
  assert.equal(parsed.episode, 10);
  assert.equal(playbackSourceLabel(parsed, 0, true), "Season 6 / Episode 10 / 720p");
});

test("series filenames with an explicit number before quality recover the episode", () => {
  const [parsed] = playableLinks(
    [link({
      label: "1080p / Dubbed",
      fileName: "Prison,Break.01.1080p.Farsi.Dubbed.mp4",
      url: "https://cdn.example.test/Series/Prison%20Break/Prison%2CBreak.01.1080p.Farsi.Dubbed.mp4",
      quality: "1080p",
      group: "Dubbed",
    })],
    { isSeries: true, title: "Prison Break" },
  );

  assert.equal(parsed.season, null);
  assert.equal(parsed.episode, 1);
  assert.equal(playbackSourceLabel(parsed, 0, true), "Episode 1 / 1080p / Dubbed");
});

test("movie labels infer quality and release from a source filename", () => {
  const movie = link({
    label: "Source file",
    fileName: "Mortal-Kombat-2023WEB-DL1080p.mkv",
    url: "https://cdn.example.test/Mortal-Kombat-2023WEB-DL1080p.mkv",
    group: "Files",
  });

  assert.equal(playbackSourceLabel(movie, 0, false), "1080p / Web-DL");
});

test("unstructured sources still show a useful media descriptor", () => {
  const series = link({
    label: "Source file",
    fileName: "episode-1-480.mp4",
    url: "https://cdn.example.test/episode-1-480.mp4?quality=3",
    sourceProvider: "moviesho",
  });
  const movie = link({
    label: "Source file",
    fileName: "feature.mp4",
    url: "https://cdn.example.test/feature.mp4?quality=4",
  });

  assert.equal(playbackSourceLabel(series, 0, true), "Episode 1 / 480p");
  assert.equal(playbackSourceLabel(movie, 0, false), "Source / MP4 / Option 4 / 1");
});

test("tv movies are classified as movies, not series", () => {
  assert.equal(normalizeVodType("tvMovie"), "movie");
  assert.equal(normalizeVodType("tvSeries"), "series");
});
