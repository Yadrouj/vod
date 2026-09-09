import {mkdir,writeFile,rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {parseEpisodeMetadata} from '../lib/episode-metadata.ts';
const ids=process.argv.slice(2).filter(arg=>/^tt\d+$/.test(arg));
if (!ids.length) throw new Error('Supply IMDb series IDs');
let browser;
if(process.argv.includes('--browser')) {
 const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
 browser=await chromium.launch({channel:'chrome',headless:true});
}
async function json(url) {
 if(!browser) {const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json();}
 const page=await browser.newPage();
 try {const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});if(!response.ok())throw new Error(`HTTP ${response.status()}`);return JSON.parse(await page.locator('body').innerText());} finally {await page.close();}
}
try {
 await mkdir('public/data/episode-metadata',{recursive:true});
 for(const id of ids) {
  try {
   const show=await json(`https://api.tvmaze.com/lookup/shows?imdb=${id}`);
   if(!Number.isInteger(show.id))throw new Error('Invalid show');
   const episodes=parseEpisodeMetadata(await json(`https://api.tvmaze.com/shows/${show.id}/episodes`));
   if(!episodes.length)throw new Error('Empty response; previous data retained');
   const file=`public/data/episode-metadata/${id}.json`;
   await writeFile(`${file}.tmp`,JSON.stringify({checkedAt:new Date().toISOString(),sourceUrl:`https://www.tvmaze.com/shows/${show.id}`,episodes}));await rename(`${file}.tmp`,file);
   console.log(JSON.stringify({id,episodes:episodes.length,images:episodes.filter(e=>e.imageUrl).length}));
  }catch(error){console.error(id,error.message);process.exitCode=1;}
 }
} finally {await browser?.close();}
