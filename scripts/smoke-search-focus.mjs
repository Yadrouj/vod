import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
 await page.context().addCookies([{name:'vod_locale',value:'fa',url:'http://127.0.0.1:3004'}]);
 for(const route of ['/','/music']) {
  await page.goto(`http://127.0.0.1:3004${route}`,{waitUntil:'domcontentloaded'});
  await page.locator('.app-nav-search').tap();
  const dialog=page.locator('.app-search-dialog[open]');await dialog.waitFor();
  const input=dialog.locator('input.search');await input.tap();
  const field=await input.evaluate(el=>({outline:getComputedStyle(el).outlineStyle,border:getComputedStyle(el).borderColor,shadow:getComputedStyle(el).boxShadow}));
  assert.equal(field.outline,'none');
  assert.ok(!field.border.includes('235, 207, 118') && !field.shadow.includes('235, 207, 118'));
  await dialog.getByRole('button',{name:'بستن',exact:true}).tap();
  await dialog.waitFor({state:'hidden'});
  const search=page.locator('.app-nav-search');
  assert.notEqual(await search.evaluate(el=>getComputedStyle(el).outlineColor),'rgb(235, 207, 118)');
  await page.keyboard.press('Tab');
  const keyboard=await page.evaluate(()=>({visible:document.activeElement.matches(':focus-visible'),outline:getComputedStyle(document.activeElement).outlineStyle,color:getComputedStyle(document.activeElement).outlineColor}));
  assert.ok(keyboard.visible);assert.equal(keyboard.outline,'solid');assert.equal(keyboard.color,'rgb(213, 218, 214)');
  await page.screenshot({path:`.media-cache/focus-${route==='/music'?'music':'cinema'}.png`});
 }
 console.log('PASS tap search, modal close/refocus, and visible neutral keyboard focus in cinema and music');
} finally {await browser.close();}
