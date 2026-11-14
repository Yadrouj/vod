import assert from "node:assert/strict";
import test from "node:test";
import { extractPrimaryArticle, extractPrimaryArtist, extractPrimaryMedia, isExcludedListingArticle } from "../music-fa-primary.mjs";

const ROOT = "https://musics-fa.com";
const expected = { name: "Ayoub Safaei Daryani", slug: "ayoub-safaei-daryani", sourceUrl: ROOT };
const persianTitle = "ایوب صفایی داریانی سلام خدا بر تو یا فاطمه (س)";
const artistLink = (slug, name) => `<a href="${ROOT}/artists/${slug}/">${name}</a>`;
const mediaLink = (name, field = "href") => `<a ${field}="https://dls.musics-fa.com/2026/11/${name}.mp3">Download</a>`;
const article = (body, heading = persianTitle) => `<article class="article-content"><h1>${heading}</h1>${body}</article>`;

test("missing related-posts marker never substitutes a sidebar singer for the expected Latin artist", () => {
  const unrelated = artistLink("mohsen-chavoshi", "محسن چاوشی");
  const html = `<aside>${unrelated}</aside>${article("<p>Primary song</p>")}<div class="sidebar">${unrelated}</div>`;
  assert.deepEqual(extractPrimaryArtist(html, { artist: expected, persianTitle }), [expected]);
  assert.equal(extractPrimaryArtist(html, { artist: expected, persianTitle })[0], expected);
});

test("mismatched artists and genre archive links inside the article are not guesses", () => {
  const html = article(artistLink("pop", "پاپ") + artistLink("mohsen-chavoshi", "محسن چاوشی"));
  assert.deepEqual(extractPrimaryArtist(html, { artist: expected, persianTitle }), [expected]);
  assert.deepEqual(extractPrimaryArtist(html, { persianTitle }), []);
  assert.deepEqual(extractPrimaryArtist(article(artistLink("happy", "شاد")), { artist: expected, persianTitle }), [expected]);
});

test("an exact normalized name wins over earlier unrelated artist links", () => {
  const target = { name: "علی یاسینی", slug: "ali-yasini", sourceUrl: ROOT };
  const html = article(artistLink("mohsen-chavoshi", "محسن چاوشی") + artistLink("ali-yasini", "علي ياسيني"));
  assert.deepEqual(extractPrimaryArtist(html, { artist: target }), [{ name: "علي ياسيني", slug: "ali-yasini", sourceUrl: `${ROOT}/artists/ali-yasini/` }]);
});

test("a Persian archive label can match the expected Latin artist by canonical slug", () => {
  const html = article(artistLink("another-singer", "خواننده دیگر") + artistLink("AYOUB_SAFAEI_DARYANI", "ایوب صفایی داریانی"));
  const selected = extractPrimaryArtist(html, { artist: expected })[0];
  assert.equal(selected.name, "ایوب صفایی داریانی");
  assert.equal(selected.slug, "ayoub_safaei_daryani");
  const encoded = article(artistLink(encodeURIComponent("علی یاسینی"), "علی یاسینی"));
  assert.equal(extractPrimaryArtist(encoded, { artist: { name: "Ali Yasini", slug: "علی-یاسینی" } })[0].name, "علی یاسینی");
});

test("a whole Persian title prefix is evidence, but a name substring is not", () => {
  const html = article(artistLink("mohsen-chavoshi", "محسن چاوشی") + artistLink("ayoub-safaei", "ایوب صفایی") + artistLink("ayoub-safaei-daryani", "ایوب صفایی داریانی"));
  assert.equal(extractPrimaryArtist(html, { artist: { ...expected, slug: "unknown", name: "Unknown" }, persianTitle })[0].name, "ایوب صفایی داریانی");
  assert.deepEqual(extractPrimaryArtist(article(artistLink("ali", "علی")), { artist: expected, persianTitle: "علیان ترانه" }), [expected]);
  assert.equal(extractPrimaryArtist(article(artistLink("farshad-azadi", "فرشاد آزادی")), { artist: { name: "Farshad Azadi" } })[0].name, "فرشاد آزادی");
});

