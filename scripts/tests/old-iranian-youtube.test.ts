import assert from "node:assert/strict";
import test from "node:test";
import { enrichOldIranianFilm, getOldIranianFilmMedia, getOldIranianYouTubeVideos } from "../../lib/old-iranian-media";
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

test("one-hundred-eighth review batch exposes only exact feature-length uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1357010", "0mA75WPm2t0", 6309],
    ["old-iranian-1355011", "XT2NkIdYlLE", 6239],
    ["old-iranian-1355022", "FgjlWf6lmco", 6124],
    ["old-iranian-1354048", "Oms9TQWIYCo", 6088],
    ["old-iranian-1355014", "NEEIag8N10A", 6176],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
  }
});

test("one-hundred-ninth review batch exposes exact long-form archive matches", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1355015", "iN-5s2TVLKQ", 4920],
    ["old-iranian-1355016", "28lrisXkm-A", 5228],
    ["old-iranian-1355019", "S6znukmZ9qY", 6259],
    ["old-iranian-1355033", "zjQZzFmIhuU", 5967],
    ["old-iranian-1355039", "9StPHRfLy6E", 5393],
    ["old-iranian-1355045", "k2o8NpdPxt8", 4100],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
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

test("forty-sixth review batch exposes exact full-film links", () => {
  for (const [id, videoId] of [
    ["old-iranian-1345004", "w8GESUX8Mz8"],
    ["old-iranian-1345008", "AdvaJYeiuwI"],
    ["old-iranian-1345035", "NWlvuEkUEHs"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
    assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
  }
});

test("forty-seventh review batch exposes duration-checked direct players", () => {
  for (const [id, videoId] of [
    ["old-iranian-1345043", "9v0JNfC5ek8"],
    ["old-iranian-1345044", "DwDYTNeijiM"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, 5400);
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("forty-eighth review batch exposes direct year-matched players", () => {
  for (const [id, videoId] of [
    ["old-iranian-1345047", "SqBJIoAUrFY"],
    ["old-iranian-1345052", "UflS4HvxuQw"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
    assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
  }
});

test("forty-ninth review batch exposes the duration-checked Millionaires upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1346004");
  assert.ok(item);
  assert.equal(item[0].videoId, "I-EURFySeXg");
  assert.equal(item[0].durationSeconds, 5400);
  assert.ok((item[0].durationSeconds ?? 0) >= 3600);
});

test("fiftieth review batch exposes exact year-matched players", () => {
  for (const [id, videoId] of [
    ["old-iranian-1346016", "BOsn4Beg1Hs"],
    ["old-iranian-1346021", "TjNNJO8MCf4"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
    assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
  }
});

test("fifty-first review batch exposes exact full-film players", () => {
  for (const [id, videoId] of [
    ["old-iranian-1346029", "CMqIwphVRog"],
    ["old-iranian-1346032", "ok3XPm-QCZI"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
    assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
  }
});

test("fifty-second review batch exposes exact title/year players", () => {
  for (const [id, videoId] of [
    ["old-iranian-1346038", "X40F6wjrr8M"],
    ["old-iranian-1346043", "ciuenBWQn1M"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
    assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1346038")?.[0].durationSeconds, 5400);
});

test("fifty-third review batch exposes the next exact full-film players", () => {
  for (const [id, videoId] of [
    ["old-iranian-1346045", "CKpPcjPsIrU"],
    ["old-iranian-1346046", "E7-UHr7BvSo"],
    ["old-iranian-1346048", "m3KNT-kcXFo"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
    assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1346046")?.[0].durationSeconds, 5400);
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1346048")?.[0].durationSeconds, 6900);
});

test("fifty-fourth review batch exposes the exact full-length Noah's Ark upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1347002");
  assert.ok(item);
  assert.equal(item[0].videoId, "BY6VEnY8w8A");
  assert.equal(item[0].durationSeconds, 6600);
  assert.equal(item[0].playbackStatus, "not-tested");
  assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
});

test("fifty-fifth review batch exposes the complete Tehran Bride upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1346052");
  assert.ok(item);
  assert.equal(item[0].videoId, "zVRm53dTHak");
  assert.equal(item[0].playbackStatus, "not-tested");
  assert.match(item[0].title, /full film/i);
  assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
});

test("fifty-sixth review batch exposes the complete Golden Road to Samarkand upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1347001");
  assert.ok(item);
  assert.equal(item[0].videoId, "T4tlqkpn9BY");
  assert.equal(item[0].playbackStatus, "not-tested");
  assert.match(item[0].title, /full film/i);
  assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
});

test("fifty-seventh review batch exposes the duration-checked Babre Mazandaran upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1347007");
  assert.ok(item);
  assert.equal(item[0].videoId, "JroZcB7XYyc");
  assert.equal(item[0].durationSeconds, 7320);
  assert.equal(item[0].playbackStatus, "not-tested");
  assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
});

test("fifty-eighth review batch exposes the complete Eshq-e Qarun upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1347018");
  assert.ok(item);
  assert.equal(item[0].videoId, "hfvwkTkHtbw");
  assert.equal(item[0].playbackStatus, "not-tested");
  assert.match(item[0].title, /full film/i);
  assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
});

test("fifty-ninth review batch exposes the next two complete uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1347021", "krNNA6bOvRc"],
    ["old-iranian-1347030", "4a1gt72bbLs"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
    assert.match(item[0].title, /full film/i);
    assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1347021")?.[0].durationSeconds, 5400);
});

test("sixtieth review batch exposes the complete January Night upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1347033");
  assert.ok(item);
  assert.equal(item[0].videoId, "fZFGAtshlPc");
  assert.equal(item[0].durationSeconds, 6523);
  assert.equal(item[0].playbackStatus, "not-tested");
  assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=/);
});

test("sixty-first review batch exposes the complete Var Parideh upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1341006");
  assert.ok(item);
  assert.equal(item[0].videoId, "BVUFe_Pf6y0");
  assert.match(item[0].title, /Var Parideh/i);
  assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=BVUFe_Pf6y0$/);
});

