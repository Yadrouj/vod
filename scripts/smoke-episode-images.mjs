import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await page.context().addCookies([{name:'vod_locale',value:'fa',url:'http://127.0.0.1:3004'}]);
 await page.goto('http://127.0.0.1:3004/tt0903747',{waitUntil:'domcontentloaded'});
 await page.locator('.episode-thumb img').first().waitFor({timeout:30000});
 const images=page.locator('.episode-thumb img');
 assert.ok(await images.count()>=7);
 const urls=await images.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('src')));
 assert.ok(new Set(urls).size>=7,'Use individual episode stills, not the series poster');
 await images.first().scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>{const image=document.querySelector('.episode-thumb img');return image?.complete && image.naturalWidth>0;},{},{timeout:20000});
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000});
  await images.first().scrollIntoViewIfNeeded();
  await page.screenshot({path:`.media-cache/episode-restored-${width}.png`});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 await page.getByRole('button',{name:'فصل 2',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.episode-thumb span')?.textContent==='S02E01');
 assert.notEqual(await images.first().getAttribute('src'),urls[0]);
 console.log('PASS distinct episode stills load, responsive layout and season-specific artwork');
} finally {await browser.close();}
