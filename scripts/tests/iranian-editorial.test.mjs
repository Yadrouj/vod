import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildIranianEditorial} from '../build-iranian-editorial.mjs';
const data=JSON.parse(readFileSync('lib/data/iranian-music-selections.json','utf8'));
test('twenty distinct Iranian collections resolve to actual attributed tracks, not placeholders',()=>{
 assert.equal(data.playlists.length,20);assert.ok(data.tracks.length>=20);
 const tracks=new Map(data.tracks.map(t=>[t.id,t]));assert.equal(tracks.size,data.tracks.length);
 assert.equal(new Set(data.playlists.map(p=>p.id)).size,20);
 const selections=new Set();
 for(const p of data.playlists){assert.ok(p.trackIds.length>0);assert.ok(p.artistCount>0);assert.ok(!selections.has(p.trackIds.slice().sort().join(',')));selections.add(p.trackIds.slice().sort().join(','));for(const id of p.trackIds){const t=tracks.get(id);assert.ok(t,id);assert.ok(t.sourceUrl);assert.ok(t.sources.some(s=>s.available!==false&&new URL(s.url).protocol==='https:'));}}
 for(const id of ['north-road','friendship','northern','kurdish','lori'])assert.ok(data.playlists.some(p=>p.id===`iranian-${id}`));
});
test('regional labels do not classify ordinary Persian verbs or Turkish word fragments as languages',()=>{
 const track=(id,title)=>({id,title,persianTitle:title,kind:'track',category:'آهنگ',artist:{slug:id},artists:[{slug:id}],sources:[{url:'https://example.com/audio.mp3'}]});
 const result=buildIranianEditorial([track('a','چرا فکر کردی'),track('b','گوزلری قاره'),track('c','آهنگ کردی شادی'),track('d','دار و ندارم (ریمیکس لری)')]);
 assert.deepEqual(result.playlists.find(p=>p.id==='iranian-kurdish').trackIds,['c']);
 assert.deepEqual(result.playlists.find(p=>p.id==='iranian-lori').trackIds,['d']);
});
