import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const origin = process.env.LOAD_BASE_URL || "http://127.0.0.1:3006";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const collections = JSON.parse(await readFile("public/data/music-mood-playlists.json", "utf8"));
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width:1440, height:1000 } });
  const errors = []; page.on("pageerror", e=>errors.push(e.message));
  // Original silent fixture: test real browser playback without external media traffic.
  const samples = 8000 * 120, wav = Buffer.alloc(44+samples*2);
  wav.write("RIFF",0); wav.writeUInt32LE(wav.length-8,4); wav.write("WAVEfmt ",8);
  wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(8000,24); wav.writeUInt32LE(16000,28); wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34); wav.write("data",36); wav.writeUInt32LE(samples*2,40);
  await page.route("**/api/music/media?**", route=> {
    const range = route.request().headers().range?.match(/bytes=(\d+)-(\d*)/);
    const start = range ? Number(range[1]) : 0, end = range?.[2] ? Math.min(Number(range[2]),wav.length-1) : wav.length-1;
    return route.fulfill({ status: range ? 206 : 200, contentType:"audio/wav", headers:{"Accept-Ranges":"bytes", ...(range ? {"Content-Range":`bytes ${start}-${end}/${wav.length}`} : {})}, body:wav.subarray(start,end+1) });
  });
  await page.goto(`${origin}/music/collections/${collections.playlists[0].id}`,{waitUntil:"domcontentloaded",timeout:90000});
  await page.locator(".artist-track-list button").first().click();
  const audio = page.locator("[data-music-dock] audio");
  await page.waitForFunction(()=>document.querySelector("[data-music-dock] audio")?.currentTime>.2).catch(async error=>{console.log({errors,audio:await audio.evaluate(el=>({paused:el.paused,ready:el.readyState,error:el.error?.message,src:el.currentSrc,duration:el.duration})).catch(()=>null)});throw error;});
  await audio.evaluate(el=>el.dataset.instance="persistent");
  await page.getByRole("button",{name:"نمای تمام‌صفحهٔ موسیقی و متن"}).click();
  await page.waitForFunction(()=>document.querySelector("[data-music-dock]")?.matches(":modal"));
  assert.equal(await audio.getAttribute("data-instance"),"persistent");
  assert.equal(await audio.evaluate(el=>el.paused),false);
  const file = page.getByLabel("افزودن فایل متن آهنگ");
  await file.setInputFiles({name:"original-fixture.lrc",mimeType:"text/plain",buffer:Buffer.from("[00:00.00]First original fixture\n[00:10.00]Second original fixture\n[00:30.00]Third original fixture")});
  await page.locator(".music-lyrics-lines button").filter({hasText:"Second original fixture"}).click();
  await page.waitForFunction(()=>{const el=document.querySelector("[data-music-dock] audio");return el&&el.currentTime>=10&&el.currentTime<14;},{},{timeout:5000}).catch(async error=>{console.log(await audio.evaluate(el=>({time:el.currentTime,duration:el.duration,paused:el.paused,ready:el.readyState,seekable:Array.from({length:el.seekable.length},(_,i)=>[el.seekable.start(i),el.seekable.end(i)])})));throw error;});
  assert.equal(await page.locator(".music-lyrics-lines [aria-current=true]").innerText(),"Second original fixture");
  assert.ok((await page.locator(".music-lyrics-lines").boundingBox()).height>=200,"lyrics must have a visible reading area");
  await page.screenshot({path:".media-cache/immersive-music-desktop.png"});
  for(const width of [390,320]) {
    await page.setViewportSize({width,height:850});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`page overflow ${width}`);
    const box = await page.locator("[data-music-dock]").boundingBox();
    assert.ok(box.x>=-1&&box.x+box.width<=width+1,`dialog overflow ${width}`);
    assert.ok(await page.locator("[data-music-dock]").evaluate(el=>el.scrollWidth<=el.clientWidth+1),`dialog content overflow ${width}`);
    await page.screenshot({path:`.media-cache/immersive-music-${width}.png`});
  }
  await file.setInputFiles({name:"plain.txt",mimeType:"text/plain",buffer:Buffer.from("Original plain line\nSecond untimed line")});
  await page.getByText("این متن زمان‌بندی ندارد.",{exact:false}).waitFor();
  assert.equal(await page.locator(".music-lyrics-lines [aria-current=true]").count(),0);
  await page.keyboard.press("Escape");
  await page.waitForFunction(()=>!document.querySelector("[data-music-dock]")?.matches(":modal"));
  assert.equal(await audio.evaluate(el=>el.paused),false);
  const mini = await page.locator("[data-music-dock]").boundingBox();
  const nav = await page.locator(".app-mobile-nav").boundingBox();
  assert.ok(mini.y + mini.height <= nav.y - 5, "Mini player must clear the floating navigation and raised room action");
  await page.locator('a[href="/music/collections"]').first().click();
  await page.waitForURL("**/music/collections");
  assert.equal(await audio.getAttribute("data-instance"),"persistent");
  await page.getByRole("button",{name:"بستن و قطع موسیقی"}).click();
  assert.equal(await audio.count(),0);
  const invalid = await page.request.get(`${origin}/api/music/lyrics?id=..%2Fsecret`);
  assert.equal(invalid.status(),400);
  const missing = await page.request.get(`${origin}/api/music/lyrics?id=original-test-missing`);
  assert.equal(missing.status(),200); assert.equal((await missing.json()).found,false);
  // New source profiles must expose watch actions, not a fake download file.
  const refs = JSON.parse(await readFile("public/data/old-iranian-video-references.json","utf8"));
  await page.goto(`${origin}/${refs.items[0].id}`,{waitUntil:"domcontentloaded"});
  assert.ok(await page.locator(`a[href="/watch/${refs.items[0].id}"]`).count()>0);
  await page.goto(`${origin}/watch/${refs.items[0].id}`,{waitUntil:"domcontentloaded"});
  assert.ok(await page.locator(".youtube-player-poster").count());
  await page.goto(`${origin}/watch/nfb-hypersensitive`,{waitUntil:"domcontentloaded"});
  await page.getByRole("button",{name:"باز کردن پلیر رسمی NFB"}).waitFor();
  await page.route("https://www.nfb.ca/**",route=>route.fulfill({contentType:"text/html",body:"<p>Publisher player fixture</p>"}));
  await page.getByRole("button",{name:"باز کردن پلیر رسمی NFB"}).click();
  assert.equal(await page.locator(".youtube-player-stage iframe").getAttribute("src"),"https://www.nfb.ca/film/hypersensitive/embed/player/");
  assert.deepEqual(errors,[]);
  console.log("PASS immersive modal, persistent audio, lyric seek/plain timing, 320/390 mobile, safe API, archive watch links and publisher embed");
} finally { await browser.close(); }
