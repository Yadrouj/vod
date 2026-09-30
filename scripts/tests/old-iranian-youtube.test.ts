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

test("one-hundred-tenth review batch exposes exact Persian-title feature films", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1355048", "TORcy5Gosn0", 4578],
    ["old-iranian-1355052", "dHnF7wPuGUY", 4896],
    ["old-iranian-1355053", "wO-w44g-t9c", 5629],
    ["old-iranian-1355059", "Yt-O4YPWtIM", 5776],
    ["old-iranian-1355060", "GNTLvFRu6qI", 5978],
    ["old-iranian-1355062", "T3OqygZrv68", 5798],
    ["old-iranian-1355065", "mR0rWlGmxFE", 5732],
    ["old-iranian-1354052", "RvydlA2HljQ", 5177],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("one-hundred-fifteenth review batch exposes exact 1354 feature films", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1354036", "HZH64YsfBWY", 7180],
    ["old-iranian-1354037", "vFAT1RZOONs", 5302],
    ["old-iranian-1354040", "meLTTixOrVs", 6367],
    ["old-iranian-1354041", "9rYtXc2NiG4", 7025],
    ["old-iranian-1354042", "EchVsNz6_vM", 5390],
    ["old-iranian-1354044", "fK8Neo4P-fc", 5016],
    ["old-iranian-1354045", "7dfwV8Hwen0", 5594],
    ["old-iranian-1354046", "RtpqqSt5XgE", 6568],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("one-hundred-seventeenth review batch exposes exact 1353 feature films", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1353055", "5T1MBAuEcJA", 6631],
    ["old-iranian-1353058", "Xk9ywF5ybEk", 5274],
    ["old-iranian-1353044", "Pl9IDBiCO6w", 5447],
    ["old-iranian-1353028", "pvnzzW_0vkU", 5941],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("one-hundred-eighteenth review batch exposes exact 1353 feature films", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1353030", "uYLYkuS1SOg", 6440],
    ["old-iranian-1353040", "RvZiNQ63-UU", 5198],
    ["old-iranian-1353003", "QsK4SiwkSoA", 6440],
    ["old-iranian-1353010", "cmuYiCqCSjo", 6239],
    ["old-iranian-1353014", "4qyQLFB3lNo", 5843],
    ["old-iranian-1353021", "9hFT_iEd_SU", 6011],
    ["old-iranian-1353012", "8bK_Os6bDas", 5942],
    ["old-iranian-1353013", "wSp3Oufr4_E", 7020],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("one-hundred-nineteenth review batch exposes exact archive feature films", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1353029", "zCjRDVRurvU", 5697],
    ["old-iranian-1353033", "fbVWn0eqM5Q", 6531],
    ["old-iranian-1353046", "zwZyZi5wpEA", 5942],
    ["old-iranian-1353022", "1VyDDAwUBzM", 6300],
    ["old-iranian-1353005", "YearyStuv7E", 6535],
    ["old-iranian-1353048", "PaH9qCDr-HE", 5468],
    ["old-iranian-1353008", "zC8HbSzY3bY", 6142],
    ["old-iranian-1352055", "DGnw2kVAahg", 5877],
    ["old-iranian-1353039", "7Ng91o94iAQ", 5504],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("one-hundred-twentieth review batch exposes exact archive feature films", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1353019", "9jxl45C0Uc0", 5837],
    ["old-iranian-1353038", "z9Rwn5Onu2Q", 5104],
    ["old-iranian-1353001", "hvsLZk4sPK4", 5956],
    ["old-iranian-1353037", "Og5VK8eMXZI", 6579],
    ["old-iranian-1352041", "a8wGTmwI8fo", 5654],
    ["old-iranian-1352079", "LQE12AgmQVg", 5796],
    ["old-iranian-1353024", "pSgvsNKLdLo", 5937],
    ["old-iranian-1353025", "BAYyxGSvggs", 6357],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("one-hundred-twenty-first review batch exposes exact archive feature films", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1353031", "RqJTwUCFI3Y", 4229],
    ["old-iranian-1353041", "cm0tHBqmtGc", 6171],
    ["old-iranian-1353045", "IbPLA4Ko_gc", 9374],
    ["old-iranian-1353047", "bSnWboEe6Q0", 5686],
    ["old-iranian-1353052", "MG9broZvsq8", 6312],
    ["old-iranian-1353057", "jOdulOqQ8Bw", 5103],
    ["old-iranian-1353060", "w0gb4C2jIwo", 4617],
    ["old-iranian-1353063", "w6qgy1m8ik4", 5470],
    ["old-iranian-1353064", "oeO3zkD9wDU", 5303],
    ["old-iranian-1352063", "EDb6aaZXRqU", 4664],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("one-hundred-twenty-second review batch exposes exact archive feature films", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1352009", "GXI9J9dWzJk", 6039],
    ["old-iranian-1352016", "2MuaJZNbbFI", 6689],
    ["old-iranian-1352031", "1rUeQkud4zM", 6518],
    ["old-iranian-1352069", "TAWDAGnnjsk", 6468],
    ["old-iranian-1352077", "tigJIc5spAE", 6799],
    ["old-iranian-1352039", "IuPGZUhuMbQ", 6524],
    ["old-iranian-1352051", "MhKZQrMmnXk", 5840],
    ["old-iranian-1352021", "X4qXRk8TnCU", 5122],
    ["old-iranian-1352043", "vfUBWBy0O8s", 6141],
    ["old-iranian-1352058", "MmXID92UYeQ", 5041],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("one-hundred-twenty-third review batch exposes exact archive feature films", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1351088", "QOPvUTDxas4", 5143],
    ["old-iranian-1352027", "t2oEJShNEH8", 5223],
    ["old-iranian-1352054", "1M0E1MPD7TA", 6380],
    ["old-iranian-1351079", "FvJ9XlcfG34", 6352],
    ["old-iranian-1352001", "fPZbsdCi_Ac", 6147],
    ["old-iranian-1352052", "s1AOz4--xPA", 7182],
    ["old-iranian-1352049", "eAw9va1qdA4", 5791],
    ["old-iranian-1352029", "wgAQnSKdqx4", 5817],
    ["old-iranian-1352073", "r0z2Y79HCyk", 6047],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("one-hundred-twenty-fourth review batch exposes exact archive feature films", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1352067", "G56oyeve94Y", 4991],
    ["old-iranian-1352045", "CQIkcddYESY", 6118],
    ["old-iranian-1353017", "MXFT5wHttck", 6565],
    ["old-iranian-1352007", "FZIZ0_g83NE", 6057],
    ["old-iranian-1352013", "_2QDqSLGB1c", 5314],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("one-hundred-sixteenth review batch exposes exact archive feature films", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1354051", "UgyQu0linbI", 5269],
    ["old-iranian-1354053", "qzV7-IbzILc", 5797],
    ["old-iranian-1354059", "kizYrD1oCOw", 5977],
    ["old-iranian-1354062", "9BIDZZ5egEk", 5890],
    ["old-iranian-1354021", "vzKgy4zqY54", 5399],
    ["old-iranian-1353042", "BpF8aEmrPoc", 5566],
    ["old-iranian-1352066", "iV47jXhcPjo", 4406],
    ["old-iranian-1354012", "dH6zlYifz3E", 7248],
    ["old-iranian-1353015", "O30ckFCpWt8", 7160],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("one-hundred-eleventh review batch exposes exact classic feature uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1354033", "Er_eP6Y5UIQ", 6071],
    ["old-iranian-1355066", "pKEvZFOZjec", 4877],
    ["old-iranian-1354025", "jjKFEj9PH3o", 5010],
    ["old-iranian-1355002", "xs4zGOqNyac", 5768],
    ["old-iranian-1354047", "BpKcHF6J8VY", 5241],
    ["old-iranian-1353050", "TS1x-2FBlw8", 6568],
    ["old-iranian-1354063", "yYmGn6dPQI4", 6550],
    ["old-iranian-1354023", "vDS3bak7u5g", 4952],
    ["old-iranian-1355067", "1nACXIXt31E", 4799],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("one-hundred-twelfth review batch exposes exact long-form classic uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1354038", "Gdn9oAjK4EI", 5635],
    ["old-iranian-1354061", "s-XzMxB_VS8", 6746],
    ["old-iranian-1354034", "MyfPhxMjjnY", 6168],
    ["old-iranian-1354028", "jkGGl4B4jqY", 5816],
    ["old-iranian-1353049", "D5UQvfRT1o8", 4283],
    ["old-iranian-1354016", "71lD0TLjnZA", 6002],
    ["old-iranian-1354020", "QV6Ni6_UV_w", 5417],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("one-hundred-thirteenth review batch exposes exact full-length archive films", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1354054", "HK2al2rmnfg", 5012],
    ["old-iranian-1354024", "neRk7oMRnFM", 5369],
    ["old-iranian-1354056", "SivepD-Tz5U", 4852],
    ["old-iranian-1354032", "Jf-aKCm0liM", 6894],
    ["old-iranian-1354007", "PvrZslImrrM", 6286],
    ["old-iranian-1354029", "qfY-ePY1vvo", 4256],
    ["old-iranian-1354043", "m9yl9_OaW7Q", 5297],
    ["old-iranian-1354010", "pT15jtiFgRk", 5367],
    ["old-iranian-1354004", "FYqvnfIbo6E", 5644],
    ["old-iranian-1354005", "GZWhqvbuiPI", 5761],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
  }
});

test("one-hundred-fourteenth review batch exposes exact classic archive uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1354006", "wa9vaMmvGr4", 5437],
    ["old-iranian-1354009", "YV7PKXbHBQo", 4566],
    ["old-iranian-1354011", "5ewGztrA6Cs", 6262],
    ["old-iranian-1354013", "FwzseVvDPxE", 6360],
    ["old-iranian-1354022", "O9vYMfDCr04", 5887],
    ["old-iranian-1354027", "A6wK65mAB38", 5720],
    ["old-iranian-1354030", "T3FF0MsHgIk", 5923],
    ["old-iranian-1354031", "V096_3TCkMk", 5814],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].durationSeconds, duration);
    assert.equal(item[0].checkedAt, "2026-09-29");
    assert.ok((item[0].durationSeconds ?? 0) >= 3600);
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

test("one-hundred-twenty-fifth review batch exposes five duration-checked full-film uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1353043", "qTYdG_eVv4Q", 4395],
    ["old-iranian-1353051", "BhbP3qnOkww", 6600],
    ["old-iranian-1352062", "PuC-fLRxqX4", 5400],
    ["old-iranian-1352002", "wxAHo3Di2e0", 5580],
    ["old-iranian-1352011", "_vEVtQaQewQ", 6960],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.equal(item[0].durationSeconds, duration);
    assert.match(item[0].title, /full movie/i);
  }
});

test("one-hundred-twenty-sixth review batch exposes nine duration-checked full-film uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1351012", "Mj39CPWJ054", 5460],
    ["old-iranian-1351020", "9pRXzSFZowo", 5400],
    ["old-iranian-1351076", "JXLz3BQ5Tc8", 6600],
    ["old-iranian-1351033", "aXJd2c6G8Xs", 6600],
    ["old-iranian-1351062", "3pmVku2Ghy4", 6600],
    ["old-iranian-1351078", "Yi_q_zYtTds", 7020],
    ["old-iranian-1351056", "llygOd91J5Y", 6420],
    ["old-iranian-1352008", "y9bnXkbKZEQ", 5160],
    ["old-iranian-1351045", "f-mTO9__koE", 7200],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.equal(item[0].durationSeconds, duration);
    assert.match(item[0].title, /full movie/i);
  }
});

test("one-hundred-twenty-seventh review batch exposes six exact full-film uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1352074", "9ZahYQIip80", undefined],
    ["old-iranian-1352032", "sR-0dG9EIa8", undefined],
    ["old-iranian-1352056", "4mx-80_6mnw", 5880],
    ["old-iranian-1352060", "XPKxZ9iVXKU", undefined],
    ["old-iranian-1355047", "JoZUQ6moOAU", undefined],
    ["old-iranian-1352034", "et2cgkwZz5c", 5780],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.equal(item[0].durationSeconds, duration);
    assert.match(item[0].title, /full movie/i);
  }
});

