import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 await page.context().addCookies([{name:'vod_locale',value:'fa',url:'http://127.0.0.1:3004'}]);
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const refs=JSON.parse(await readFile('scripts/data/old-iranian-video-reviewed.json','utf8')).items;
 for(const ref of refs) {
  await page.goto(`http://127.0.0.1:3004/${ref.id}`,{waitUntil:'domcontentloaded'});
  const sources=page.getByRole('region',{name:'منابع تماشای فیلم'});
  await sources.waitFor();
  assert.equal(await sources.getByRole('link',{name:'باز کردن در یوتیوب ↗'}).getAttribute('href'),`https://www.youtube.com/watch?v=${ref.videoId}`);
  assert.ok((await sources.innerText()).includes('پخش بررسی نشده'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 console.log('PASS all six title pages expose attributed YouTube watch links and unverified status on mobile; external playback not tested');
} finally {await browser.close();}