test("sixty-second review batch exposes the duration-checked Ghorboon-e Khodam upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1341026");
  assert.ok(item);
  assert.equal(item[0].videoId, "neKcPzzhzYw");
  assert.equal(item[0].durationSeconds, 7260);
  assert.match(item[0].title, /full film/i);
  assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=neKcPzzhzYw$/);
});

test("sixty-third review batch exposes the duration-checked Nabgheh Haft Maheh upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1343002");
  assert.ok(item);
  assert.equal(item[0].videoId, "znOntmUhDRA");
  assert.equal(item[0].durationSeconds, 5640);
  assert.match(item[0].title, /full film/i);
  assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=znOntmUhDRA$/);
});

test("sixty-fourth review batch exposes the duration-checked Babr-e Ring upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1343016");
  assert.ok(item);
  assert.equal(item[0].videoId, "vizcCS5XIb4");
  assert.equal(item[0].durationSeconds, 5400);
  assert.match(item[0].title, /full film/i);
  assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=vizcCS5XIb4$/);
});

test("sixty-fifth review batch exposes the duration-checked Jahel-ha va Zhigool-ha upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1343028");
  assert.ok(item);
  assert.equal(item[0].videoId, "TbDLcP3iHvc");
  assert.equal(item[0].durationSeconds, 6060);
  assert.match(item[0].title, /full film/i);
  assert.match(item[0].sourceUrl, /^https:\/\/www\.youtube\.com\/watch\?v=TbDLcP3iHvc$/);
});

test("sixty-sixth review batch exposes two duration-checked classic uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1343029", "hg79gmT-_-c", 6060],
    ["old-iranian-1344031", "2oZ1ljTWxhg", 7680],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.match(item[0].title, /full film/i);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
});

