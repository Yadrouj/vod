import test from 'node:test';
import assert from 'node:assert/strict';
import {albumTracks} from '../../lib/album-library';
import type {MusicTrack} from '../../lib/music-types';
const track=(id:string,urls:string[],kind:MusicTrack['kind']='track')=>({id,kind,title:id,persianTitle:id,artist:{slug:'artist',name:'Artist',sourceUrl:'https://example.com'},artists:[],category:'Music',sources:urls.map(url=>({url,label:'Test source',kind:'stream' as const,available:true})),coverUrl:null,description:null,sourceUrl:'https://example.com',publishedAt:null,folder:{root:'Music' as const,year:null,month:null,day:null}});
test('album playback excludes mislabeled video files and preserves audio qualities',()=>{
 const all=[track('video-tagged-as-track',['https://example.com/a.mp4']),track('mixed',['https://example.com/a.mkv','https://example.com/a.mp3','https://example.com/a.m4a']),track('actual-video',['https://example.com/a.mp4'],'video')];
 const audio=albumTracks(all,'audio');assert.deepEqual(audio.map(t=>t.id),['mixed']);assert.equal(audio[0].sources.length,2);
 assert.equal(albumTracks(all,'video').length,3);assert.equal(all[1].sources.length,3,'input remains immutable');
});
