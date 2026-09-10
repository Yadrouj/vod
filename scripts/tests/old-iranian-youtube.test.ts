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

test("fourth 50-title search batch keeps exact long-form matches only", () => {
  for (const [id, videoId] of [["old-iranian-1357024", "g7mIMxifxPo"], ["old-iranian-1356020", "9i4Ikj9tiVQ"], ["old-iranian-1356017", "jQwZahY2BUo"]] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("fifth 50-title search batch exposes long-form matches", () => {
  for (const [id, videoId] of [["old-iranian-1357004", "eTqgoCOgpqs"], ["old-iranian-1356047", "48DCtz7cwpo"], ["old-iranian-1355030", "twTqrfPA4Ok"]] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("sixth review batch exposes only one-hour-plus direct players", () => {
  for (const [id, videoId] of [["old-iranian-1355037", "wRCeUyuwy1s"], ["old-iranian-1355023", "TiiWLm2AWQU"], ["old-iranian-1355004", "-AvdB_WeSiM"]] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("seventh review batch exposes long-form direct players", () => {
  for (const [id, videoId] of [["old-iranian-1355001", "kGNzPMezK08"], ["old-iranian-1355010", "TfweLevY0Bw"], ["old-iranian-1355029", "I0cAuTWooJE"]] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("eighth review batch exposes the remaining clear long-form matches", () => {
  for (const [id, videoId] of [["old-iranian-1356029", "PdGA6E3KsEE"], ["old-iranian-1356037", "_0VtK4jd5a4"], ["old-iranian-1356055", "5DTCzqSTYOs"]] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("ninth review batch exposes twenty-three one-hour-plus direct players", () => {
  const expected = [
    ["old-iranian-1330006", "9zKdKc6wZ4w"], ["old-iranian-1335007", "KPIP0FRdKjE"], ["old-iranian-1336005", "FOJFyT7hFOQ"], ["old-iranian-1337003", "uzc0NM3C3Qw"],
    ["old-iranian-1338008", "aV3aPF7-al0"], ["old-iranian-1340002", "xQzs4E1Xw-I"], ["old-iranian-1340004", "kHvX-_TeE4k"],
    ["old-iranian-1340008", "Ax1S9nAl6lE"], ["old-iranian-1340013", "cq5Bb3e0PNQ"], ["old-iranian-1341004", "8MwpYpPU3aA"],
    ["old-iranian-1341005", "BGeIAzHDiN8"], ["old-iranian-1341011", "2YcjyqB37oA"], ["old-iranian-1341014", "obOMr6P-bMs"],
    ["old-iranian-1341025", "P_z7S3lM0Rg"], ["old-iranian-1342004", "Dq_w5fiKwx0"], ["old-iranian-1342010", "DzuY_YcF5Yg"],
    ["old-iranian-1342014", "tsx28uYYgU0"], ["old-iranian-1343007", "MnqBNGrY8qs"], ["old-iranian-1343010", "qnN4GR1b2YE"],
    ["old-iranian-1343017", "_2rPJyElYCk"], ["old-iranian-1343025", "Nw3EauvlLyc"], ["old-iranian-1343027", "I4z3Fv-j1to"],
    ["old-iranian-1343035", "iZcnggIkNJg"],
  ] as const;
  assert.equal(expected.length, 23);
  for (const [id, videoId] of expected) {
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