test("sixty-seventh review batch exposes three duration-checked classic uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1344039", "hdxfF1-xec4", 6540],
    ["old-iranian-1344040", "VKy4-wudNIg", 6600],
    ["old-iranian-1345005", "aGWwzfXTM2U", 6600],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.match(item[0].title, /full film/i);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
});

test("sixty-eighth review batch exposes four duration-checked classic uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1339004", "CivFlu270SQ", 5400],
    ["old-iranian-1343005", "O2veU0WyXYE", 6180],
    ["old-iranian-1343022", "VfkqlKQgXd8", 5400],
    ["old-iranian-1343024", "tf-pnYuK2t4", 5400],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.match(item[0].title, /full film/i);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
});

test("sixty-ninth review batch exposes the duration-checked Dar Entehaye Zolmat upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1341023");
  assert.ok(item);
  assert.equal(item[0].videoId, "RGV9A2P4rOg");
  assert.equal(item[0].durationSeconds, 4800);
  assert.match(item[0].title, /full film/i);
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=RGV9A2P4rOg");
});

test("seventieth review batch exposes two duration-checked classic uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1345011", "Yal8Mp6dzHk", 6480],
    ["old-iranian-1345015", "o5bPTlS2Vqo", 6600],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.match(item[0].title, /full film/i);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
});

test("seventy-first review batch exposes the duration-checked Bi Eshq Hargez upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1345017");
  assert.ok(item);
  assert.equal(item[0].videoId, "j9RjyhvzALw");
  assert.equal(item[0].durationSeconds, 5820);
  assert.match(item[0].title, /full film/i);
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=j9RjyhvzALw");
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

test("thirty-fourth review batch exposes the exact full-film upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1344037");
  assert.ok(item);
  assert.equal(item[0].videoId, "THWjGxpJ59A");
  assert.equal(item[0].playbackStatus, "not-tested");
});

test("thirty-fifth review batch exposes exact full-film uploads", () => {
  const shadows = getOldIranianYouTubeVideos("old-iranian-1344042");
  assert.ok(shadows);
  assert.equal(shadows[0].videoId, "jmk1aCqAz-s");
  assert.equal(shadows[0].durationSeconds, 5400);
  assert.equal(shadows[0].playbackStatus, "available");

  const hat = getOldIranianYouTubeVideos("old-iranian-1345012");
  assert.ok(hat);
  assert.equal(hat[0].videoId, "C3NSyIW6xTY");
  assert.equal(hat[0].playbackStatus, "not-tested");
});

test("thirty-sixth review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1345022", "ZU7z0zTHthc"],
    ["old-iranian-1345036", "XrfPGL0NEwY"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
  }
});

test("thirty-seventh review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1345046", "_pGWJRqOmDg"],
    ["old-iranian-1345050", "hHxeeJ2NQyM"],
    ["old-iranian-1346010", "bUYHp6AbLH0"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].playbackStatus, "not-tested");
  }
});

test("thirty-eighth review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1346001", "VGn9g1UmpwI"], ["old-iranian-1346005", "03zI4XCQnV4"],
    ["old-iranian-1346011", "8T20_og-W84"], ["old-iranian-1346012", "W72CGsOK2-4"],
    ["old-iranian-1346025", "M85Izf72Tx0"], ["old-iranian-1346035", "N70aWC4SEEM"],
    ["old-iranian-1347003", "-ggUuAErhLw"], ["old-iranian-1347025", "Wm1GSyAfj4k"],
    ["old-iranian-1347028", "NUmF37NMtwQ"], ["old-iranian-1347042", "WX2EjkpsbtE"],
    ["old-iranian-1347043", "qfTA94Rvfdo"], ["old-iranian-1347045", "qQMI7N5RgMw"],
    ["old-iranian-1348001", "AHHZnJIscic"], ["old-iranian-1348002", "ItS1aWMSqQ8"],
    ["old-iranian-1348008", "uc2YlLuwEYc"], ["old-iranian-1348012", "OFkcpZpVtV4"],
    ["old-iranian-1348015", "2i3HRLSNKPo"], ["old-iranian-1348016", "ZG9tkguaU54"],
    ["old-iranian-1348018", "uF-RVVBYo74"], ["old-iranian-1348020", "aXztPdN-yHk"],
    ["old-iranian-1348022", "RK-kCSgGnz8"], ["old-iranian-1348023", "yPZxw28pZD8"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1347028")?.[0].durationSeconds, 5640);
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1348022")?.[0].playbackStatus, "available");
});

