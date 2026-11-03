import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const origin=process.env.LOAD_BASE_URL || 'http://127.0.0.1:3005';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname),'Local verification only');
const data=JSON.parse(await readFile('public/data/creator-profiles.json','utf8'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const missing=data.singers.find(profile=>profile.archiveTrackCount===0 && profile.recordings.length>0);
assert.ok(missing);
await mkdir('.media-cache/creator-smoke',{recursive:true});
try{
 const errors=[];
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:960},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce',serviceWorkers:'block'});
  await context.addCookies([{name:'vod_locale',value:'fa',url:origin}]);
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  for(const path of ['/people/directors','/music/artists/top-100','/person/nm0634240',`/music/artists/${missing.slug}`,'/music/artists/aretha-franklin']){
   const response=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:180000});assert.equal(response.status(),200,path);
   await page.waitForFunction(()=>document.querySelectorAll('h1').length===1 && document.querySelector('h1').getClientRects().length,undefined,{timeout:60000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${path} overflow at ${width}`);
   if(path.endsWith('/directors')||path.endsWith('/top-100')) assert.equal(await page.locator('[data-creator-card]').count(),100);
   if(path==='/person/nm0634240'){
    assert.ok(await page.locator('#directed a[href="/tt1375666"]').count());
    assert.equal(await page.locator('#directed a[href="/tt30036660"]').count(),0);
    assert.ok(await page.locator('[data-creator-bio] details').count());
    await page.locator('[data-creator-bio] details').first().locator('summary').click();
    assert.ok(await page.locator('[data-creator-bio] [lang="en"]').last().isVisible());
   }
   if(path===`/music/artists/${missing.slug}`){
    assert.equal(await page.locator('.artist-playlist-workspace').count(),0);
    assert.ok(await page.locator('[data-recording-availability="missing"]').count());
    assert.equal(await page.locator('[data-recording-availability="missing"] a[href^="/music/"]').count(),0);
    assert.equal(await page.locator('[data-recording-availability="missing"] button').count(),0);
   }
   if(width===390) {
    const firstImage=page.locator('main .creator-portrait img').first();
    if(await firstImage.count()) await firstImage.evaluate(image=>image.decode()).catch(()=>{});
    await page.screenshot({path:`.media-cache/creator-smoke/${path.replaceAll('/','_')}.png`,caret:'initial'});
   }
  }
  await context.close();
 }
 const context=await browser.newContext();const page=await context.newPage();
 await page.goto(origin+'/people/directors?q=Nolan',{waitUntil:'domcontentloaded',timeout:120000});await page.locator('[data-creator-card]').first().waitFor();assert.equal(await page.locator('[data-creator-card]').count(),1);
 await page.goto(origin+'/music/artists?q=Beyonce',{waitUntil:'domcontentloaded',timeout:120000});await page.locator('.music-artist-card').first().waitFor();assert.equal(await page.locator('.music-artist-card').count(),1);
 await page.goto(origin+'/music/artists/top-100?available=1',{waitUntil:'domcontentloaded',timeout:120000});await page.locator('[data-creator-card]').first().waitFor();assert.equal(await page.locator('[data-creator-card]').count(),data.singers.filter(p=>p.archiveTrackCount>0).length);
 await context.close();
 let next=0;const paths=[...data.directors.map(p=>`/person/${p.id}`),...data.singers.map(p=>`/music/artists/${p.slug}`)];
 await Promise.all(Array.from({length:2},async()=>{while(next<paths.length){const path=paths[next++];const response=await fetch(origin+path,{signal:AbortSignal.timeout(120000)});assert.equal(response.status,200,path);const html=await response.text();assert.ok(html.includes('ProfilePage'),path);assert.ok(!html.includes('NEXT_HTTP_ERROR_FALLBACK;404'),path);}}));
 assert.deepEqual(errors,[]);
 console.log('PASS: all 200 profile routes; both 100-person hubs; 320/390/768/1440px; directing vs related work; missing-music controls; biography disclosure; Persian/English artist search.');
}finally{await browser.close();}