test("one-hundred-twenty-eighth review batch exposes four exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1355055", "0rt7Mi1Og5I"],
    ["old-iranian-1355042", "R0gSVF_H0uk"],
    ["old-iranian-1354017", "AgmujYIZxEE"],
    ["old-iranian-1354035", "3ErcGMDCGMQ"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /full movie/i);
  }
});

test("one-hundred-twenty-ninth review batch exposes two exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1354039", "wSO4SKsPv60"],
    ["old-iranian-1353016", "gCtEljskE9E"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /full movie/i);
  }
});

test("one-hundred-thirtieth review batch exposes the exact Morad Barghi full-film upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1353004");
  assert.ok(item);
  assert.equal(item[0].videoId, "MlMTwjiRHM4");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=MlMTwjiRHM4");
  assert.match(item[0].title, /full movie/i);
});

test("one-hundred-thirty-first review batch exposes two exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1352082", "gf9xOvD_6ww"],
    ["old-iranian-1352006", "djgvv2tDmLU"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /full movie/i);
  }
});

test("one-hundred-thirty-second review batch exposes three duration-checked or exact full-film uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1352071", "x840wM3HE6U", 6600],
    ["old-iranian-1352023", "Pe8wIF7NOIo", 5640],
    ["old-iranian-1352046", "1hnwDFUJ4X0", undefined],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.equal(item[0].durationSeconds, duration);
    assert.match(item[0].title, /full movie/i);
  }
});

