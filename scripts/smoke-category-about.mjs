import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const origin = process.env.LOAD_BASE_URL || 'http://127.0.0.1:3007';
assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
const browser = await chromium.launch({channel:'chrome',headless:true});
await mkdir('.media-cache',{recursive:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
 page.setDefaultTimeout(30000);
 await page.context().addCookies([{name:'vod_locale',value:'fa',url:origin}]);
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).origin===origin || r.request().resourceType()==='image'?r.continue():r.abort());
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:120000});
 const trigger=page.locator('.mega-button');
 await trigger.click();
 const dialog=page.locator('[data-category-dialog]'); await dialog.waitFor();
 assert.ok(await dialog.evaluate(el=>el.matches(':modal')));
 assert.ok(await dialog.locator('input').evaluate(el=>el===document.activeElement));
 const categories=dialog.locator('nav button'); assert.ok(await categories.count()>1);
 await categories.nth(1).click(); assert.equal(await categories.nth(1).getAttribute('aria-pressed'),'true');
 for(const [width,height] of [[1440,1000],[1024,768],[390,844],[320,568]]) {
  await page.setViewportSize({width,height});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const b=await dialog.boundingBox(); await page.screenshot({path:`.media-cache/category-${width}.png`}); assert.ok(b.x>=0 && b.x+b.width<=width+1 && b.y>=0 && b.y+b.height<=height+1, JSON.stringify({width,height,b}));
  assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Dialog has no horizontal overflow');
  await page.screenshot({path:`.media-cache/category-${width}.png`});
 }
 await dialog.locator('input').fill('zzzz-not-a-category'); await dialog.getByRole('status').waitFor();
 await dialog.getByRole('button',{name:'پاک کردن',exact:true}).click(); assert.ok(await categories.count()>1);
 await page.keyboard.press('Escape'); await dialog.waitFor({state:'hidden'});
 assert.ok(await trigger.evaluate(el=>el===document.activeElement));
 await page.setViewportSize({width:1440,height:1000});
 await trigger.click(); await dialog.getByRole('link',{name:'تمام آرشیو',exact:false}).click();
 await page.waitForURL('**/browse');
 for(const id of ['tt0903747','tt0111161']) {
  await page.goto(`${origin}/${id}`,{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('#title-tab-about').click();
  const about=page.locator('[data-title-about]'); await about.waitFor();
  assert.ok((await about.locator('h2').first().innerText()).includes('درباره'));
  assert.ok(await about.locator('.info-card').count()>=4);
  assert.ok(await about.locator('.interactive-media-card').count()<=6);
  if(await about.locator('.media-gallery-more').count()) {
   await about.locator('.media-gallery-more').click(); assert.ok(await about.locator('.interactive-media-card').count()>6);
   await about.locator('.media-gallery-more').click(); assert.ok(await about.locator('.interactive-media-card').count()<=6);
  }
  for(const width of [1440,390,320]) {
   await page.setViewportSize({width,height:1000}); await about.scrollIntoViewIfNeeded();
   assert.ok(await about.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'About fits its container');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page fits viewport');
   await page.screenshot({path:`.media-cache/about-${id}-${width}.png`});
  }
  await page.locator('#title-tab-episodes').click(); assert.equal(await about.count(),0);
  assert.equal(await page.locator('#title-tab-episodes').getAttribute('aria-selected'),'true');
 }
 assert.deepEqual(errors,[]);
 console.log('PASS category dialog: desktop/mobile, filter, selection, Escape/focus, archive navigation; movie/series About and download tabs');
} finally {await browser.close();}
