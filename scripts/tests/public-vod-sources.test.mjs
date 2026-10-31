import test from "node:test";
import assert from "node:assert/strict";
import { familyMovieItem, htmlMediaItem, normalizeDownload, publicUrl, PUBLIC_VOD_SOURCES, robotsAllowed, sourceIdentity, stableMediaKey } from "../public-vod-sources.mjs";
import { DEFAULT_SCRAPER_DASHBOARD_CONFIG, sanitizeScraperDashboardConfig } from "../scraper-dashboard-config.mjs";
import { DAILY_JOBS } from "../maintenance-policy.mjs";

const source = PUBLIC_VOD_SOURCES.find(source => source.id === "familymovie");
const now = Date.parse("2026-10-31T12:00:00Z");
const expires = Math.floor(now / 1000) + 86400;
const download = { quality: "WEB-DL 1080pSoftSub", url: `https://media.example/Film.S01E02.1080p.WEB-DL.SoftSub.mkv?expires=${expires}&md5=signature`, season: "1", episode: "2" };

test("all seven requested providers are registered without inventing a download API", () => {
  assert.equal(PUBLIC_VOD_SOURCES.length, 7);
  assert.equal(PUBLIC_VOD_SOURCES.find(source => source.id === "9movie").canonical, "https://9movie.info/");
  assert.equal(PUBLIC_VOD_SOURCES.find(source => source.id === "movie-chi").adapter, "discovery");
});
test("public media keeps signatures, quality, subtitle type and exact episode", () => {
  const link = normalizeDownload(download, { provider: source.id, pageUrl: source.url, now });
  assert.equal(link.quality, "1080p"); assert.equal(link.group, "SoftSub");
  assert.equal(link.season, 1); assert.equal(link.episode, 2);
  assert.equal(new URL(link.url).searchParams.get("md5"), "signature");
  assert.equal(stableMediaKey(link), stableMediaKey({ ...link, url: link.url.replace("signature", "refreshed") }));
});
test("expired media, trailers, private addresses and application installers are rejected", () => {
  const options = { provider: source.id, pageUrl: source.url, now };
  for (const url of ["https://media.example/Film.mp4?expires=1", "https://media.example/Film.Trailer.mp4", "https://media.example/app.apk", "http://127.0.0.1/private.mkv", "https://user:password@media.example/Film.mkv", "http://[::1]/film.mkv"]) assert.equal(normalizeDownload({ url }, options), null);
  assert.equal(normalizeDownload({ ...download, dead: true }, options), null);
  assert.equal(publicUrl("javascript:alert(1)", source.url), null);
});
test("matching uses the full title, type and year, never the source user rating as IMDb", () => {
  const detail = { id: "source-1", title: "House", year: "2004", type: "series", avgRating: 10, downloads: [download] };
  const known = new Map([[sourceIdentity(detail), { id: "tt0412142", imdbCode: "tt0412142" }]]);
  const item = familyMovieItem(detail, source, known, now);
  assert.equal(item.id, "tt0412142"); assert.equal(item.imdbRating, null);
  assert.notEqual(sourceIdentity(detail), sourceIdentity({ ...detail, type: "movie" }));
  assert.notEqual(sourceIdentity(detail), sourceIdentity({ ...detail, year: 2026 }));
  assert.equal(familyMovieItem({ ...detail, title: "Paris Has Fallen" }, source, known, now), null);
  assert.equal(familyMovieItem(detail, source, new Map([[sourceIdentity(detail), { id: "tt33184638", imdbCode: "tt33184638" }]]), now), null);
});
test("robots chooses specific groups and longest matching allow rules", () => {
  const robots = "User-agent: *\nDisallow: /api/\nAllow: /api/public/\nUser-agent: OtherBot\nDisallow: /";
  assert.equal(robotsAllowed(robots, "https://example.org/api/private"), false);
  assert.equal(robotsAllowed(robots, "https://example.org/api/public/list"), true);
  assert.equal(robotsAllowed(robots + "\nUser-agent: SarvNemaCatalogBot\nDisallow: /", "https://example.org/"), false);
});
test("HTML extraction rejects unrelated player placeholders and ambiguous IMDb identity", () => {
  const post = { title: "House", link: "https://example.org/series/house-2004" };
  const html = '<a href="https://imdb.com/title/tt0412142/">IMDb</a><a href="https://cdn.example/House.S01E01.1080p.SoftSub.mkv">Download</a><video src="https://example.org/blank.mp4"></video>';
  const item = htmlMediaItem(html, post, { id: "example" });
  assert.equal(item.links.length, 1); assert.equal(item.type, "tvSeries");
  assert.equal(htmlMediaItem(html + '<a href="https://imdb.com/title/tt0111161/">Other film</a>', post, { id: "example" }), null);
});
test("nightly source upgrades preserve disabled providers and stay within four hours", () => {
  const previous = { schedule: { startHour: 4, endHour: 6 }, sources: [{ id: "music", enabled: false }] };
  const config = sanitizeScraperDashboardConfig(previous);
  assert.equal(config.sources.find(source => source.id === "music").enabled, false);
  assert.equal(config.sources.find(source => source.id === "public-video").startHour, 4);
  assert.equal(DAILY_JOBS.filter(job => job.id === "public-video").length, 1);
  assert.ok(DEFAULT_SCRAPER_DASHBOARD_CONFIG.sources.some(source => source.id === "public-video"));
  assert.ok(DAILY_JOBS.reduce((sum, job) => sum + job.minutes, 0) <= 240);
});
