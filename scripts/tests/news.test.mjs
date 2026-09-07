import test from "node:test";
import assert from "node:assert/strict";
import { parseGoogleNews, selectNews } from "../scrape-vod-news.mjs";
test("RSS uses actual dates and stable IDs; malformed dates do not become today's news", () => {
  const item = '<item><title>خبر سینما</title><link>https://example.com/news</link><pubDate>Mon, 07 Sep 2026 12:00:00 GMT</pubDate><source>خبرگزاری</source></item>';
  const result = parseGoogleNews(`<rss>${item}</rss>`, "release");
  assert.equal(result[0].publishedAt, "2026-09-07T12:00:00.000Z");
  assert.equal(result[0].id, parseGoogleNews(item, "festival")[0].id);
  assert.equal(parseGoogleNews(item.replace('Mon, 07 Sep 2026 12:00:00 GMT', 'broken'), "release").length, 0);
});
test("news retains dated previous content, removes stale/future content, and deduplicates", () => {
  const now = Date.parse("2026-09-08T00:00:00Z");
  const old = { url: "https://example.com/a", publishedAt: "2026-09-07T00:00:00Z" };
  const fresh = [{ url: old.url, publishedAt: null }, { url: "https://example.com/b", publishedAt: "2025-01-01" }, { url: "https://example.com/c", publishedAt: "2027-01-01" }];
  assert.deepEqual(selectNews(fresh, [old], 18, now), [old]);
});
