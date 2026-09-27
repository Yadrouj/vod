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
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1345040")?.[0].videoId, "B30nbWIoNbI");
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

test("tenth review batch exposes fourteen one-hour-plus direct players", () => {
  const expected = [
    ["old-iranian-1333002", "_j2Qro7lVx0"], ["old-iranian-1334002", "FwEGEAxx2G8"], ["old-iranian-1336010", "r2xdOE342Xw"],
    ["old-iranian-1341016", "fATi-87vMrg"], ["old-iranian-1342025", "LH6nli7gGdo"], ["old-iranian-1342026", "R7LITKoaNr0"],
    ["old-iranian-1338026", "Vb9LZ5nCg9c"], ["old-iranian-1339008", "ibpaCSZS7go"], ["old-iranian-1339019", "2WJZxCQYx2k"],
    ["old-iranian-1339026", "lLeyt6BhK3Y"], ["old-iranian-1343013", "h7tqck7GLOM"], ["old-iranian-1353035", "XJBSFeYV5wY"],
    ["old-iranian-1353054", "0zylCNz_lNM"], ["old-iranian-1344004", "qoPcbAcOL5o"],
  ] as const;
  assert.equal(expected.length, 14);
  for (const [id, videoId] of expected) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("eleventh review batch keeps live, exact long-form matches", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1357014", "_x4CgAHVsZk", 5234],
    ["old-iranian-1356023", "ro0NkU2XBtU", 6573],
    ["old-iranian-1358006", "bhZsZnnuRu4", 5047],
    ["old-iranian-1358004", "oZK7hhtv9og", 5091],
    ["old-iranian-1358020", "E5Q7BPQkGiI", 5650],
    ["old-iranian-1357007", "ox7A2F_ePJ4", 6157],
    ["old-iranian-1355063", "trao4fVZCVQ", 5649],
    ["old-iranian-1356009", "8iBhaOwj43A", 5141],
    ["old-iranian-1356030", "sEK7ay05Y7s", 6680],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].checkedAt, "2026-09-26");
    assert.equal(item[0].playbackStatus, "available");
    assert.equal(item[0].durationSeconds, duration);
    assert.ok(item[0].sourceUrl.includes("youtube.com/watch?v="));
  }
});

test("thirteenth review batch exposes the verified full-length Rebellious upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1357008");
  assert.ok(item);
  assert.equal(item[0].videoId, "BRXXnMY2MUk");
  assert.equal(item[0].durationSeconds, 5640);
  assert.equal(item[0].playbackStatus, "available");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=BRXXnMY2MUk");
});

test("fourteenth review batch exposes exact full-film links for the next archive titles", () => {
  for (const [id, videoId] of [
    ["old-iranian-1336003", "Qlz29F6Qx4Y"], ["old-iranian-1336007", "5RHzKWo8YJE"],
    ["old-iranian-1336009", "v16Qqb8pqE8"], ["old-iranian-1337016", "JIiuVtgrqp0"],
    ["old-iranian-1338001", "taC3X06o-Gs"], ["old-iranian-1339006", "FFRHpqx4xe4"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
    assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
  }
});

test("fifteenth review batch adds only exact full-film archive matches", () => {
  for (const [id, videoId] of [["old-iranian-1332001", "_ViRefxnc0c"], ["old-iranian-1339013", "yXUPH_NJjJs"]] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1334004")?.[0].videoId, "ZmVsspF_IMw");
});

test("sixteenth review batch exposes exact full-film matches", () => {
  for (const [id, videoId] of [["old-iranian-1332022", "ZmMfj85P8Y8"], ["old-iranian-1340010", "MpyOTqOKqdM"]] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
  }
});

test("seventeenth review batch exposes the exact Daughters of Eve upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1340009");
  assert.ok(item);
  assert.equal(item[0].videoId, "11kADOKa07U");
  assert.equal(item[0].playbackStatus, "not-tested");
});

test("eighteenth review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [["old-iranian-1340020", "SWn2xqOtpNs"], ["old-iranian-1341019", "QSiI8VvJ2zA"]] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
  }
});

test("nineteenth review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1339015", "iucm8f-L-3M"],
    ["old-iranian-1344003", "p-ijPlZWDZQ"],
    ["old-iranian-1344005", "LovNfMJr2cU"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
  }
});

test("twentieth review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [["old-iranian-1343031", "x6J1xMODb5A"], ["old-iranian-1344010", "n9n24BOBmNA"]] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
  }
});

test("twenty-first review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1344012", "9-LgBgXkhTM"],
    ["old-iranian-1344016", "yMxnW1UjdDg"],
    ["old-iranian-1344020", "4aVOKzE1MyU"],
    ["old-iranian-1344024", "JshKBDG8kS4"],
    ["old-iranian-1345001", "IzFiqn2M1Jw"],
    ["old-iranian-1345018", "BJ2FpQLUjgE"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
  }
});

test("twenty-second review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [["old-iranian-1345002", "oinmr9KPyu4"], ["old-iranian-1345007", "i9BGhhY1JDI"]] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
  }
});

test("twenty-third review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1344036", "xunhZi-PY8E"],
    ["old-iranian-1344043", "XqApDzWjy5I"],
    ["old-iranian-1346044", "OO4sDmRAwnU"],
    ["old-iranian-1347012", "vKW1wwnU_H0"],
    ["old-iranian-1347013", "0EaI-7wVh0A"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
  }
});