test("one-hundred-thirty-third review batch exposes the exact Agha Mehdi Kalle-Paz full-film upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1352028");
  assert.ok(item);
  assert.equal(item[0].videoId, "jYOxAdhfDLY");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=jYOxAdhfDLY");
  assert.match(item[0].title, /full movie/i);
});

test("one-hundred-thirty-fourth review batch exposes two exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1352005", "nmoROQVynjo"],
    ["old-iranian-1352036", "et-ByqTHctA"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /full movie/i);
  }
});

test("one-hundred-thirty-fifth review batch exposes two exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1352026", "JcJOTIQUxH4"],
    ["old-iranian-1352080", "IjIBvazdi0M"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /full movie/i);
  }
});

test("one-hundred-thirty-sixth review batch exposes the exact Holoo-ye Poost-Kandeh upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1352015");
  assert.ok(item);
  assert.equal(item[0].videoId, "haf_wbLUPbU");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=haf_wbLUPbU");
  assert.match(item[0].title, /full movie/i);
});

test("one-hundred-thirty-seventh review batch exposes three exact full-film uploads", () => {
  for (const [id, videoId, duration] of [
    ["old-iranian-1354026", "kzBLbCtnZyA", undefined],
    ["old-iranian-1353007", "NTCKsQC001c", undefined],
    ["old-iranian-1352003", "KFdxGW36-IM", 6840],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.equal(item[0].durationSeconds, duration);
    assert.match(item[0].title, /full movie/i);
  }
});

test("one-hundred-thirty-eighth review batch exposes two exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1353023", "5yBdnddnfD4"],
    ["old-iranian-1352064", "I3vCIjQCY7s"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /full movie/i);
  }
});