test("thirty-ninth review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1349003", "qCEGK2f9KgU"], ["old-iranian-1349004", "XqmNosjnfNU"],
    ["old-iranian-1349006", "xB6bT0mjP3k"], ["old-iranian-1349012", "U1nIFnb7RP8"],
    ["old-iranian-1349014", "SfBX4Q0tUyE"], ["old-iranian-1349021", "ELXAFxEwwL0"],
    ["old-iranian-1349023", "URsl28lfVds"], ["old-iranian-1349024", "pX9iYmX1DmQ"],
    ["old-iranian-1349030", "d7sLxJRwmXY"], ["old-iranian-1349033", "nBuqH-6rrj8"],
    ["old-iranian-1349034", "48zqoBzhaNQ"], ["old-iranian-1349042", "sjfGp4ctj9Y"],
    ["old-iranian-1349048", "Fl4K8IkbR_w"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1349048")?.[0].durationSeconds, 6540);
});

test("fortieth review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1358026", "1fBIwC9sNGc"], ["old-iranian-1356016", "IZSNf6PRCrM"],
    ["old-iranian-1356038", "RhKed2EME9E"], ["old-iranian-1356052", "2zew3R4y-FE"],
    ["old-iranian-1355049", "Pkl7xPP24qY"], ["old-iranian-1355017", "h7Kh6gR2f0c"],
    ["old-iranian-1355036", "e5beDKmWnJQ"], ["old-iranian-1350071", "yV262pEc2oY"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1358026")?.[0].durationSeconds, 6720);
});

test("forty-first review batch exposes exact feature-length uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1344006", "Ta-EpqLbNiI"], ["old-iranian-1344008", "H_kix1jMvVE"],
    ["old-iranian-1344013", "sZ5vP1YL-kQ"], ["old-iranian-1344035", "X-gfNZqKULw"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1344006")?.[0].durationSeconds, 6240);
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1344008")?.[0].durationSeconds, 5160);
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1344035")?.[0].durationSeconds, 7860);
});

test("forty-second review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1344019", "L_KvgcZn9J8"], ["old-iranian-1344023", "F6F17z_PdMI"],
    ["old-iranian-1344027", "io5WasjZ5x4"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1344019")?.[0].durationSeconds, 6480);
});

test("forty-third review batch exposes exact long-form uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1345006", "A5joarLJ4lA"], ["old-iranian-1345023", "hyejJS8X7Ik"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1345023")?.[0].durationSeconds, 5160);
});

test("forty-fourth review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1345026", "k12fsSX98Gk"], ["old-iranian-1345029", "vutOjSz4YP4"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1345026")?.[0].durationSeconds, 6300);
});

test("forty-fifth review batch exposes exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1345030", "goIy4NYS5I0"], ["old-iranian-1345033", "NZzQ8PaMys4"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1345033")?.[0].durationSeconds, 6060);
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

test("seventy-second review batch exposes exact classic-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1345024", "Jn0EfUyQyic"],
    ["old-iranian-1345014", "AO-5CWC0LOU"],
    ["old-iranian-1345027", "pAah2EIq-Rc"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /full film/i);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1345024")?.[0].durationSeconds, 5400);
});

test("seventy-third review batch exposes the duration-checked Lat-e Javanmard upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1337012");
  assert.ok(item);
  assert.equal(item[0].videoId, "_XCu-wpD4Mo");
  assert.equal(item[0].durationSeconds, 5640);
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=_XCu-wpD4Mo");
});

