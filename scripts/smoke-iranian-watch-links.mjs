import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 await page.context().addCookies([{name:'vod_locale',value:'fa',url:'http://127.0.0.1:3004'}]);
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const refs=JSON.parse(await readFile('public/data/old-iranian-video-references.json','utf8')).items.filter(ref=>['old-iranian-1355051','old-iranian-1353027'].includes(ref.id));
 for(const ref of refs) {
  await page.goto(`http://127.0.0.1:3004/${ref.id}`,{waitUntil:'domcontentloaded'});
  const sources=page.getByRole('region',{name:'منابع تماشای فیلم'});
  await sources.waitFor();
  assert.equal(await sources.locator(`a[href="https://www.youtube.com/watch?v=${ref.videoId}"]`).count(),1);
  assert.ok((await sources.innerText()).includes('پخش بررسی نشده'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 const retired=JSON.parse(await readFile('scripts/data/old-iranian-video-reviewed.json','utf8')).items;
 for(const ref of retired) {
  await page.goto(`http://127.0.0.1:3004/${ref.id}`,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator(`a[href="https://www.youtube.com/watch?v=${ref.videoId}"]`).count(),0);
 }
 console.log('PASS new attributed watch links on mobile and removal of six unavailable references; external playback not tested');
} finally {await browser.close();}