test("one-hundred-thirty-ninth review batch exposes two exact full-film uploads", () => {
  for (const [id, videoId] of [
    ["old-iranian-1352012", "E8Wzp3YYZow"],
    ["old-iranian-1352017", "Ad30K7arlsQ"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, /full movie/i);
  }
});

test("one-hundred-fortieth review batch exposes two exact full-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1352020", "Tj0pa3S2XVU", "بدکاران"],
    ["old-iranian-1352053", "ApPX7OLz_Fc", "مترس"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, new RegExp(title));
  }
});

test("one-hundred-forty-first review batch exposes five exact full-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1352018", "C5mShwyO6EU", "جنوبی"],
    ["old-iranian-1352037", "CV6U4Kv74ZI", "عروس و مادر شوهر"],
    ["old-iranian-1352047", "FYA_5yQK3iE", "صخره سیاه"],
    ["old-iranian-1352061", "yX4NGBFu0Lk", "دل خودش می‌خواد"],
    ["old-iranian-1352075", "FAAFCsEMUe8", "تنها و گل‌ها"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, new RegExp(title));
  }
});

test("one-hundred-forty-second review batch exposes five exact full-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1352050", "GXG1kr8pndU", "شورش"],
    ["old-iranian-1352057", "hlgJgGZu-cc", "پسرخوانده"],
    ["old-iranian-1352081", "kTMsWSYa_yA", "بیگانه"],
    ["old-iranian-1353018", "-utRG0bsl5c", "سر طلایی"],
    ["old-iranian-1351084", "xGFgQ4ZkkJQ", "صبح روز چهارم"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.match(item[0].title, new RegExp(title));
  }
});