test("seventy-fourth review batch exposes the duration-checked Peyman Doosti upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1339023");
  assert.ok(item);
  assert.equal(item[0].videoId, "caApmR_pGq4");
  assert.equal(item[0].durationSeconds, 5160);
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=caApmR_pGq4");
});

test("seventy-fifth review batch exposes two duration-checked classic uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1345031", "IMYIqsstJAk", 6060],
    ["old-iranian-1345037", "EFWfj-K69Fw", 5400],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
});

test("seventy-sixth review batch exposes two exact-title complete uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1345034", "lExOhhyyZ1w"],
    ["old-iranian-1345054", "b1yIA7BQm3c"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /(?:full|complete) film/i);
    assert.equal(item[0].durationSeconds, undefined);
  }
});

test("seventy-seventh review batch exposes the duration-checked Arshin Malalan upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1339017");
  assert.ok(item);
  assert.equal(item[0].videoId, "fpY2f5uCdhw");
  assert.equal(item[0].durationSeconds, 7200);
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=fpY2f5uCdhw");
});

test("seventy-eighth review batch exposes two duration-checked classic uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1341012", "tG57N3h8pa8", 5880],
    ["old-iranian-1341015", "RM1oEu1Xnk4", 5400],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
});

test("seventy-ninth review batch exposes two exact-title feature uploads", () => {
  const parastooha = getOldIranianYouTubeVideos("old-iranian-1342024");
  assert.ok(parastooha);
  assert.equal(parastooha[0].videoId, "EAc1kiM5ntQ");
  assert.equal(parastooha[0].durationSeconds, 5160);
  assert.equal(parastooha[0].sourceUrl, "https://www.youtube.com/watch?v=EAc1kiM5ntQ");

  const abram = getOldIranianYouTubeVideos("old-iranian-1343021");
  assert.ok(abram);
  assert.equal(abram[0].videoId, "_eM8ud5W2Yo");
  assert.equal(abram[0].durationSeconds, undefined);
  assert.equal(abram[0].sourceUrl, "https://www.youtube.com/watch?v=_eM8ud5W2Yo");
});

test("eightieth review batch exposes two duration-checked feature uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1311001", "Yp7kNe_riaM", 4140],
    ["old-iranian-1338024", "4BQCl-a9Hx0", 5400],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
});

test("eighty-first review batch exposes the year-matched Sarkesh feature upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1343030");
  assert.ok(item);
  assert.equal(item[0].videoId, "U9UiRM6CTu4");
  assert.equal(item[0].durationSeconds, 5400);
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=U9UiRM6CTu4");
});

test("eighty-second review batch exposes two exact title/year feature uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1345019", "ISckI09Mk8w", 5400],
    ["old-iranian-1345032", "V6ZzJCEkPQI", undefined],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
});

test("eighty-third review batch exposes two duration-checked feature uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1346003", "VTKdOHkP1FA", 5700],
    ["old-iranian-1346033", "06_knnFUQEM", 6360],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
});

test("eighty-fourth review batch exposes the duration-checked Mojezeh upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1346042");
  assert.ok(item);
  assert.equal(item[0].videoId, "gzvDIj3mDwo");
  assert.equal(item[0].durationSeconds, 6900);
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=gzvDIj3mDwo");
});

test("eighty-fifth review batch exposes two duration-checked feature uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1347009", "wNApyIBZ418", 5580],
    ["old-iranian-1347015", "_6hsdc5X3SQ", 7140],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
  }
});

test("eighty-sixth review batch exposes the exact Mard Do Chehre upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1347004");
  assert.ok(item);
  assert.equal(item[0].videoId, "Ri697qFCOEk");
  assert.equal(item[0].durationSeconds, undefined);
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=Ri697qFCOEk");
  assert.equal(item[0].channel, "Bikiha");
});

