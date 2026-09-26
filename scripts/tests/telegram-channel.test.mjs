import test from 'node:test';
import assert from 'node:assert/strict';
import {composePost, discoverPosts, musicFingerprint, postHashtags} from '../telegram-channel.mjs';
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
