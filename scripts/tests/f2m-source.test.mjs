import test from "node:test";
import assert from "node:assert/strict";
import {
  extractF2mSeriesIdentity,
  normalizeF2mDirectUrl,
  parseF2mSeriesPage,
  scoreImdbSuggestion,
} from "../f2m-source-lib.mjs";

const post = {
  id: 83882,
  slug: "younger",
  link: "https://www.f2my.top/series/younger/",
  title: { rendered: "دانلود سریال Younger بدون سانسور با زیرنویس فارسی چسبیده" },
};

test("extracts the canonical series title from mixed Persian source titles", () => {
  assert.deepEqual(extractF2mSeriesIdentity(post), {
    title: "Younger",
    persianTitle: null,
    aliases: [],
  });
  assert.equal(
    extractF2mSeriesIdentity({ ...post, slug: "the-husband", title: { rendered: "دانلود سریال کره ای شوهر The Husband بدون سانسور" } }).persianTitle,
    "کره ای شوهر",
  );
});

test("extracts all qualities and stores a host-independent source path", () => {
  const html = `
    <span>سال ساخت 2015</span><svg><use href="#icon-imdb"></use></svg><strong>7.8</strong>
    <a href="https://random.abrtech.top/yA3f/Series/Younger/Younger.S01E01.1080p.WEB-DL.Farsi.Sub.Film2Media.mkv">1080</a>
    <a onclick="handleDownloadClick('https://random.abrtech.top/yA3f/Series/Younger/Younger.S01E01.720p.WEB-DL.Farsi.Sub.Film2Media.mkv')">720</a>`;
  const parsed = parseF2mSeriesPage(html, post);
  assert.equal(parsed.links.length, 2);
  assert.equal(parsed.links[0].season, 1);
  assert.equal(parsed.links[0].episode, 1);
  assert.equal(parsed.links[0].sourceBaseId, "f2m-series");
  assert.equal(parsed.links[0].sourceRelativePath.startsWith("Series/Younger/"), true);
  assert.equal(parsed.sourceBases[0].baseUrl, "https://random.abrtech.top/yA3f/");
  assert.equal(parsed.year, 2015);
});

test("normalizes changing CDN roots without losing the series path", () => {
  const normalized = normalizeF2mDirectUrl("https://cdn.example/x9/Series/Foo/Foo.S02E03.480p.mkv");
  assert.equal(normalized.sourceBaseId, "f2m-series");
  assert.equal(normalized.sourceBaseUrl, "https://cdn.example/x9/");
  assert.equal(normalized.sourceRelativePath, "Series/Foo/Foo.S02E03.480p.mkv");
});

test("IMDb suggestion scoring strongly prefers exact TV series", () => {
  const exact = scoreImdbSuggestion("Younger", 2015, { id: "tt3288518", l: "Younger", q: "TV series", qid: "tvSeries", y: 2015, rank: 1760 });
  const movie = scoreImdbSuggestion("Younger", 2015, { id: "tt0108636", l: "Younger and Younger", q: "feature", qid: "movie", y: 1993 });
  assert.ok(exact > 150);
  assert.equal(movie, -Infinity);
});