test("eighty-seventh review batch exposes ten exact 1968 feature uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1347020", "gh1-HWF0-hk"],
    ["old-iranian-1347036", "IDRjRjoa0w4"],
    ["old-iranian-1347040", "DMk2B5pyj0c"],
    ["old-iranian-1347046", "cvle93i4Y54"],
    ["old-iranian-1347052", "UlqstbVxzWU"],
    ["old-iranian-1347054", "xIm_PZMUTDg"],
    ["old-iranian-1347061", "8cJp_E1WpCg"],
    ["old-iranian-1347063", "bA29ds4JtPc"],
    ["old-iranian-1347068", "mYqD8WtgK4M"],
    ["old-iranian-1347071", "PUW_WmipSc4"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /full film/i);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1347071")?.[0].durationSeconds, 5400);
});

test("eighty-eighth review batch exposes ten exact 1969 feature uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1348010", "w__UGyTOZHA"],
    ["old-iranian-1348011", "uy7GGKST1pk"],
    ["old-iranian-1348013", "eutuv_yasJs"],
    ["old-iranian-1348017", "eFsu4sfOSNQ"],
    ["old-iranian-1348026", "qz77DN7MJqo"],
    ["old-iranian-1348028", "ufZcuIa-w4Q"],
    ["old-iranian-1348037", "TQqSpX_HMuQ"],
    ["old-iranian-1348038", "P0aExsYhT9k"],
    ["old-iranian-1348039", "SVX3Fus24p8"],
    ["old-iranian-1348040", "lFpgZJmD7vU"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /full film/i);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1348011")?.[0].durationSeconds, 6633);
});

test("eighty-ninth review batch exposes the next exact 1969 feature uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1348021", "luYhgVrzRys"],
    ["old-iranian-1348042", "6Tofmx3mNbE"],
    ["old-iranian-1348043", "mW0V7EhyFok"],
    ["old-iranian-1348047", "raxoBF7hH7c"],
    ["old-iranian-1348054", "cjcfLJj8F2c"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /full film/i);
  }
});

test("ninetieth review batch exposes four more exact 1969 feature uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1348004", "1NttYCoLPUY"],
    ["old-iranian-1348007", "3xzSlFC0LqM"],
    ["old-iranian-1348024", "TsFfopx5t3Q"],
    ["old-iranian-1348029", "v0DEk636pPo"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /full film/i);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1348004")?.[0].durationSeconds, 5640);
});

test("ninety-first review batch exposes two more exact 1969 feature uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1348035", "pY8CxCVQiHs"],
    ["old-iranian-1348041", "q1vQTzeJGIs"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /full film/i);
  }
});

test("ninety-second review batch exposes three more exact 1969 feature uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1348019", "uR-Oz8kujHc"],
    ["old-iranian-1348044", "SKpVJURC39s"],
    ["old-iranian-1348045", "Snh3ERFOqGs"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /full film/i);
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1348044")?.[0].durationSeconds, 5400);
});

test("ninety-third review batch exposes two more exact 1969 feature uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1348033", "68bYzY6m-Wo"],
    ["old-iranian-1348036", "dAGNHdzoIE0"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /full film/i);
  }
});

test("curated full-film mappings replace stale persisted trailers", () => {
  const enriched = enrichOldIranianFilm({
    id: "old-iranian-1348036",
    youtubeVideos: [{
      videoId: "SYXzw_JtuI8",
      title: "old trailer",
      channel: "YouTube",
      sourceUrl: "https://www.youtube.com/watch?v=SYXzw_JtuI8",
    }],
  } as Parameters<typeof enrichOldIranianFilm>[0]);
  assert.equal(enriched.youtubeVideos?.[0].videoId, "dAGNHdzoIE0");
});

test("ninety-fourth review batch exposes the exact 1963 feature upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1343008");
  assert.ok(item);
  assert.equal(item[0].videoId, "5TWlZVRRIdk");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=5TWlZVRRIdk");
  assert.match(item[0].title, /full film/i);
});