test("the h1 article wins over preceding cards; nested related/sidebar media and artists are excluded", () => {
  const unrelated = artistLink("mohsen-chavoshi", "محسن چاوشی") + mediaLink("unrelated-320");
  const html = `<article class="card"><h2>Other song</h2>${unrelated}</article>
    <article id='post-42' class='post article-content'><h1>${persianTitle}</h1>
      ${artistLink("ayoub-safaei-daryani", "ایوب صفایی داریانی")}
      ${mediaLink("primary-320")}${mediaLink("primary-128", "data-song")}
      <section class='extra related-posts'><div>${unrelated}</div></section>
      <aside><div>${unrelated}</div></aside>
      <div id="sidebar"><div>${unrelated}</div>${mediaLink("sidebar")}</div>
      <article class="recommendation-card">${unrelated}</article>
      ${mediaLink("primary-320")}
    </article><footer>${unrelated}</footer>`;
  const primary = extractPrimaryArticle(html);
  assert.ok(primary.includes("primary-320"));
  assert.ok(!primary.includes("unrelated") && !primary.includes("mohsen-chavoshi"));
  assert.equal(extractPrimaryArtist(html, { artist: expected, persianTitle })[0].name, "ایوب صفایی داریانی");
  const sources = extractPrimaryMedia(html);
  assert.equal(sources.length, 2);
  assert.deepEqual(sources.map(({ kind, quality }) => ({ kind, quality })), [{ kind: "download", quality: "320kbps" }, { kind: "stream", quality: "128kbps" }]);
  assert.ok(sources.every((source) => source.url.includes("primary-") && source.provider === "musics-fa" && source.basePath === "https://dls.musics-fa.com/2026/11/"));
});

test("the fallback primary article works without h1 and keeps stream synthesis and HTML query decoding", () => {
  const html = `<aside><article>${mediaLink("sidebar")}</article></aside>
    <article class="article-content"><h2>Listing title</h2><a href="https://musics-fa.com/song-320.mp3?one=1&amp;two=2">Download</a></article>
    <article>${mediaLink("related")}</article>`;
  const sources = extractPrimaryMedia(html);
  assert.equal(sources.length, 2);
  assert.deepEqual(sources.map((source) => source.kind), ["stream", "download"]);
  assert.ok(sources.every((source) => source.url === "https://musics-fa.com/song-320.mp3?one=1&two=2"));
});

test("a page without an article fails closed; comments/scripts and malformed artist URLs are not evidence", () => {
  const unrelated = artistLink("mohsen-chavoshi", "محسن چاوشی") + mediaLink("unrelated");
  assert.equal(extractPrimaryArticle(`<main><h1>Song</h1>${unrelated}</main>`), "");
  assert.deepEqual(extractPrimaryMedia(unrelated), []);
  assert.deepEqual(extractPrimaryArtist(unrelated, { artist: expected }), [expected]);
  const html = `<!-- ${article(unrelated)} --><script>const template = '${article(unrelated)}';</script>${article(artistLink("%E0%A4%A", "خواننده دیگر") + mediaLink("primary"))}`;
  assert.ok(extractPrimaryMedia(html).every((source) => source.url.includes("primary")));
  assert.deepEqual(extractPrimaryArtist(html, { artist: expected }), [expected]);
});

test("attributes are read structurally rather than from data-href or quoted lookalike attributes", () => {
  const html = article(`<a data-href="${ROOT}/artists/ayoub-safaei-daryani/">Unrelated singer</a>
    <div title='ignore href="https://dls.musics-fa.com/false-320.mp3"'></div>
    <a href='${ROOT}/artists/ayoub-safaei-daryani/' title="Archive > link">آرشیو آهنگ‌های ایوب صفایی داریانی</a>
    <a data-href="https://dls.musics-fa.com/false-128.mp3">Unrelated</a>
    ${mediaLink("primary")}`);
  assert.equal(extractPrimaryArtist(html, { artist: expected })[0].name, "ایوب صفایی داریانی");
  assert.ok(extractPrimaryMedia(html).every((source) => source.url.includes("primary")));
});

test("clear English Nohe and Madahi listing descriptions follow the existing exclusion policy", () => {
  for (const age of ["New", "Old"]) for (const kind of ["Nohe", "Madahi", "Maddahi"]) {
    const html = `<article><h2>${persianTitle}</h2><p>Download <b>${age}</b>&nbsp;${kind} BY : Ayoub Safaei Daryani | Salam</p></article>`;
    assert.equal(isExcludedListingArticle(html), true, `${age} ${kind}`);
  }
  assert.equal(isExcludedListingArticle(article("<p>DOWNLOAD OLD MADDAHI BY : Singer | Title</p>")), true);
  assert.equal(isExcludedListingArticle(article("<p>Download New Music BY : Singer | Nohe</p>")), false);
  assert.equal(isExcludedListingArticle(article("<p>Download New Nohero BY : Singer</p>")), false);
  assert.equal(isExcludedListingArticle(`${article("<p>Download New Music BY : Singer | Title</p>")}<aside>Download New Nohe BY : Other</aside>`), false);
  assert.equal(isExcludedListingArticle(article('<p>Download Old Music BY : Singer | Title</p><div class="related-posts">Download Old Maddahi BY : Other</div>')), false);
});