test("one-hundred-forty-third review batch exposes three exact full-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1352065", "mlM8ZAo5FaU", "قربون زن ایرونی"],
    ["old-iranian-1352040", "Hj6_I1lDVUU", "گدای میلیونر"],
    ["old-iranian-1351057", "iAkM3gNiKVI", "جهنم + من"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-forty-fourth review batch exposes two exact full-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351080", "NxiPYTQMEfE", "تختخواب سه نفره"],
    ["old-iranian-1351086", "pI325KKXq6g", "یک میلیونر و دو مفلس"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-forty-fifth review batch exposes one exact full-film upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1350069");
  assert.ok(item);
  assert.equal(item[0].videoId, "6xSJ8y7Ffqk");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=6xSJ8y7Ffqk");
  assert.ok(item[0].title.includes("رشید"));
});

test("one-hundred-forty-sixth review batch exposes two exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351001", "jVFUAbEeF2U", "مهدی مشکی و شلوارک داغ"],
    ["old-iranian-1351006", "PeNquB4Nyng", "حسن دینامیت"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-forty-seventh review batch exposes three exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351085", "g3dDl0dMfEQ", "چشمه"],
    ["old-iranian-1351005", "GOr4C2PLzHM", "قلندر"],
    ["old-iranian-1351059", "1gXWkwbRPNw", "حسن سیاه"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-forty-eighth review batch exposes four exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351066", "bnAnRUQEeeA", "آبنبات چوبی"],
    ["old-iranian-1351029", "u9mb5oBwL5U", "مرد اجاره‌ای"],
    ["old-iranian-1351030", "2R-TnwLm-R8", "گذر اکبر"],
    ["old-iranian-1351065", "dwMu2WiYcd4", "فاتح دلها"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-forty-ninth review batch exposes two exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351042", "AiMkkS8imCI", "غریبه"],
    ["old-iranian-1351087", "bWvTnAx3XMQ", "مستاجر"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-fiftieth review batch exposes two exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351007", "T1rczg4UGrs", "علی سورچی"],
    ["old-iranian-1351067", "5oac262A7Q8", "تشنه باران"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-fifty-first review batch exposes five exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351051", "xYUiReKgVfM", "خانواده سرکار غضنفر"],
    ["old-iranian-1351050", "UAiJsp_Ucak", "کاکل زری"],
    ["old-iranian-1351036", "exaAONTMEh8", "آشوبگر"],
    ["old-iranian-1351037", "c2X9mZgACNs", "ساحره"],
    ["old-iranian-1351010", "MxSmT0eL6_Q", "قدیر"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-fifty-second review batch exposes three exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351090", "lt3O-KqjICY", "پری خوشگله"],
    ["old-iranian-1351089", "TyOQqH2pF1U", "ضعیفه"],
    ["old-iranian-1351081", "cs-NWEM3Sl8", "مردان خلیج"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-fifty-third review batch exposes one exact classic-film upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1351016");
  assert.ok(item);
  assert.equal(item[0].videoId, "ET9DPUv2e8g");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=ET9DPUv2e8g");
  assert.ok(item[0].title.includes("احمد چوپان"));
});

test("one-hundred-fifty-sixth review batch exposes two exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351071", "h36L8tfQVpE", "Dagger"],
    ["old-iranian-1351043", "4mXUCNY4pIc", "Baba Nan Dad"],
    ["old-iranian-1351046", "5_Z_QVEQr-Y", "Baluch"],
    ["old-iranian-1352078", "PKzkuphoo3w", "Mostafa Loreh"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-fifty-seventh review batch exposes seven exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1352014", "dx3wmZ0Ts34", "Manic"],
    ["old-iranian-1351023", "ia9Q9fAbKcg", "Chubby"],
    ["old-iranian-1351038", "qACqqgnRZas", "Life Gambling"],
    ["old-iranian-1351028", "pmKEPWmNVcM", "Prodigies"],
    ["old-iranian-1351048", "xMa0ooGtM1c", "The White Clove"],
    ["old-iranian-1351052", "ZxmDq_7N58I", "Boatmen"],
    ["old-iranian-1351061", "G1t74co2Z1M", "The sergeant major and the cop"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-fifty-eighth review batch exposes two exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351063", "GoiXr3F2Ju4", "Navvab"],
    ["old-iranian-1351018", "GHVm5qImI0E", "Jadal dar Kavir"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-fifty-ninth review batch exposes the exact Khar-e Dajjal upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1351054");
  assert.ok(item);
  assert.equal(item[0].videoId, "vZtGzJhEydI");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=vZtGzJhEydI");
  assert.ok(item[0].title.includes("Khar-e Dajjal"));
});

test("one-hundred-sixtieth review batch exposes five exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351058", "7oNEmbLk-Xw", "Master Sergeant"],
    ["old-iranian-1351024", "UHK-ac9f9gM", "The Lover"],
    ["old-iranian-1351004", "IbmwBSiQX8o", "Cunning Reza"],
    ["old-iranian-1350068", "Jl8IkoqvEbg", "Noghre-dagh"],
    ["old-iranian-1351073", "qWXaOOIGVnY", "The only Man in the Neighborhood"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-sixty-first review batch exposes three exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351072", "AVdRtI-7Iqc", "Shir Too Shir"],
    ["old-iranian-1350007", "Fv5ftNBLAws", "The Carriage Driver"],
    ["old-iranian-1350012", "XbIKAlcy4r4", "Hot Sensation"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-sixty-second review batch exposes four exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1353056", "FG9JCrulGz0", "Shazdeh Ehtejab"],
    ["old-iranian-1352068", "4jyjwWhVzYM", "The Chase to Hell"],
    ["old-iranian-1351027", "omLSC45rfNo", "The Suitor"],
    ["old-iranian-1351026", "L1G8JnIDMMA", "Morghe Tokhm Tala"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-sixty-third review batch exposes five exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1352025", "rl-J1yiwW9E", "Escape from Death"],
    ["old-iranian-1351015", "2mvocsKYMe4", "Ragbar"],
    ["old-iranian-1351074", "dwX1dbyLnRc", "Pedar ke na-khalaf oftad"],
    ["old-iranian-1351008", "yKa3-LYZWoc", "The Golden Waterfall"],
    ["old-iranian-1351014", "zIw_BolG_MA", "Ba Sharafha"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-sixty-fourth review batch exposes five exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351035", "LeWfFcx-MMw", "Kheyli Ham Mamnoon"],
    ["old-iranian-1351034", "QDYLJNQ_il4", "Pakhmeh"],
    ["old-iranian-1351064", "w_6jxnlFGmE", "Hamisheh Ghahreman"],
    ["old-iranian-1351075", "JAWEJ5clEJM", "Shirbaha"],
    ["old-iranian-1351083", "Kz5ueF03SDQ", "Khanoom Khanooma"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-sixty-fifth review batch exposes five exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1350033", "y9uC-XoxFmE", "Escape from the Trap"],
    ["old-iranian-1350061", "YdZjYAOkAUI", "A Man and a City"],
    ["old-iranian-1350054", "i3c_uKDU04Q", "Gholam Jandarm"],
    ["old-iranian-1350063", "IUg1V_N3z2s", "Adamak"],
    ["old-iranian-1351032", "4RBYDKzM_Bo", "Fetne in Boots"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-sixty-sixth review batch exposes five exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1350079", "qcAcTfvh0TM", "Starless Sky"],
    ["old-iranian-1350043", "q4pqGEW4Ylk", "Trees Die Standing"],
    ["old-iranian-1350037", "B1-5P0yHXAI", "Looti"],
    ["old-iranian-1350077", "Tnp3H575ZZs", "The Glass Wall"],
    ["old-iranian-1350046", "qX_K80x_C9Q", "The Most Beautiful Woman in the World"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-sixty-seventh review batch exposes four exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1350002", "ka0XBl3KI7o", "Ayyoob"],
    ["old-iranian-1350053", "Q0RXucj01pg", "Howff of Anger"],
    ["old-iranian-1349057", "y7hh7S3r7PY", "Night of the Execution"],
    ["old-iranian-1351039", "THjaj0b-o1k", "Sun City"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1350053")?.[0].durationSeconds, 5460);
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1351039")?.[0].durationSeconds, 5760);
});

test("one-hundred-sixty-eighth review batch exposes four exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351009", "8J3sTqAzN24", "Repentance"],
    ["old-iranian-1351019", "YDTKfV8lhdc", "Escaping from Life"],
    ["old-iranian-1351017", "ha8N9UzaSWg", "The Saving Angel"],
    ["old-iranian-1351092", "d974u5msmjs", "How Scary Is the Darkness of the Soul"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1351092")?.[0].durationSeconds, 3600);
});

test("one-hundred-sixty-ninth review batch exposes four exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1350018", "3UYc9I0z8Rg", "Mah-pishooni"],
    ["old-iranian-1350058", "RAb-B1mJszQ", "Beautiful of the Neighborhood"],
    ["old-iranian-1350030", "iXmO17jESAU", "Die Hard"],
    ["old-iranian-1350005", "KAjJNJ9x1nM", "The Bridge"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1350030")?.[0].durationSeconds, 5640);
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1350005")?.[0].durationSeconds, 5400);
});

test("one-hundred-seventieth review batch exposes four exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1352084", "fGv6HEaZEBg", "Do Kabootar"],
    ["old-iranian-1351082", "exaAONTMEh8", "The Insurgent"],
    ["old-iranian-1350072", "3dVo_8s1ICQ", "The Interim Husband"],
    ["old-iranian-1351049", "gGsa_Q84cP0", "Fataneh"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-seventy-first review batch exposes three exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1350076", "QPuMa3hcsb0", "A Suitcaseful of Sex"],
    ["old-iranian-1350003", "Qnm03EujMaM", "One Beautiful and 1000 Problems"],
    ["old-iranian-1350055", "_a6X4JRnRLA", "Heydar"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1350055")?.[0].durationSeconds, 5040);
});

test("one-hundred-seventy-second review batch exposes three exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1350052", "SPwOHlcs8Yg", "The Wedding Night"],
    ["old-iranian-1350032", "JF58DXLTCSE", "The Spectacle"],
    ["old-iranian-1350021", "Q4pJxYw7rJ4", "Shater Abbas"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-seventy-third review batch exposes three exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1350010", "CaBIsgeHnZg", "Faryad"],
    ["old-iranian-1350029", "7GZuXvigSyI", "Inverted Life"],
    ["old-iranian-1350045", "YOZciq1J16A", "Mard Afkan"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1350029")?.[0].durationSeconds, 5400);
});

test("one-hundred-seventy-fourth review batch exposes two exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351053", "lVNbpdKfsEs", "Yek Jo Gheyrat"],
    ["old-iranian-1351068", "_rjwRCWf0us", "Toghrul"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1351068")?.[0].durationSeconds, 5460);
});

test("one-hundred-seventy-fifth review batch exposes two exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1350051", "WDjTalRAuAg", "The Scandal of Love"],
    ["old-iranian-1350084", "2nId-SKolvY", "Three Fearless Heroes"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1350084")?.[0].durationSeconds, 5340);
});

test("one-hundred-seventy-sixth review batch exposes two exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1350048", "aLMMgFSTdMU", "Furious Men"],
    ["old-iranian-1350017", "QVY8CpHNja0", "Ahmad Chakme-ee"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1350048")?.[0].durationSeconds, 6660);
});

test("one-hundred-seventy-seventh review batch exposes two exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1350011", "cGX97x9tcUI", "Men of the Dawn"],
    ["old-iranian-1349056", "_GFGslIpwPA", "Dokhtar-e Zalem-Bala"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1350011")?.[0].durationSeconds, 5400);
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1349056")?.[0].durationSeconds, 5400);
});

test("one-hundred-seventy-eighth review batch exposes two exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1350038", "hMr9KoFpn8U", "The World Is Mine"],
    ["old-iranian-1350022", "OrfZBuiZ_lE", "The Hero Mofrad"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1350022")?.[0].durationSeconds, 5400);
});

test("one-hundred-seventy-ninth review batch exposes three exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1350074", "mnx5N9OsKOI", "For Whom the Hearts Beat"],
    ["old-iranian-1350008", "gEsyQisoOcY", "Nobar-e Esfahan"],
    ["old-iranian-1350019", "tyJvw5Dqq9A", "Ra'd o Bargh"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
  assert.equal(getOldIranianYouTubeVideos("old-iranian-1350074")?.[0].durationSeconds, 5520);
});

test("one-hundred-eightieth review batch exposes the exact Goodbye My Friend upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1350049");
  assert.ok(item);
  assert.equal(item[0].videoId, "JUfIDKVbmLY");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=JUfIDKVbmLY");
  assert.ok(item[0].title.includes("Goodbye, My Friend"));
});

test("one-hundred-eighty-first review batch exposes the exact Sharareh upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1350034");
  assert.ok(item);
  assert.equal(item[0].videoId, "NoGxpgwSREA");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=NoGxpgwSREA");
  assert.ok(item[0].title.includes("Sharareh"));
});