test("ninety-fifth review batch exposes two duration-checked 1967 feature uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1346015", "NYC1ncX7nrQ"],
    ["old-iranian-1345053", "Hm9pYO6pobw"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
    assert.match(item[0].title, /full film/i);
  }
});

test("ninety-sixth review batch exposes the duration-checked 1968 feature upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1346051");
  assert.ok(item);
  assert.equal(item[0].videoId, "PQH_etJ6kg8");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=PQH_etJ6kg8");
  assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  assert.match(item[0].title, /full film/i);
});

test("ninety-seventh review batch exposes the exact 1966 Amir Arsalan feature upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1345021");
  assert.ok(item);
  assert.equal(item[0].videoId, "-QzqgokJ0O0");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=-QzqgokJ0O0");
  assert.match(item[0].title, /full film/i);
});

test("ninety-eighth review batch exposes the next two duration-checked features", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1345041", "296hPeOTw-U", 6300],
    ["old-iranian-1345049", "qQwilsgX5EQ", 5460],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.equal(item[0].durationSeconds, duration);
    assert.match(item[0].title, /full film/i);
  }
});

test("ninety-ninth review batch exposes the exact Iron Claw feature upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1347026");
  assert.ok(item);
  assert.equal(item[0].videoId, "1Swkxd19bhE");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=1Swkxd19bhE");
  assert.match(item[0].title, /full film/i);
});

test("one-hundredth review batch exposes the direct Goodbye Little One feature upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1354049");
  assert.ok(item);
  assert.equal(item[0].videoId, "HRvEXyLSGmo");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=HRvEXyLSGmo");
  assert.equal(item[0].durationSeconds, 6120);
  assert.match(item[0].title, /full film/i);
});

test("one-hundred-first review batch exposes two direct 1970 feature uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1349043", "ugThrMN-IqI", 5220],
    ["old-iranian-1349047", "ATTG9Iyw0NY", 5640],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.equal(item[0].durationSeconds, duration);
    assert.match(item[0].title, /full film/i);
  }
});

test("one-hundred-second review batch exposes two exact full-film uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1349054", "J7goiOYL3m8", undefined],
    ["old-iranian-1349042", "sjfGp4ctj9Y", 5400],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.equal(item[0].durationSeconds, duration);
    assert.match(item[0].title, /full film/i);
  }
});

test("one-hundred-third review batch exposes the direct Janjal-e Aroosi upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1349029");
  assert.ok(item);
  assert.equal(item[0].videoId, "d0EqauPoGvY");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=d0EqauPoGvY");
  assert.match(item[0].title, /full film/i);
});

test("one-hundred-fourth review batch exposes the duration-checked Majarajoyane Khashen upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1353053");
  assert.ok(item);
  assert.equal(item[0].videoId, "4MW0KFFQke8");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=4MW0KFFQke8");
  assert.equal(item[0].durationSeconds, 6000);
  assert.match(item[0].title, /full film/i);
});

test("one-hundred-fifth review batch exposes the duration-checked Pari Khoshgeleh upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1353011");
  assert.ok(item);
  assert.equal(item[0].videoId, "6HClUhQZevw");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=6HClUhQZevw");
  assert.equal(item[0].durationSeconds, 5513);
  assert.match(item[0].title, /full film/i);
});

test("one-hundred-sixth review batch exposes the duration-checked Mandrake upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1354008");
  assert.ok(item);
  assert.equal(item[0].videoId, "hJy8iFBIj1E");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=hJy8iFBIj1E");
  assert.equal(item[0].durationSeconds, 6069);
  assert.match(item[0].title, /Mandrake/i);
});

test("one-hundred-seventh review batch exposes the duration-checked Golden Heel upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1354002");
  assert.ok(item);
  assert.equal(item[0].videoId, "PKMW8M6HHko");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=PKMW8M6HHko");
  assert.equal(item[0].durationSeconds, 6840);
  assert.match(item[0].title, /Golden Heel/i);
});

