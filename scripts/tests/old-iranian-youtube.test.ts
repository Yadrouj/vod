import assert from "node:assert/strict";
import test from "node:test";
import { getOldIranianFilmMedia, getOldIranianYouTubeVideos } from "../../lib/old-iranian-media";
import { OLD_IRANIAN_YOUTUBE_COLLECTIONS, OLD_IRANIAN_YOUTUBE_REVIEW_CHANNELS } from "../../lib/old-iranian-youtube-collections";

test("exact old-Iranian record exposes an attributed, embeddable YouTube reference", () => {
  const item = getOldIranianFilmMedia("old-iranian-1359010");
  assert.ok(item);
  assert.equal(item.persianYear, 1359);
  assert.deepEqual(item.youtubeVideos.map(video => video.videoId), ["thO9Em-8ihQ"]);
  assert.equal(item.youtubeVideos[0].sourceUrl, "https://www.youtube.com/watch?v=thO9Em-8ihQ");
  assert.match(item.youtubeVideos[0].thumbnailUrl, /^https:\/\/i\.ytimg\.com\/vi\/thO9Em-8ihQ\//);
  assert.equal(getOldIranianFilmMedia("old-iranian-1359011"), null);
});

test("user-confirmed full-length replacement supersedes a trailer candidate", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1353020");
  assert.ok(item);
  assert.equal(item[0].videoId, "mSzgo6SRnBs");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=mSzgo6SRnBs");
  assert.ok((item[0].durationSeconds ?? 0) >= 3600);
});

test("second playlist batch exposes only feature-length direct players", () => {
  for (const [id, videoId, minimum] of [["old-iranian-1354001", "dlZv_yfHwlA", 6275], ["old-iranian-1352033", "r1TqClwwDeY", 5490], ["old-iranian-1344025", "B2IK_pNVlh0", 6332]] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.ok((item[0].durationSeconds ?? 0) >= minimum);
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1345040"), null);
});

test("third 50-title search batch exposes only one-hour-plus matches", () => {
  for (const [id, videoId] of [["old-iranian-1359001", "D__QXGQwUok"], ["old-iranian-1358018", "_n6eEyJg5Rs"], ["old-iranian-1356004", "awmGWn_IFw0"]] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("community playlists and review channels are retained as direct YouTube sources", () => {
  assert.ok(OLD_IRANIAN_YOUTUBE_COLLECTIONS.some(collection => collection.playlistId === "PLeHzOz4FtTB40XDHDUtatCriTciww6cfQ"));
  assert.deepEqual(OLD_IRANIAN_YOUTUBE_REVIEW_CHANNELS, ["https://www.youtube.com/@Filmrangi/videos", "https://www.youtube.com/@ShoukaFilm", "https://www.youtube.com/@beikiha/videos"]);
});