test("one-hundred-eighty-second review batch exposes the exact Jungle Man upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1349064");
  assert.ok(item);
  assert.equal(item[0].videoId, "EHBsipJcc5Q");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=EHBsipJcc5Q");
  assert.ok(item[0].title.includes("The Jungle Man"));
});

test("one-hundred-eighty-third review batch exposes the alternate-title Shab-e Bazigaran upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1357027");
  assert.ok(item);
  assert.equal(item[0].videoId, "nlk2i3UXml8");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=nlk2i3UXml8");
  assert.ok(item[0].title.includes("Shab-e Bazigaran"));
});

test("one-hundred-eighty-fourth review batch exposes the exact Reza Chelchele upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1350050");
  assert.ok(item);
  assert.equal(item[0].videoId, "hTrzk7P-I1k");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=hTrzk7P-I1k");
  assert.ok(item[0].title.includes("Reza Chelchele"));
});

test("one-hundred-eighty-fifth review batch exposes the official Badnam upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1350065");
  assert.ok(item);
  assert.equal(item[0].videoId, "WPe46pn0jvI");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=WPe46pn0jvI");
  assert.ok(item[0].title.includes("Badnam"));
});

test("one-hundred-eighty-sixth review batch exposes the official Raze Derakhte Senjed upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1350073");
  assert.ok(item);
  assert.equal(item[0].videoId, "01ofDJRTEwY");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=01ofDJRTEwY");
  assert.ok(item[0].title.includes("Raze Derakhte Senjed"));
});

