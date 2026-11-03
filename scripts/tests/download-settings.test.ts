import assert from "node:assert/strict";
import test from "node:test";
import { applyDownloadBaseToItem, normalizeDownloadBaseUrl, rewriteDownloadUrl } from "../../lib/download-settings";
import { downloadGateUrl, decodeCompact } from "../../lib/download-gate";
import type { VodItem, VodLink } from "../../lib/types";

const fallback = "https://dls7.aparatchi-dlcenter.top/DonyayeSerial/";
const mediaPath = "movies/2009/tt1155056/SoftSub/I.Love.You.Man.2009.1080p.BluRay.SoftSub.YIFY.DonyayeSerial.mkv";
const original = `https://dls4.varzeshha3-uploader.top/DonyayeSerial/${mediaPath}`;

for (const domain of ["varzeshha3-uploader.top", "aparatchi-dlcenter.top"]) {
  test(`preserves every recorded shard on ${domain}, even when the fallback points elsewhere`, () => {
    for (const protocol of ["http", "https"]) {
      for (const shard of ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "42"]) {
        const source = `${protocol}://dls${shard}.${domain}/DonyayeSerial/${mediaPath}?download=1&token=a%2Fb#file`;
        assert.equal(rewriteDownloadUrl(source, fallback), source);
        assert.equal(rewriteDownloadUrl(source, "https://fallback.example/DonyayeSerial/"), source);
      }
    }
  });
}

test("the reported 1080p link stays on dls4, never the configured dls7 server", () => {
  assert.equal(rewriteDownloadUrl(original, fallback), original);
  assert.equal(new URL(rewriteDownloadUrl(original, fallback)).hostname, "dls4.varzeshha3-uploader.top");
});

test("unknown legacy mirrors still use the fallback and preserve path, query and fragment", () => {
  const source = `https://retired.example/DonyayeSerial/${mediaPath}?token=a%2Fb&download=1#file`;
  const expected = `${fallback}${mediaPath}?token=a%2Fb&download=1#file`;
  assert.equal(rewriteDownloadUrl(source, fallback), expected);
  assert.equal(rewriteDownloadUrl(expected, fallback), expected, "mapping is idempotent");
  for (const host of ["dls4.varzeshha3-uploader.top.example", "dls4.aparatchi-dlcenter.top.example", "other.varzeshha3-uploader.top"]) {
    assert.equal(rewriteDownloadUrl(`https://${host}/DonyayeSerial/${mediaPath}`, fallback), `${fallback}${mediaPath}`);
  }
});

test("unrelated, malformed and non-HTTP URLs are not reinterpreted as download mirrors", () => {
  for (const source of [
    "https://other.example/movie.mkv",
    "https://other.example/?next=/DonyayeSerial/movie.mkv",
    "https://other.example/#/DonyayeSerial/movie.mkv",
    "not a URL/DonyayeSerial/movie.mkv",
    "file:///DonyayeSerial/movie.mkv",
  ]) assert.equal(rewriteDownloadUrl(source, fallback), source);
});

test("primary, episode and supplementary links retain their source servers and metadata without mutating the catalog", async () => {
  const link: VodLink = { url: original, label: "1080p", quality: "1080p", release: "BluRay", group: "SoftSub", size: "1.45 GB" };
  const episode: VodLink = {
    ...link,
    url: "http://dls6.varzeshha3-uploader.top/DonyayeSerial/series2/tt0903747/SoftSub/S01/720p.BluRay/Breaking.Bad.S01E01.720p.mkv",
    season: 1,
    episode: 1,
  };
  const item: VodItem = {
    id: "mapping-fixture", imdbCode: "tt1155056", imdbUrl: null, title: "I Love You, Man", type: "movie", year: 2009,
    imdbRating: 7, imdbVotes: 1, groups: ["SoftSub"], qualities: ["1080p"], links: [link, episode],
    f2myExtraLinks: [{ ...link, url: original.replace("dls4.", "dls8.") }],
  };
  const snapshot = structuredClone(item);
  assert.deepEqual(await applyDownloadBaseToItem(item), snapshot);
  assert.deepEqual(item, snapshot);
});

test("plain and compact five-second download gates retain the corrected server", () => {
  const url = rewriteDownloadUrl(original, fallback);
  for (const compact of [false, true]) {
    const gate = new URL(downloadGateUrl({ url, compact, title: "I Love You, Man", quality: "1080p" }), "https://sarvnema.ir");
    assert.equal(gate.pathname, "/download/continue");
    const target = compact ? decodeCompact(gate.searchParams.get("u")!) : gate.searchParams.get("url");
    assert.equal(target, original);
  }
});

test("fallback settings remain normalized and require an HTTP DonyayeSerial base", () => {
  assert.equal(normalizeDownloadBaseUrl(" https://fallback.example/DonyayeSerial?ignored=1#fragment "), "https://fallback.example/DonyayeSerial/");
  for (const value of ["", "file:///DonyayeSerial/", "https://fallback.example/not-the-archive/"]) {
    assert.throws(() => normalizeDownloadBaseUrl(value));
  }
});