test("twenty-fifth review batch exposes direct full-film uploads", () => {
  const cow = getOldIranianYouTubeVideos("old-iranian-1348046");
  assert.ok(cow);
  assert.equal(cow[0].videoId, "xKgu1zxVhDI");
  assert.equal(cow[0].durationSeconds, 6300);
  assert.equal(cow[0].playbackStatus, "available");

  const kando = getOldIranianYouTubeVideos("old-iranian-1354050");
  assert.ok(kando);
  assert.equal(kando[0].videoId, "9RCduqHH0gw");
  assert.equal(kando[0].playbackStatus, "not-tested");
});

test("twenty-sixth review batch exposes exact title matches", () => {
  for (const [id, videoId] of [
    ["old-iranian-1350047", "kPfeAKChGvA"],
    ["old-iranian-1353002", "oeAW965qZxk"],
    ["old-iranian-1356002", "4qW8fTfmvqo"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
  }
});

test("twenty-seventh review batch exposes exact title matches", () => {
  for (const [id, videoId] of [
    ["old-iranian-1355057", "c1QNEm9kqiw"],
    ["old-iranian-1356044", "wsuLNprT1h4"],
    ["old-iranian-1357015", "avN-UJjY-vg"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
  }
});

test("twenty-eighth review batch exposes year-matched full films", () => {
  const friends = getOldIranianYouTubeVideos("old-iranian-1339003");
  assert.ok(friends);
  assert.equal(friends[0].videoId, "G1xeacbCOaE");
  assert.equal(friends[0].playbackStatus, "not-tested");

  const rooster = getOldIranianYouTubeVideos("old-iranian-1340015");
  assert.ok(rooster);
  assert.equal(rooster[0].videoId, "vHmueOCd00w");
  assert.equal(rooster[0].durationSeconds, 5400);
  assert.equal(rooster[0].playbackStatus, "available");
});

test("twenty-ninth review batch exposes the full Amir Arsalan upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1334004");
  assert.ok(item);
  assert.equal(item[0].videoId, "ZmVsspF_IMw");
  assert.equal(item[0].playbackStatus, "not-tested");
});

test("thirtieth review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1342007", "SGodcXW61yA"],
    ["old-iranian-1342023", "WxDERxf5ySw"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
  }
});

test("thirty-first review batch exposes the exact full-film upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1342013");
  assert.ok(item);
  assert.equal(item[0].videoId, "KqACZQgAQrA");
  assert.equal(item[0].playbackStatus, "not-tested");
});

test("thirty-second review batch exposes the duration-checked full film", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1344030");
  assert.ok(item);
  assert.equal(item[0].videoId, "MlWAWVFvgNg");
  assert.equal(item[0].durationSeconds, 6780);
  assert.equal(item[0].playbackStatus, "available");
});

test("thirty-third review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1343004", "vB58bcCAtX4"],
    ["old-iranian-1343009", "Wv-nHYcagRQ"],
    ["old-iranian-1344007", "02Z9uJ0xXNE"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
  }
});

test("OITN batch exposes only independently checked full-film embeds", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1355020", "YGycqs-Rf90", 5277], ["old-iranian-1349035", "BtrCB0vgv48", 7379],
    ["old-iranian-1355051", "Cwh_9tx6IA0", 6026], ["old-iranian-1352042", "6FHHpReizNI", 5865],
    ["old-iranian-1352035", "YrSkUe-0BSk", 5622], ["old-iranian-1351041", "FvUCojIcrKk", 6096],
    ["old-iranian-1355024", "VFpGOSF3NY4", 5456], ["old-iranian-1350035", "cJSPCTsAbeE", 5825],
    ["old-iranian-1350025", "O2bOYxZdMoQ", 5412], ["old-iranian-1349018", "eG8xEgV3oKc", 6252],
    ["old-iranian-1348027", "nCJBDy9rsJM", 5800], ["old-iranian-1351047", "R2T4VQMu-6s", 6917],
    ["old-iranian-1352076", "XLes3YGJEiM", 4504], ["old-iranian-1352024", "CEVIo7M8f7E", 6835],
    ["old-iranian-1352030", "poQQ9IavSMA", 4359], ["old-iranian-1345040", "B30nbWIoNbI", 4802],
    ["old-iranian-1354015", "T-aP87IbvFg", 4954], ["old-iranian-1353009", "BqngQcafk2U", 5966],
    ["old-iranian-1353036", "0FctRSM6JOc", 5183], ["old-iranian-1353006", "AiucNJZruYU", 5596],
    ["old-iranian-1352059", "E2iKXm_BlDE", 6331], ["old-iranian-1353034", "T6NrBlfQ5aI", 5388],
    ["old-iranian-1353032", "pIItu5d-SmU", 6425], ["old-iranian-1351044", "3JFebuubn1c", 5583],
    ["old-iranian-1356036", "avUSC0crdTk", 5302], ["old-iranian-1353027", "tBLkdKZdR00", 5628],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].playbackStatus, "available");
    assert.equal(item[0].evidenceUrl, "https://www.oitn.com/copy-of-%D9%85%D8%B3%D8%AA%D9%86%D8%AF-%D9%87%D8%A7");
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1355051")?.length, 2);
});

test("community playlists and review channels are retained as direct YouTube sources", () => {
  assert.ok(OLD_IRANIAN_YOUTUBE_COLLECTIONS.some(collection => collection.playlistId === "PLeHzOz4FtTB40XDHDUtatCriTciww6cfQ"));
  assert.deepEqual(OLD_IRANIAN_YOUTUBE_REVIEW_CHANNELS, ["https://www.youtube.com/@Filmrangi/videos", "https://www.youtube.com/@ShoukaFilm", "https://www.youtube.com/@beikiha/videos"]);
});