test("one-hundred-eighty-seventh review batch exposes the official Aziz Gherghi upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1350070");
  assert.ok(item);
  assert.equal(item[0].videoId, "lFNvw67sxn4");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=lFNvw67sxn4");
  assert.ok(item[0].title.includes("Aziz Gherghi"));
});

test("one-hundred-eighty-eighth review batch exposes the full Vahshi-ye Jangal upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1350028");
  assert.ok(item);
  assert.equal(item[0].videoId, "ZtqlLX6r-6s");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=ZtqlLX6r-6s");
  assert.ok(item[0].title.includes("Vahshi-ye Jangal"));
});

test("one-hundred-eighty-ninth review batch exposes the official Shohare Ahoo Khanoom upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1347048");
  assert.ok(item);
  assert.equal(item[0].videoId, "zaOrPfROSGk");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=zaOrPfROSGk");
  assert.ok(item[0].title.includes("Shohare Ahoo Khanoom"));
});

test("one-hundred-ninetieth review batch exposes the complete Azhir-e Khatari upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1349015");
  assert.ok(item);
  assert.equal(item[0].videoId, "39ioR8UAYQI");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=39ioR8UAYQI");
  assert.ok(item[0].title.includes("Azhir-e Khatari"));
});

test("one-hundred-ninety-first review batch exposes two exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1350004", "UhgYDZi7IvA", "Fatehin-e Sahra"],
    ["old-iranian-1349026", "ThLj3OYmgx0", "Saghi"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-fifty-fifth review batch exposes two exact classic-film uploads", () => {
  for (const [id, videoId, title] of [
    ["old-iranian-1351040", "OhAxZpViVrk", "Motreb"],
    ["old-iranian-1351055", "aaPGoVshnVs", "Hour of Calamity"],
  ] as const) {
    const item = getOldIranianYouTubeVideos(id);
    assert.ok(item);
    assert.equal(item[0].videoId, videoId);
    assert.equal(item[0].sourceUrl, `https://www.youtube.com/watch?v=${videoId}`);
    assert.ok(item[0].title.includes(title));
  }
});

test("one-hundred-fifty-fourth review batch exposes one exact classic-film upload", () => {
  const item = getOldIranianYouTubeVideos("old-iranian-1351025");
  assert.ok(item);
  assert.equal(item[0].videoId, "s9WIgVR_w48");
  assert.equal(item[0].sourceUrl, "https://www.youtube.com/watch?v=s9WIgVR_w48");
  assert.ok(item[0].title.includes("اتل متل توتوله"));
});

