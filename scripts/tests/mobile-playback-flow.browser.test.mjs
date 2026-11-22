import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const origin = process.env.APPS_TEST_ORIGIN;
test("mobile entry, compact dock and independent music search", {skip: !origin || !process.env.PLAYWRIGHT_MODULE, timeout:150000}, async () => {
  assert.ok(["localhost","127.0.0.1"].includes(new URL(origin).hostname));
  const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
  const browser=await chromium.launch({channel:"chrome"});
  try {
    const page=await browser.newPage({hasTouch:true,isMobile:true,viewport:{width:390,height:844},serviceWorkers:"block"});
    await page.route("**/*",r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    await page.goto(origin,{waitUntil:"commit"});
    const entry=page.locator('nav[aria-label="انتخاب مسیر"],nav[aria-label="Start exploring"]');
    await entry.locator('a[href="/music"]').waitFor();
    const dock=page.locator(".app-mobile-nav");
    await page.waitForFunction(()=>{const nav=document.querySelector(".app-mobile-nav");return nav && getComputedStyle(nav).display==="grid" && nav.offsetHeight>0 && nav.offsetHeight<=64;});
    assert.ok((await dock.boundingBox()).height<=64);
    const targets=await dock.locator(":scope > :is(a,button)").evaluateAll(buttons=>buttons.map(b=>b.getBoundingClientRect().height));
    assert.equal(targets.length,5); assert.ok(targets.every(height=>height>=44));
    await page.goto(origin+"/music?q=house",{waitUntil:"commit"});
    await page.locator('form[role="search"] input.search').first().waitFor();
    await page.locator(".music-search-results-head").waitFor({timeout:90000});
    assert.equal(await page.locator('details:has(summary:text("تغییر دسته‌بندی"))').getAttribute("open"),null);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
  } finally {await browser.close();}
});

test("touch playback: edge gestures, lock and recovery; album FX without duplicate play-all", {skip: !origin || !process.env.PLAYWRIGHT_MODULE, timeout:180000}, async () => {
  assert.ok(["localhost","127.0.0.1"].includes(new URL(origin).hostname));
  const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
  const browser=await chromium.launch({channel:"chrome"});
  try {
    const ctx=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844},serviceWorkers:"block"});
    const fixture=Buffer.alloc(44+8000*2*60);
    fixture.write("RIFF"); fixture.writeUInt32LE(fixture.length-8,4); fixture.write("WAVEfmt ",8); fixture.writeUInt32LE(16,16);
    fixture.writeUInt16LE(1,20); fixture.writeUInt16LE(1,22); fixture.writeUInt32LE(8000,24); fixture.writeUInt32LE(16000,28);
    fixture.writeUInt16LE(2,32); fixture.writeUInt16LE(16,34); fixture.write("data",36); fixture.writeUInt32LE(fixture.length-44,40);
    await ctx.route("**/*",r=>r.request().resourceType()==="media"?r.fulfill({contentType:"audio/wav",body:fixture}):new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const page=await ctx.newPage();
    await page.goto(origin+"/watch/tt0903747?season=1&episode=1",{waitUntil:"domcontentloaded",timeout:90000});
    await page.waitForFunction(()=>document.querySelector("video.player")?.readyState>=2);
    await page.locator("[data-player-center]:visible").tap();
    await page.waitForFunction(()=>document.querySelector("video")?.currentTime>0);
    const client=await ctx.newCDPSession(page);
    async function down(side){
      const box=await page.locator('[data-gesture="'+side+'"]:visible').boundingBox();
      const x=box.x+box.width/2,y=box.y+box.height*.4;
      for(const [type,dy] of [["touchStart",0],["touchMove",15],["touchMove",48],["touchEnd",48]]){
        await client.send("Input.dispatchTouchEvent",{type,touchPoints:type==="touchEnd"?[]:[{x,y:y+dy}]});
      }
    }
    await down("light");
    await page.getByRole("status").filter({hasText:/روشنایی|Brightness/}).waitFor();
    const volume=await page.locator("video").first().evaluate(v=>v.volume);
    await down("volume");
    assert.ok(await page.locator("video").first().evaluate(v=>v.volume)<volume);
    const lock=page.getByRole("button",{name:/^قفل کنترل‌ها$|^Lock controls$/});
    if(!await lock.isVisible()) await page.locator("[data-player-surface]").tap({position:{x:72,y:80}});
    await lock.tap();
    const unlock=page.getByRole("button",{name:/باز کردن قفل|Unlock controls/});
    await unlock.waitFor({state:"visible"});
    await page.locator("[data-player-center]:visible").waitFor({state:"hidden"});
    assert.equal(await page.locator("[data-player-controls]").evaluate(el=>el.inert),true);
    await unlock.tap();
    await page.locator("[data-player-center]:visible").waitFor();
    await page.goto(origin+"/music/artists/mohsen-yeganeh",{waitUntil:"domcontentloaded"});
    assert.equal(await page.getByRole("button",{name:"پخش آلبوم",exact:true}).count(),0);
    await page.locator("#artist-tracks ol button").first().tap();
    const player=page.locator("#persistent-music-player");
    await page.waitForFunction(()=>document.querySelector("#persistent-music-player audio")?.currentTime>0);
    await player.locator("summary").filter({hasText:"FX"}).tap();
    await player.getByRole("button",{name:"آهسته و بم"}).tap();
    await page.waitForFunction(()=>document.querySelector("#persistent-music-player audio")?.playbackRate===.88);
    await player.getByRole("button",{name:"طبیعی"}).tap();
    await page.waitForFunction(()=>document.querySelector("#persistent-music-player audio")?.playbackRate===1);
  }finally{await browser.close();}
});
