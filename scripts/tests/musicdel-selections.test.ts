import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../../lib/data/musicdel-selections.json';
import {musicdelRecording,recordingSources} from '../import-musicdel-selections.mjs';
import {applyMusicReleaseBundle,type MusicReleaseBundle} from '../../lib/bundled-music-release';
import type {MusicIndex} from '../../lib/music-types';
test('the requested recordings remain two performances, with verified sources and no copied lyrics or comments',()=>{
 assert.equal(data.featuredTrackIds.length,2);
 const featured=data.featuredTrackIds.map(id=>data.tracks.find(t=>t.id===id)!);
 assert.deepEqual(featured.map(t=>t.artist.name),['محمد معتمدی','الهه']);
 assert.ok(featured.every(t=>t.title==='خداحافظ ای جوانی من'));
 assert.ok(data.tracks.length>=10);assert.equal(new Set(data.tracks.map(t=>t.id)).size,data.tracks.length);
 for(const t of data.tracks){assert.ok(t.coverUrl);assert.equal(t.description,null);assert.ok(t.sources.length>0);for(const s of t.sources){const url=new URL(s.url);assert.equal(url.protocol,'https:');assert.equal(url.username,'');assert.equal(s.available,true);assert.ok(Number.isFinite(Date.parse(s.checkedAt)));assert.ok(s.sourcePageUrl);}}
 assert.ok(data.tracks.filter(t=>t.category==='موسیقی ترکی').length>=4);
 assert.ok(data.tracks.filter(t=>t.category==='ریمیکس').length>=2);
 assert.ok(!JSON.stringify(data.tracks).includes('lyrics'));
});
test('primary recording extraction does not mix alternative performers or sidebar songs into qualities',()=>{
 const primary='https://dl.musicdel.ir/Music/Artist-Song.mp3';
 const html='<a href="https://dl.musicdel.ir/Music/Artist-Song%20128.mp3">128</a><a href="https://dl.musicdel.ir/Music/Other-Artist-Song.mp3">other performance</a>';
 assert.deepEqual(recordingSources(html,primary),[primary,'https://dl.musicdel.ir/Music/Artist-Song%20128.mp3']);
 assert.equal(musicdelRecording('<script type="application/ld+json">{"@type":"WebPage"}</script>'),null);
});
test('a checked publisher bundle is idempotent and does not discard existing archives',()=>{
 const bundle=data as unknown as MusicReleaseBundle;
 const base:MusicIndex={version:1,source:'multi-source',updatedAt:'2026-01-01T00:00:00Z',scanned:{musicPages:0,videoPages:0,full:false},tracks:[],artists:[],categories:[]};
 const result=applyMusicReleaseBundle(base,bundle),again=applyMusicReleaseBundle(result,bundle);
 assert.equal(result.tracks.length,13);assert.equal(again,result);assert.equal(base.tracks.length,0);
 assert.ok(result.artists.some(a=>a.trackIds.includes(data.featuredTrackIds[0])));
});
