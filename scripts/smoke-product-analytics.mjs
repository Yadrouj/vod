import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const origin=process.env.LOAD_BASE_URL||'http://127.0.0.1:3018';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Local synthetic QA only');
const token=process.env.ANALYTICS_TEST_TOKEN||'local-analytics-smoke-token-not-production-2026';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||path.resolve('.media-cache/browser-tools/node_modules/playwright/index.mjs')).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
const folder='.media-cache/product-analytics-qa';await mkdir(folder,{recursive:true});
const ua='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const context=await browser.newContext({viewport:{width:1440,height:1050},serviceWorkers:'block',userAgent:ua});
await context.addCookies([{name:'vod_locale',value:'fa',url:origin}]);
const reports=[];
const screenshot=async(page,file)=>{
 await page.evaluate(()=>{const badge=document.createElement('div');badge.id='synthetic-qa-label';badge.textContent='LOCAL QA · SYNTHETIC TEST EVENTS';badge.style.cssText='position:fixed;bottom:8px;left:50%;transform:translateX(-50%);max-width:95vw;z-index:99999;pointer-events:none;background:#09131eee;color:#a5f3d2;border:1px solid #a5f3d266;border-radius:6px;padding:6px 10px;font:10px/1.5 system-ui;white-space:nowrap';document.body.append(badge);});
 try{await page.screenshot({path:`${folder}/${file}`,fullPage:true});}finally{await page.evaluate(()=>document.getElementById('synthetic-qa-label')?.remove());}
};
try {
 for(const url of ['/api/admin/analytics','/api/admin/scrapers','/api/admin/base-url','/api/admin/f2my','/api/admin/release-monitor'])assert.equal((await context.request.get(origin+url)).status(),401,url);
 assert.equal((await context.request.post(origin+'/api/admin/archive-sync',{data:{},headers:{Origin:origin}})).status(),401);
 const page=await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/admin',{waitUntil:'domcontentloaded'});
 await page.getByLabel('کلید دسترسی مدیریت').fill(token);await page.getByRole('button',{name:'ورود امن',exact:true}).click();
 await page.getByRole('heading',{name:'نبض محصول، در یک نگاه'}).waitFor();
 await page.getByText('مرورگرهای یکتا',{exact:true}).waitFor();
 assert.ok(!(await page.evaluate(()=>JSON.stringify(localStorage))).includes(token),'No access key in localStorage');
 assert.ok(!await page.evaluate(()=>document.cookie.includes('sarvnema_admin')),'Session is HttpOnly');
 const adminCookie=(await context.cookies()).find(c=>c.name==='sarvnema_admin');assert.equal(adminCookie.sameSite,'Strict');assert.ok(adminCookie.httpOnly);
 assert.equal((await context.request.post(origin+'/api/admin/base-url',{data:{},headers:{Origin:'https://evil.example'}})).status(),401);
 const before=await (await context.request.get(origin+'/api/admin/analytics')).json();
 const packet={consent:true,visitor:crypto.randomUUID(),session:crypto.randomUUID(),batch:crypto.randomUUID(),source:'telegram',device:'mobile',events:[{type:'page_view',path:'/watch/tt33764258'}]};
 const post=body=>context.request.post(origin+'/api/analytics',{data:body,headers:{Origin:origin}});
 assert.equal((await post(packet)).status(),202);assert.equal((await post(packet)).status(),202);
 const after=await (await context.request.get(origin+'/api/admin/analytics')).json();assert.equal(after.summary.views,before.summary.views+1,'Duplicate batch is ignored');
 assert.equal((await post({...packet,batch:crypto.randomUUID(),consent:false})).status(),400);
 assert.equal((await context.request.post(origin+'/api/analytics',{data:packet,headers:{Origin:'https://evil.example'}})).status(),403);
 const csv=await context.request.get(origin+'/api/admin/analytics?format=csv');assert.equal(csv.status(),200);assert.match(csv.headers()['cache-control'],/no-store/);assert.match(await csv.text(),/observed_browsers/);
 const publicPage=await context.newPage();let posts=0;publicPage.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/analytics')posts++;});
 await publicPage.goto(origin+'/apps',{waitUntil:'domcontentloaded'});
 await publicPage.getByRole('button',{name:'موافقم',exact:true}).waitFor();assert.equal(posts,0,'No telemetry before consent');
 await publicPage.evaluate(()=>sessionStorage.setItem('sarvnema-product-session-v1',JSON.stringify({id:'stale-session-prior-visitor',at:Date.now(),visitor:'prior-opted-out-browser'})));
 await publicPage.getByRole('button',{name:'موافقم',exact:true}).click();
 await publicPage.waitForResponse(r=>new URL(r.url()).pathname==='/api/analytics'&&r.request().method()==='POST');
 assert.notEqual(await publicPage.evaluate(()=>JSON.parse(sessionStorage.getItem('sarvnema-product-session-v1')).id),'stale-session-prior-visitor','Consent/identity changes rotate stale tab sessions');
 await publicPage.evaluate(()=>{
  const count=8000,samples=new Uint8Array(44+count*2),view=new DataView(samples.buffer);
  const word=(i,s)=>[...s].forEach((c,n)=>view.setUint8(i+n,c.charCodeAt(0)));
  word(0,'RIFF');view.setUint32(4,36+count*2,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,count*2,true);
  const audio=document.createElement('audio');audio.loop=true;audio.src=URL.createObjectURL(new Blob([samples],{type:'audio/wav'}));audio.dataset.analyticsMedia='audio';audio.dataset.analyticsId='music:analytics-smoke';audio.id='analytics-test-audio';document.body.append(audio);
  const button=document.createElement('button');button.textContent='Play QA audio';button.id='analytics-test-play';button.style.cssText='position:fixed;top:10px;left:10px;z-index:99999';button.onclick=()=>void audio.play();document.body.append(button);
 });
 await publicPage.locator('#analytics-test-play').click();await publicPage.waitForTimeout(2200);await publicPage.evaluate(()=>document.getElementById('analytics-test-audio').pause());
 await publicPage.waitForTimeout(500);
 const playback=await (await context.request.get(origin+'/api/admin/analytics')).json();assert.ok(playback.summary.listen>=1,'Native playback seconds recorded');
 const beforeHandoff=playback.summary.handoffs;await publicPage.evaluate(()=>window.dispatchEvent(new Event('sarvnema:download-handoff')));await publicPage.waitForTimeout(400);
 assert.equal((await(await context.request.get(origin+'/api/admin/analytics')).json()).summary.handoffs,beforeHandoff+1);
 await publicPage.getByRole('button',{name:'توقف آمار ناشناس محصول',exact:true}).click();const stoppedAt=posts;
 await publicPage.evaluate(()=>window.dispatchEvent(new Event('sarvnema:download-handoff')));await publicPage.waitForTimeout(300);assert.equal(posts,stoppedAt,'Opt-out stops new events');
 await publicPage.close();
 await page.getByRole('button',{name:'تازه‌سازی آمار',exact:true}).click();
 for(const width of [1440,390,320]) {
  await page.setViewportSize({width,height:1000});
  for(const [name,heading] of [['نمای کلی','نبض محصول، در یک نگاه'],['محتوا و پخش','مخاطب چه چیزی پخش می‌کند؟'],['بازگشت مخاطب','چه کسانی برمی‌گردند؟'],['کیفیت و عملیات','کیفیت تجربه، سلامت سرویس']]) {
   if(width<=760)await page.getByRole('button',{name:'باز کردن منو',exact:true}).click();
   await page.getByRole('button',{name,exact:true}).click();await page.getByRole('heading',{name:heading,exact:true}).waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}/${name}: no page overflow`);
   if(name==='نمای کلی')await screenshot(page,`overview-${width}.png`);
  }
  const days=width===390?7:30;const rangeResponse=page.waitForResponse(r=>r.url().includes(`/api/admin/analytics?days=${days}`));await page.getByRole('button',{name:days===7?'۷ روز':'۳۰ روز',exact:true}).click();await rangeResponse;
  await screenshot(page,`reliability-${width}.png`);reports.push({width,views:4,privateAccess:true,responsive:true});
 }
 const blocked=await browser.newContext({serviceWorkers:'block',userAgent:ua});
 await blocked.addInitScript(()=>Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true}));let blockedPosts=0;
 const privatePage=await blocked.newPage();privatePage.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/api/analytics'))blockedPosts++;});await privatePage.goto(origin+'/apps',{waitUntil:'domcontentloaded'});await privatePage.waitForTimeout(600);assert.equal(blockedPosts,0);assert.equal(await privatePage.getByRole('button',{name:'موافقم',exact:true}).count(),0);await blocked.close();
 assert.deepEqual(errors,[],'No dashboard JS errors');
 await page.getByRole('button',{name:'باز کردن منو',exact:true}).click();await page.getByRole('button',{name:'خروج امن',exact:true}).click();await page.getByLabel('کلید دسترسی مدیریت').waitFor();assert.equal((await context.request.get(origin+'/api/admin/analytics')).status(),401);
 await writeFile(`${folder}/report.json`,JSON.stringify({syntheticLocalData:true,origin,reports,consent:true,playbackTime:true,csv:true,csrf:true,deduplication:true},null,2));
 console.log(JSON.stringify(reports));
}catch(error){const page=context.pages()[0];if(page)await page.screenshot({path:`${folder}/failure.png`,fullPage:true});throw error;}finally{await context.close();await browser.close();}
