import test from "node:test";
import assert from "node:assert/strict";
import {
  extractF2myDownloadUrls,
  extractF2myArchivePageCount,
  f2myLinkIdentity,
  parseF2myArchivePage,
  parseF2myDetailPage,
  parseF2mySeriesPage,
  splitF2myBase,
} from "../f2my-series-lib.mjs";

const page = `
  <html><head>
    <title>دانلود فصل 2 سریال سیلو Silo بدون سانسور با زیرنویس فارسی چسبیده</title>
    <link rel="canonical" href="https://www.f2my.top/series/silo/">
    <script type="application/ld+json">{"thumbnailUrl":"https://cdn.test/silo.jpg"}</script>
  </head><body>
    <a href="https://www.imdb.com/title/tt14688458/">IMDb</a>
    <a href="https://old-one.abrtech.top/oG4i/Series/Silo/S01/Silo.S01E01.1080p.WEB-DL.Farsi.Dubbed.mkv">download</a>
    <button onclick="handleDownloadClick('https://old-two.abrtech.top/yA3f/Series_09/Silo/S01/Silo.S01E01.720p.WEB-DL.Farsi.Sub.mkv')">download</button>
    <a href="https://old-one.abrtech.top/oG4i/Series/Silo/S01/Silo.S01E01.English.srt">subtitle</a>
    <a href="https://old-one.abrtech.top/oG4i/Series/Silo/S01/Silo.2023.Trailer.mp4">trailer</a>
    <a href="https://www.f2my.top/series/silo/?playit=x&type=series">play</a>
  </body></html>`;

test("splits rotating host base from stable series path", () => {
  const result = splitF2myBase("https://cdn.example/a1/Series_09/Silo/S01/file.mkv");
  assert.equal(result.baseUrl, "https://cdn.example/a1/");
  assert.equal(result.relativePath, "Series_09/Silo/S01/file.mkv");
  assert.match(result.id, /^f2my-[a-f0-9]{12}$/);
});

test("uses the first rotating folder as the base and rejects concatenated or invalid hosts", () => {
  const repeated = splitF2myBase("https://cdn.example/yA3f/yA3f/Series/Example/S01/example.s01e01.mkv");
  assert.equal(repeated.baseUrl, "https://cdn.example/yA3f/");
  assert.equal(repeated.relativePath, "yA3f/Series/Example/S01/example.s01e01.mkv");
  const urls = extractF2myDownloadUrls("<a href=\"https://.abrtech.top/Movie/2026/bad.mkv%20ftp://example.test/next.mkv\">bad</a>");
  assert.deepEqual(urls, []);
});

test("extracts all direct media links but ignores player and images", () => {
  const urls = extractF2myDownloadUrls(`${page}<img src="https://cdn.test/poster.jpg">`);
  assert.equal(urls.length, 4);
  assert.ok(urls.every((url) => !url.includes("playit=")));
});

test("parses links, IMDb, subtitles, trailer and distinct base mappings", () => {
  const parsed = parseF2mySeriesPage(page, {
    id: 14217,
    slug: "silo",
    link: "https://www.f2my.top/series/silo/",
    modified_gmt: "2026-08-07T06:50:52",
    title: { rendered: "دانلود فصل 2 سریال سیلو Silo بدون سانسور" },
    excerpt: { rendered: "<p>داستان سریال سیلو</p>" },
    class_list: ["genres-drama", "genres-science-fiction", "language-english"],
  });

  assert.equal(parsed.item.imdbCode, "tt14688458");
  assert.equal(parsed.item.title, "Silo");
  assert.equal(parsed.item.persianTitle, "سیلو");
  assert.equal(parsed.item.links.length, 2);
  assert.equal(parsed.item.f2myExtraLinks.length, 2);
  assert.equal(parsed.item.links[0].season, 1);
  assert.equal(parsed.item.links[0].episode, 1);
  assert.equal(parsed.item.links[0].subtitles[0].language, "en");
  assert.deepEqual(parsed.item.qualities, ["1080p", "720p"]);
  assert.equal(parsed.bases.length, 2);
  assert.notEqual(f2myLinkIdentity(parsed.item.links[0]), f2myLinkIdentity(parsed.item.links[1]));
});

test("discovers both movie and series archive cards", () => {
  const movieArchive = `<article class="entry"><figure><img src="/poster.jpg"><figcaption>دانلود فیلم کری Carrie 2013</figcaption></figure><a href="https://www.f2my.top/7101/carrie-2013/" class="stretched-link"><h2 class="entry-title">Carrie 2013</h2></a></article><a href="/movies/page/361/">361</a>`;
  const seriesArchive = `<article class="entry"><a href="https://www.f2my.top/series/silo/" class="stretched-link"><h2 class="entry-title">Silo</h2></a></article>`;
  assert.equal(parseF2myArchivePage(movieArchive, "movie").length, 1);
  assert.equal(parseF2myArchivePage(movieArchive, "movie")[0].id, 7101);
  assert.equal(parseF2myArchivePage(seriesArchive, "series")[0].link, "https://www.f2my.top/series/silo/");
  assert.equal(extractF2myArchivePageCount(movieArchive, "movie"), 361);
});

test("parses movie links without fake season metadata", () => {
  const html = `<title>دانلود فیلم کری Carrie 2013</title><a href="https://www.imdb.com/title/tt1939659">IMDb</a><a href="https://cdn.test/yA3f/Film/2013/Carrie.2013/Carrie.2013.1080p.BluRay.mkv">download</a>`;
  const parsed = parseF2myDetailPage(html, { type: "movie", cardTitle: "Carrie 2013", link: "https://www.f2my.top/7101/carrie-2013/" });
  assert.equal(parsed.item.type, "movie");
  assert.equal(parsed.item.title, "Carrie");
  assert.equal(parsed.item.links[0].season, null);
  assert.equal(parsed.item.links[0].episode, null);
  assert.equal(parsed.bases[0].relativePath, "Film/2013/Carrie.2013/Carrie.2013.1080p.BluRay.mkv");
});
