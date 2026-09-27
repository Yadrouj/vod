import test from 'node:test';
import assert from 'node:assert/strict';
import {composePost, discoverPosts, musicFingerprint, postHashtags, selectScheduledEntries} from '../telegram-channel.mjs';
import {publishingSlot, publishingWindow, tehranClock} from '../lib/telegram-publishing-schedule.mjs';
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
 assert.equal(publishingSlot('music',half),'2026-09-27:10:30');
 assert.equal(publishingSlot('vod',last),'2026-09-27:22');
 assert.equal(publishingSlot('music',last),'2026-09-27:22:00');
 assert.equal(publishingWindow(after).vod,null);
 assert.equal(publishingWindow(after).music,null);
});

test('one VOD and one music entry are selected per current slot',()=>{
 const now=Date.parse('2026-09-27T06:30:00Z');
 const state={publishedSlots:{vod:{},music:{}}};
 const pending=[
  {event:{key:'vod:rank-two',type:'vod',imdbCode:'tt2',eventAt:'2026-09-27T06:29:00Z'}},
  {event:{key:'vod:rank-one',type:'vod',imdbCode:'tt1',eventAt:'2026-09-27T06:20:00Z'}},
  {event:{key:'music:new',type:'music',eventAt:'2026-09-27T06:29:00Z'}},
 ];
 const result=selectScheduledEntries(state,pending,now,new Map([['tt1',1],['tt2',2]]));
 assert.deepEqual(result.selected.map(item=>[item.type,item.entry.event.key]),[['vod','vod:rank-one'],['music','music:new']]);
 assert.equal(selectScheduledEntries({...state,publishedSlots:{vod:{'2026-09-27:10':{}} ,music:{}}},pending,now,new Map()).selected.length,1);
});
