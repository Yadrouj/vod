import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { downloadUrl, parseMeloobitListing, parseMeloobitDetail, matchingIndexSources, mergeMeloobitTracks, parseMeloobitCollections, meloobitPlaylists, persianPublicationDate } from '../meloobit-source.mjs';
import { scrapeMeloobit } from '../scrape-meloobit.mjs';
import { buildMoodPlaylists } from '../build-mood-playlists.mjs';
import { DAILY_JOBS } from '../maintenance-policy.mjs';
import { DEFAULT_SCRAPER_DASHBOARD_CONFIG } from '../scraper-dashboard-config.mjs';
import { sanitizeScraperDashboardConfig } from '../scraper-dashboard-config.mjs';
import { mergeMeloobitIndex } from '../merge-meloobit-source.mjs';
import { backfillProgress } from '../backfill-meloobit.mjs';

const root='http://sv2.mybia2music.com/s2/Music/1405/07/09/Amin%20Rostami/';
const low=root+'Amin%20Rostami%20-%20Azizam%20Dir%20Oomadi%20%5B128%5D.mp3';
const high=root+'Amin%20Rostami%20-%20Azizam%20Dir%20Oomadi.mp3';
const page='https://meloobit.ir/amin-rostami-azizam-dir-oomadi/';
const article=`<article class="ipost"><a href="${page}" title="آهنگ"><img src="https://meloobit.ir/wp-content/uploads/cover.jpg"></a><span class="graytxt2">9 مهر 1405</span><div data-permalink="${page}" data-artist="امین رستمی" data-song="عزیزم دیر اومدی" data-music="${low}"></div><a href="${low}">دانلود 128</a><a href="${high}">دانلود 320</a></article>`;
const track=()=>parseMeloobitListing(article)[0];
test('archive parser ignores repeating promotions and keeps exact artist, song, HTTPS and real qualities',()=>{
  const result=parseMeloobitListing(article.replace('ipost','post bradius')+article);
  assert.equal(result.length,1);const t=result[0];
  assert.equal(t.artist.slug,'amin-rostami');assert.equal(t.artist.name,'امین رستمی');assert.equal(t.title,'Azizam Dir Oomadi');
  assert.equal(t.persianTitle,'عزیزم دیر اومدی');assert.deepEqual(t.sources.map(s=>s.quality),['128','320']);
  assert.ok(t.sources.every(s=>s.url.startsWith('https:') && s.available===false && s.sourcePageUrl===page));
  assert.equal(t.publishedAt,'2026-10-01T00:00:00+03:30');
});
test('Jalali dates are validated rather than treating folder dates as release dates',()=>{
  assert.equal(persianPublicationDate('۱۱ مهر ۱۴۰۵'),'2026-10-03T00:00:00+03:30');
  assert.equal(persianPublicationDate('32 مهر 1405'),null);assert.equal(persianPublicationDate('31 بهمن 1405'),null);
});
test('directory matching excludes other artists, remixes, traversal and unrelated hosts',()=>{
  const html=`<a href="${high}">320</a><a href="Amin%20Rostami%20-%20Azizam%20Dir%20Oomadi%20(Remix).mp3">remix</a><a href="Someone%20Else%20-%20Azizam%20Dir%20Oomadi.mp3">wrong</a><a href="../">parent</a>`;
  assert.equal(matchingIndexSources(html,root,track()).length,1);
  assert.equal(downloadUrl('https://sv2.mybia2music.com.evil.test/s2/Music/a.mp3'),null);
  assert.equal(downloadUrl('http://127.0.0.1/a.mp3'),null);assert.equal(downloadUrl(root+'../../../../admin'),null);
  const injected=article.replace('</article>',`<a href="${root}Other%20Singer%20-%20Other%20Song.mp3">320</a></article>`);
  assert.equal(parseMeloobitListing(injected)[0].sources.length,2);
});
test('detail parsing stays scoped to the requested article, not sidebar tracks or lyrics',()=>{
  const other=article.replaceAll('amin-rostami-azizam-dir-oomadi','other');
  const t=parseMeloobitDetail(article+other,track());assert.equal(t.sources.length,2);
  assert.throws(()=>parseMeloobitDetail(other,track()),/does not match/);
  assert.ok(!t.description.includes('عشقتو خاک'));
});
test('merged releases retain old IDs and artists; audio and video/remix identities remain separate',()=>{
  const t=track();t.sources=t.sources.map(s=>({...s,available:true,checkedAt:'2026-10-03'}));
  const old={...t,id:'roz-existing',sourceUrl:'https://rozmusic.com/old',sources:[],coverUrl:null};
  const merged=mergeMeloobitTracks([old],[t]);assert.equal(merged.length,1);assert.equal(merged[0].id,'roz-existing');assert.equal(merged[0].sources.length,2);
  assert.deepEqual(mergeMeloobitTracks(merged,[t]),merged);
  const failed={...t,sources:t.sources.map(s=>({...s,available:false,checkedAt:'2026-10-04'}))};
  assert.ok(mergeMeloobitTracks(merged,[failed])[0].sources.every(s=>s.available===false));
  assert.equal(mergeMeloobitTracks([], [{...t,sources:t.sources.map(s=>({...s,available:false}))}]).length,0);
  const remix={...t,id:'remix',title:'Azizam Dir Oomadi Remix',persianTitle:'ریمیکس',matchKey:'amin rostami azizam dir oomadi remix',sources:t.sources.map(s=>({...s,url:s.url.replace('.mp3','%20(Remix).mp3')}))};
  assert.equal(mergeMeloobitTracks([old],[remix]).length,2);
  assert.equal(mergeMeloobitTracks([], [t], [old])[0].id,old.id);
});
test('upstream weekly/monthly/yearly lists preserve their membership after cross-provider merges',()=>{
  const collections=parseMeloobitCollections(`<ul id="week"><a href="${page}">track</a></ul><ul id="month"><a href="${page}">track</a></ul><ul id="year"><a href="${page}">track</a></ul><a href="https://meloobit.ir/other/">not part of year</a>`);
  assert.equal(collections.length,3);assert.deepEqual(collections[2].urls,[page]);
  const t={...track(),id:'roz-existing',sourceUrl:'https://rozmusic.com/old'};t.sources=t.sources.map(s=>({...s,available:true}));
  assert.equal(meloobitPlaylists([t],collections).find(p=>p.id==='meloobit-week').trackIds[0],'roz-existing');
  assert.ok(buildMoodPlaylists([t],new Date(),[],collections).playlists.some(p=>p.id==='meloobit-new'));
});
test('Meloobit is independently scheduled inside the existing four-hour window',()=>{
  assert.ok(DAILY_JOBS.some(j=>j.id==='meloobit'));assert.ok(DAILY_JOBS.reduce((n,j)=>n+j.minutes,0)<=240);
  assert.equal(DEFAULT_SCRAPER_DASHBOARD_CONFIG.sources.find(s=>s.id==='meloobit').startHour,3);
  const saved=sanitizeScraperDashboardConfig({schedule:{startHour:4,endHour:6,days:[6]},sources:[{id:'music',enabled:false}]});
  assert.equal(saved.sources.find(s=>s.id==='music').enabled,false);assert.equal(saved.sources.find(s=>s.id==='meloobit').startHour,4);
});
test('publishing Meloobit preserves unrelated tracks and original artist biographies',()=>{
  const old={...track(),id:'roz-existing',sources:[{url:'https://rozmusic.com/audio.mp3',provider:'rozmusic'}]};
  const incoming=track();incoming.sources=incoming.sources.map(s=>({...s,available:true}));
  const index={tracks:[old],artists:[{...old.artist,trackIds:[old.id],bio:'Original biography',profileImageUrl:'https://example.com/artist.jpg'}],scanned:{full:true},categories:[]};
  const merged=mergeMeloobitIndex(index,{tracks:[incoming]});
  assert.equal(merged.tracks[0].id,old.id);assert.ok(merged.tracks[0].sources.some(s=>s.provider==='rozmusic'));
  assert.equal(merged.artists[0].bio,'Original biography');assert.equal(merged.artists[0].profileImageUrl,'https://example.com/artist.jpg');assert.equal(merged.scanned.full,true);
});
test('full backfill finishes only after every page and pending review, including rejected files, is audited',()=>{
  const source={maxPage:2,completedPages:{1:true,2:true},tracks:[{reviewedAt:'today',sources:[{checkedAt:'today',available:true}]},{reviewedAt:'today',sources:[{checkedAt:'today',available:false}]}]};
  assert.equal(backfillProgress(source).state,'completed');assert.equal(backfillProgress(source).verified,1);
  assert.equal(backfillProgress({...source,completedPages:{1:true,3:true}}).state,'running');
  assert.equal(backfillProgress({...source,tracks:[{sources:[{available:false}]}]}).pendingReviews,1);
});
test('resumable crawler verifies audio samples, rejects HTML downloads and never marks them available',async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'sarvnema-meloobit-'));
  const realFetch=globalThis.fetch;const requests=[];
  globalThis.fetch=async(url,options)=>{
    requests.push({url,range:options.headers.Range});
    if(url.endsWith('.mp3'))return url.includes('%5B128%5D') ? new Response(Buffer.from('ID3real-audio'),{status:206,headers:{'Content-Type':'audio/mpeg'}}) : new Response('<html>not audio</html>',{status:200,headers:{'Content-Type':'text/html'}});
    return new Response(url.includes('mybia') ? `<a href="${high}">file</a>` : article,{headers:{'Content-Type':'text/html'}});
  };
  try {
    const options={directory,statusFile:path.join(directory,'status.json'),pages:1,backfillPages:0,detailLimit:0,budgetMs:30000,gapMs:1,maxPage:506};
    const result=await scrapeMeloobit(options);assert.equal(result.state,'completed');assert.equal(result.verifiedTracks,1);
    const data=JSON.parse(await readFile(path.join(directory,'meloobit-source.json'),'utf8'));
    assert.equal(data.tracks[0].sources.filter(s=>s.available).length,1);
    assert.ok(requests.filter(r=>r.url.endsWith('.mp3')).every(r=>r.range==='bytes=0-2047'));
    assert.ok(requests.filter(r=>r.url.endsWith('/')).every(r=>!r.range));
    const again=await scrapeMeloobit(options);assert.equal(again.tracks.new,0);assert.equal(again.links.checked,0);
  } finally {globalThis.fetch=realFetch;await rm(directory,{recursive:true,force:true});}
});
