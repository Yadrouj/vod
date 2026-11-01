import test from "node:test";
import assert from "node:assert/strict";
import { parseGoogleNews, selectNews } from "../scrape-vod-news.mjs";
import { parseBoxOfficeTable } from "../lib/box-office.mjs";
test("RSS uses actual dates and stable IDs; malformed dates do not become today's news", () => {
  const item = '<item><title>خبر سینما</title><link>https://example.com/news</link><pubDate>Mon, 07 Sep 2026 12:00:00 GMT</pubDate><source>خبرگزاری</source></item>';
  const result = parseGoogleNews(`<rss>${item}</rss>`, "release");
  assert.equal(result[0].publishedAt, "2026-09-07T12:00:00.000Z");
  assert.equal(result[0].id, parseGoogleNews(item, "festival")[0].id);
  assert.equal(parseGoogleNews(item.replace('Mon, 07 Sep 2026 12:00:00 GMT', 'broken'), "release").length, 0);
});

test("publisher RSS preserves its attribution and Iranian headlines get priority over international headlines", () => {
  const xml='<item><title>فروش سینما بیشتر شد</title><link>https://example.com/new</link><pubDate>Sun, 01 Nov 2026 10:00:00 GMT</pubDate><description>گزارش تازه از فروش هفتگی سینما در ایران منتشر شد</description></item>';
  const [item]=parseGoogleNews(xml,"release","خبر فوری");
  assert.equal(item.source,"خبر فوری");assert.equal(item.category,"industry");assert.ok(item.tags.includes("گیشه"));
  const international={url:"https://example.com/world",title:"Latest world cinema",publishedAt:"2026-11-01T11:00:00Z"};
  assert.equal(selectNews([international,item],[],18,Date.parse("2026-11-01T12:00:00Z"))[0].source,"خبر فوری");
});

test("box office requires weekly toman labels and valid amounts; cumulative/rial/ambiguous tables are rejected", () => {
  const body=Array.from({length:3},(_,i)=>`<tr><td>${i+1}</td><td>فیلم ${i+1}</td><td>کارگردان</td><td>۲۴٬۱۲۱٬۱۸۹٬۴۰۰</td><td>۱۳۸٬۹۷۱</td></tr>`).join("");
  const html=`<table><tr><th>رتبه</th><th>نام فیلم</th><th>کارگردان</th><th>فروش هفتگی (تومان)</th><th>تعداد مخاطب</th></tr>${body}</table>`;
  const context={url:"https://example.com/report",publishedAt:"2026-10-31T07:49:41Z",title:"هفته اول آبان"};
  const result=parseBoxOfficeTable(html,context);
  assert.equal(result.rows[0].salesToman,24121189400);assert.equal(result.rows[0].audience,138971);assert.equal(result.metric,"weekly-sales");
  assert.equal(parseBoxOfficeTable(html.replace("هفتگی","تجمعی"),context),null);
  assert.equal(parseBoxOfficeTable(html.replace("تومان","ریال"),context),null);
  assert.equal(parseBoxOfficeTable(html,{...context,publishedAt:"broken"}),null);
});
test("news retains dated previous content, removes stale/future content, and deduplicates", () => {
  const now = Date.parse("2026-09-08T00:00:00Z");
  const old = { url: "https://example.com/a", publishedAt: "2026-09-07T00:00:00Z" };
  const fresh = [{ url: old.url, publishedAt: null }, { url: "https://example.com/b", publishedAt: "2025-01-01" }, { url: "https://example.com/c", publishedAt: "2027-01-01" }];
  assert.deepEqual(selectNews(fresh, [old], 18, now), [old]);
});
