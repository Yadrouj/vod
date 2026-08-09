import test from "node:test";
import assert from "node:assert/strict";
import {
  decodePlayerPayload,
  derivePersianTitle,
  mapMovieshoRestPost,
  parseArchiveDetailUrls,
  parseMovieshoDetail,
} from "../moviesho-archive-lib.mjs";

test("archive parser only returns detail links inside articles", () => {
  const html = `
    <a href="/category/movies/page/2/">pagination</a>
    <article><a href="https://www.moviesho.com/hovering-blade-2024-film/">Movie</a></article>
    <aside><a href="https://www.moviesho.com/sidebar-title/">Sidebar</a></aside>
    <article><a href="/furiosa-a-mad-max-saga-2024/">Movie 2</a></article>`;
  assert.deepEqual(parseArchiveDetailUrls(html), [
    "https://www.moviesho.com/hovering-blade-2024-film/",
    "https://www.moviesho.com/furiosa-a-mad-max-saga-2024/",
  ]);
});

test("detail parser extracts IMDb, direct qualities, runtime and encoded subtitle", () => {
  const subtitle = "https://sr.moviesho.com/Movie/Hovering.Blade.2024.fa.srt";
  const encoded = Buffer.from(subtitle).toString("base64");
  const html = `
    <link rel="alternate" type="application/json" href="https://www.moviesho.com/wp-json/wp/v2/posts/3773">
    <meta property="og:image" content="https://www.moviesho.com/wp-content/uploads/2024/06/poster-300x450.jpg">
    <div class="single-title"><h1>دانلود فیلم شمشیر معلق Hovering Blade 2024</h1></div>
    <div class="runtime text-muted-alt">106 دقیقه</div>
    <a href="https://www.imdb.com/title/tt12491094/">IMDb</a>
    <a href="https://sr.moviesho.com/Movie/Hovering.Blade.2024.1080p.WEB-DL.mkv">download</a>
    <a href="https://www.moviesho.com/play/?subtitle=${encodeURIComponent(encoded)}">play</a>`;
  const parsed = parseMovieshoDetail(html, "https://www.moviesho.com/hovering-blade-2024-film/");
  assert.equal(parsed.imdbCode, "tt12491094");
  assert.equal(parsed.runtimeMinutes, 106);
  assert.equal(parsed.links[0].quality, "1080p");
  assert.equal(parsed.links[0].subtitleUrl, subtitle);
  assert.equal(parsed.posterUrl, "https://www.moviesho.com/wp-content/uploads/2024/06/poster.jpg");
});

test("REST mapper keeps Persian metadata and canonical English title", () => {
  const detail = {
    pageUrl: "https://www.moviesho.com/hovering-blade-2024-film/",
    imdbCode: "tt12491094",
    titleFa: "دانلود فیلم شمشیر معلق Hovering Blade 2024",
    descriptionFa: "توضیح کوتاه",
    runtimeMinutes: 106,
    posterUrl: null,
    links: [],
  };
  const post = {
    id: 3773,
    slug: "hovering-blade-2024-film",
    title: { rendered: detail.titleFa },
    excerpt: { rendered: "<p>خلاصه فارسی</p>" },
    content: { rendered: "<h2>Hovering Blade 2024</h2><p>داستان کامل فارسی</p>" },
    _embedded: {
      "wp:term": [
        [{ taxonomy: "genre-movies", name: "درام" }],
        [{ taxonomy: "release", name: "2024" }],
        [{ taxonomy: "country", name: "چین" }],
      ],
      "wp:featuredmedia": [{ source_url: "https://www.moviesho.com/poster.jpg", media_details: { width: 1000, height: 1500 } }],
    },
  };
  const item = mapMovieshoRestPost(post, detail);
  assert.equal(item.title, "Hovering Blade");
  assert.equal(item.persianTitle, "شمشیر معلق");
  assert.equal(item.year, 2024);
  assert.deepEqual(item.persianGenres, ["درام"]);
  assert.equal(item.persianOverview, "داستان کامل فارسی");
});

test("player payload and Persian title helpers tolerate url-safe values", () => {
  const url = "https://sr.moviesho.com/Movie/sample.vtt";
  const encoded = Buffer.from(url).toString("base64url");
  assert.equal(decodePlayerPayload(encoded), url);
  assert.equal(derivePersianTitle("دانلود فیلم پدرخوانده The Godfather 1972", "The Godfather", 1972), "پدرخوانده");
  assert.equal(
    derivePersianTitle("دانلود فیلم The Isolate Thief 2026 (سارق گوشه گیر) زیرنویس فارسی", "The Isolate Thief", 2026),
    "سارق گوشه گیر",
  );
});
