import test from 'node:test';
import assert from 'node:assert/strict';
import {composePost, discoverPosts, musicFingerprint, postHashtags, selectScheduledEntries, resolveChannelDetail, runChannel} from '../telegram-channel.mjs';
import {publishingSlot, publishingWindow, tehranClock, hasPublishedSlot} from '../lib/telegram-publishing-schedule.mjs';
import {mkdtemp, writeFile, readFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const track={id:'song',title:'آهنگ',publishedAt:'2026-09-25',sources:[{url:'https://media.example/song.mp3',quality:'320kbps',kind:'stream'}]};
test('music direct stream files are offered through the five-second website gate',()=>{
 const post=composePost({type:'music',musicId:'song',title:track.title,sources:track.sources},null,'https://sarvnema.ir');
 const link=new URL(post.reply_markup.inline_keyboard[0][0].url);
 assert.equal(link.origin,'https://sarvnema.ir');assert.equal(link.pathname,'/download/continue');
 assert.equal(Buffer.from(link.searchParams.get('u'),'base64url').toString(),track.sources[0].url);
 assert.match(post.caption,/۵ ثانیه/);assert.match(post.caption,/@sarvnema/);
});
test('episode updates use only the requested episode and keep dub/sub distinctions',()=>{
 const file=group=>({quality:'720p',group,url:'https://sarvnema.ir/download/continue?u=abc'});
 const post=composePost({type:'vod',kind:'episode',imdbCode:'tt1',season:2,episode:3,title:'Title'},
 {item:{title:'A < B'},episodes:[{episode:2,files:[{quality:'wrong',url:'https://bad.example/file.mkv'}]},{episode:3,files:[file('Dubbed'),file('SoftSub')]}]},'https://sarvnema.ir');
 assert.equal(post.reply_markup.inline_keyboard[0].length,2);assert.match(post.caption,/A &lt; B/);
 assert.match(post.caption,/فصل 2 · قسمت 3/);assert.doesNotMatch(JSON.stringify(post),/bad.example|wrong/);
});
test('the first run excludes historical music and subsequent changes are fingerprinted',()=>{
 const now=Date.parse('2026-09-26');const old={...track,id:'old',publishedAt:'2000-01-01'};
 const first=discoverPosts({items:[]},{tracks:[track,old]},null,now);
 assert.equal(first.events.length,1);
 assert.equal(discoverPosts({items:[]},{tracks:[track,old]},first,now).events.length,0);
 const updated={...track,sources:[...track.sources,{url:'https://media.example/song.flac',quality:'FLAC'}]};
 assert.notEqual(musicFingerprint(updated),musicFingerprint(track));
 assert.equal(discoverPosts({items:[]},{tracks:[updated,old]},first,now).events.length,1);
});

test('later publisher cycles do not enqueue old or future archive events',()=>{
 const now=Date.parse('2026-09-26T12:00:00Z');
 const event={status:'available',imdbCode:'tt1',linksCount:1};
 const updates={items:[
  {...event,id:'old',eventAt:'2026-09-17T12:00:00Z'},
  {...event,id:'recent',eventAt:'2026-09-26T10:00:00Z'},
  {...event,id:'future',eventAt:'2026-10-01T12:00:00Z'},
  {...event,id:'invalid',eventAt:'unknown'},
 ]};
 const first=discoverPosts(updates,{tracks:[]},null,now);
 assert.deepEqual(first.events.map(e=>e.id),['recent']);
 const second=discoverPosts(updates,{tracks:[]},first,now+300000);
 assert.deepEqual(second.events.map(e=>e.id),['recent']);
 assert.equal(second.initializedAt,first.initializedAt);
});

test('caption hashtags use readable categories and distinct Persian and original titles',()=>{
 const tags=postHashtags({type:'vod',kind:'episode',baseTitle:'Breaking Bad'},
  {persianTitle:'بریکینگ بد',originalTitle:'Breaking Bad'});
 assert.equal(tags,'#سرونما #سریال #بریکینگ_بد #Breaking_Bad');
 const hostile=postHashtags({type:'music',title:'Song <b> & https://example.test'});
 assert.doesNotMatch(hostile,/[<>:/.&]/);
});

test('channel cadence is evaluated in Tehran time and stops after the 22:00 slot',()=>{
 const before=Date.parse('2026-09-27T06:29:00Z');
 const ten=Date.parse('2026-09-27T06:30:00Z');
 const half=Date.parse('2026-09-27T07:00:00Z');
 const last=Date.parse('2026-09-27T18:59:00Z');
 const after=Date.parse('2026-09-27T19:00:00Z');
 assert.equal(tehranClock(ten).isoLocal,'2026-09-27T10:00');
 assert.equal(publishingSlot('vod',before),null);
 assert.equal(publishingSlot('vod',ten),'2026-09-27:10');
 assert.equal(publishingSlot('music',ten),null);
 assert.equal(publishingSlot('music',half),null);
 assert.equal(publishingSlot('vod',half),'2026-09-27:10');
 assert.equal(publishingSlot('music',Date.parse('2026-09-27T07:30:00Z')),'2026-09-27:11');
 assert.equal(publishingSlot('vod',Date.parse('2026-09-27T07:30:00Z')),null);
 assert.equal(publishingSlot('music',Date.parse('2026-09-27T18:30:00Z')),null);
 assert.equal(publishingSlot('vod',last),'2026-09-27:22');
 assert.equal(publishingWindow(after).vod,null);
 assert.equal(publishingWindow(after).music,null);
});

test('exactly one channel message is selected per alternating hourly slot',()=>{
 const now=Date.parse('2026-09-27T07:30:00Z');
 const state={publishedSlots:{vod:{},music:{}}};
 const pending=[
  {event:{key:'vod:rank-two',type:'vod',imdbCode:'tt2',eventAt:'2026-09-27T06:29:00Z'}},
  {event:{key:'vod:rank-one',type:'vod',imdbCode:'tt1',eventAt:'2026-09-27T06:20:00Z'}},
  {event:{key:'music:new',type:'music',eventAt:'2026-09-27T06:29:00Z'}},
 ];
 const result=selectScheduledEntries(state,pending,now,new Map([['tt1',1],['tt2',2]]));
 assert.deepEqual(result.selected.map(item=>[item.type,item.entry.event.key]),[['music','music:new']]);
 const hour=selectScheduledEntries(state,pending,Date.parse('2026-09-27T06:30:00Z'),new Map([['tt1',1],['tt2',2]]));
 assert.deepEqual(hour.selected.map(item=>[item.type,item.entry.event.key]),[['vod','vod:rank-one']]);
 assert.equal(selectScheduledEntries({...state,publishedSlots:{vod:{'2026-09-27:10':{}} ,music:{}}},pending,now,new Map()).selected.length,1);
});

test('every hour alternates, including late checks, and configuration anchors the first film hour',()=>{
 for(let hour=10;hour<=22;hour++){
  const config={timeZone:'Asia/Tehran',startHour:10,endHour:22};
  const at=new Date(`2026-10-03T${hour}:05:00+03:30`);
  const w=publishingWindow(at,config);
  assert.equal(Boolean(w.vod),hour%2===0);assert.equal(Boolean(w.music),hour%2===1);
 }
 const w=publishingWindow(new Date('2026-10-03T11:55:00+03:30'),{timeZone:'Asia/Tehran',startHour:11,endHour:22});
 assert.equal(w.vod,'2026-10-03:11');assert.equal(w.music,null);
});

test('old half-hour slots survive migration and deliveries are at least sixty minutes apart',()=>{
 assert.equal(hasPublishedSlot({publishedSlots:{music:{'2026-10-03:10:30':{}}}},'vod','2026-10-03:10'),true);
 const sentAt='2026-10-03T10:45:00+03:30';
 const pending=[{event:{type:'music',key:'next'}}];
 const state={posts:{old:{status:'sent',sentAt}},publishedSlots:{music:{'2026-10-03:10:30':{sentAt}}}};
 assert.equal(selectScheduledEntries(state,pending,Date.parse('2026-10-03T11:00:00+03:30')).selected.length,0);
 assert.equal(selectScheduledEntries(state,pending,Date.parse('2026-10-03T11:45:00+03:30')).selected.length,1);
 assert.equal(selectScheduledEntries({...state,posts:{old:{status:'uncertain',sentAt}},publishedSlots:{}},pending,Date.parse('2026-10-03T11:00:00+03:30')).selected.length,0);
});

test('both deployment stacks reserve enough heap and container headroom for the full archive',async()=>{
 for(const file of ['docker-compose.prod.yml','docker-compose.production.yml']){
  const text=await readFile(file,'utf8');const section=text.split(/\r?\n  telegram-channel:\r?\n/)[1]?.split(/\r?\n(?:  [\w-]+:|\w+:)/)[0];
  assert.ok(section);assert.match(section,/NODE_OPTIONS: --max-old-space-size=1024/);
  assert.match(section,/mem_limit: 1536m/);assert.match(section,/vod_telegram_channel:/);
 }
});

test('series-level updates resolve the latest season and episode without mixing their files',async()=>{
 const loads=[];const file={quality:'1080p',group:'Dubbed',url:'https://sarvnema.ir/download/continue?u=abc'};
 const resolved=await resolveChannelDetail({type:'vod',kind:'series',imdbCode:'tt1',title:'Series'},async(id,season)=>{
  loads.push([id,season]);return {item:{type:'series',title:'Series'},seasons:[{season:1},{season:2}],selectedSeason:season??1,
   episodes:season===2?[{season:2,episode:3,files:[file]},{season:2,episode:4,files:[file]}]:[{season:1,episode:9,files:[file]}]};
 });
 assert.deepEqual(loads,[['tt1',undefined],['tt1',2]]);assert.equal(resolved.event.season,2);assert.equal(resolved.event.episode,4);
 const post=composePost(resolved.event,resolved.detail,'https://sarvnema.ir');assert.match(post.caption,/فصل 2 · قسمت 4/);
 const explicit=await resolveChannelDetail({kind:'episode',imdbCode:'tt1',season:1,episode:2},async()=>({selectedSeason:1,episodes:[{season:1,episode:2,files:[file]},{season:1,episode:3,files:[file]}]}));
 assert.equal(explicit.event.episode,2);
 await assert.rejects(resolveChannelDetail({kind:'episode',imdbCode:'tt1',season:1,episode:8},async()=>({episodes:[{season:1,episode:2,files:[file]}]})),/No downloadable episode/);
});

test('a broken leading series cannot starve a valid film; sending spends one slot across restarts',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sarvnema-channel-test-'));
 const originalEnv={...process.env},originalFetch=globalThis.fetch;
 t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-10-03T10:05:00+03:30')});
 const calls=[];
 try{
  Object.assign(process.env,{VOD_DATA_DIR:dir,TELEGRAM_CHANNEL_STATE_DIR:dir,BOT_API_TOKEN:'test-only',BOT_SITE_URL:'https://catalog.test',NEXT_PUBLIC_SITE_URL:'https://sarvnema.ir',TELEGRAM_CHANNEL_ID:'@test',TELEGRAM_CHANNEL_START_HOUR:'10',TELEGRAM_CHANNEL_END_HOUR:'22',TELEGRAM_CHANNEL_TIME_ZONE:'Asia/Tehran'});
  await writeFile(path.join(dir,'vod-updates.json'),JSON.stringify({items:[
   {id:'bad',status:'available',linksCount:1,imdbCode:'ttbroken',kind:'series',title:'Broken series',imdbRating:10,eventAt:new Date().toISOString()},
   {id:'good',status:'available',linksCount:1,imdbCode:'ttfilm',kind:'movie',title:'Film',imdbRating:9.9,eventAt:new Date().toISOString()}
  ]}));
  globalThis.fetch=async(url,options={})=>{
   const u=new URL(url);calls.push(u.pathname);
   if(u.hostname==='api.telegram.org'){
    const method=u.pathname.split('/').at(-1);
    const result={getMe:{id:1},getChat:{type:'channel'},getChatMember:{status:'administrator',can_post_messages:true},sendPhoto:{message_id:77}}[method];
    assert.ok(result,`Unexpected Telegram call ${method}`);
    if(method==='sendPhoto')assert.match(options.body.get('reply_markup'),/download\/continue/);
    return Response.json({ok:true,result});
   }
   assert.equal(u.hostname,'catalog.test');
   return Response.json(u.pathname.endsWith('ttbroken')?{item:{type:'series'},seasons:[],episodes:[]}:
    {item:{type:'movie',title:'Film'},movieFiles:[{quality:'720p',url:'https://sarvnema.ir/download/continue?u=test'}]});
  };
  await runChannel({publish:true});await runChannel({publish:true});
  assert.equal(calls.filter(c=>c.endsWith('/sendPhoto')).length,1);
  const file=(await readdir(dir)).find(f=>/^[a-f0-9]{12}\.json$/.test(f));const state=JSON.parse(await readFile(path.join(dir,file),'utf8'));
  assert.equal(state.posts['vod:bad'].status,'pending');assert.equal(state.posts['vod:good'].status,'sent');
  assert.equal(state.publishedSlots.vod['2026-10-03:10'].messageId,77);
 }finally{globalThis.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key];Object.assign(process.env,originalEnv);t.mock.timers.reset();await rm(dir,{recursive:true,force:true});}
});
