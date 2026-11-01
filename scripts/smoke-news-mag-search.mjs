import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const origin=process.env.LOAD_BASE_URL || "http://127.0.0.1:3004";
assert.ok(["localhost","127.0.0.1","[::1]"].includes(new URL(origin).hostname));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const news=JSON.parse(await readFile("public/data/vod-news.json","utf8"));
assert.ok(Date.now()-Date.parse(news.generatedAt)<86400000);
assert.ok(news.items.some(item=>item.source==="خبر فوری" || item.source==="تسنیم"));
assert.equal(news.boxOffice.metric,"weekly-sales");assert.equal(news.boxOffice.rows.length,5);
const magazine=JSON.parse(await readFile("public/data/magazine.json","utf8"));
assert.equal(magazine.articles.length,30);assert.equal(new Set(magazine.articles.map(a=>a.slug)).size,30);
const suggest=await (await fetch(`${origin}/api/suggest?q=house&suggest=spelling-v3&sort=imdb-popular-trends-v1&limit=20`)).json();
assert.ok(suggest.items.length>1);
assert.ok(suggest.items.every((item,i)=>!i || (suggest.items[i-1].imdbRating??-1)>=(item.imdbRating??-1)));
const archive=await(await fetch(`${origin}/api/archive?q=house&offset=0`)).json();
assert.equal(archive.items[0].id,suggest.items[0].imdbCode);
const sitemapResponse=await fetch(`${origin}/mag/sitemap.xml`);assert.equal(sitemapResponse.status,200);
const xml=await sitemapResponse.text();
for(const article of magazine.articles) assert.ok(xml.includes(`/mag/${article.slug}`));
const browser=await chromium.launch({channel:"chrome",headless:true});
try {
  const page=await browser.newPage({serviceWorkers:"block"});page.setDefaultNavigationTimeout(120000);page.setDefaultTimeout(30000);
  await page.context().addCookies([{name:"vod_locale",value:"fa",url:origin}]);
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  for(const width of [320,390,1440]) {
    await page.setViewportSize({width,height:900});
    const response=await page.goto(origin,{waitUntil:"domcontentloaded"});assert.equal(response.status(),200);
    const box=page.locator("[data-box-office]");await box.scrollIntoViewIfNeeded();
    assert.equal(await box.locator("tbody tr").count(),5);
    assert.ok((await box.textContent()).includes("بورسیه"));
    assert.ok((await page.locator(".news-rail").textContent()).includes(news.items[0].title));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:`.media-cache/news-box-office-${width}.png`});
    console.log(`PASS ${width}px: current dated news, weekly sales, no overflow`);
  }
  for(const article of [magazine.articles[1],magazine.articles.at(-1)]) {
    const response=await page.goto(`${origin}/mag/${article.slug}`,{waitUntil:"domcontentloaded"});assert.equal(response.status(),200);
    assert.ok((await page.locator("h1").textContent()).includes(article.title));
    console.log(`PASS article: ${article.slug}`);
  }
  await page.goto(`${origin}/mag`,{waitUntil:"domcontentloaded"});
  assert.ok(await page.locator('a[href="/mag/personal-music-playlist-guide"]').count());
  const rejected=await page.request.post(`${origin}/api/search/selection`,{data:{itemId:"tt0412142"},headers:{Origin:"https://unrelated.example"}});
  assert.equal(rejected.status(),403);
  const oversized=await page.request.post(`${origin}/api/search/selection`,{data:{itemId:"x".repeat(600)},headers:{Origin:origin}});assert.equal(oversized.status(),413);
  // Tests validation without manufacturing real popularity for a title.
  const unknown=await page.request.post(`${origin}/api/search/selection`,{data:{itemId:"tt000000000000"},headers:{Origin:origin}});assert.equal(unknown.status(),404);
  assert.deepEqual(errors,[]);
  console.log("PASS IMDb-first search/browse, all 30 magazine sitemap routes, selection validation and no browser errors");
} finally {await browser.close();}
