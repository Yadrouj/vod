import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import {identityKey,matchingArtistSlugs,findRecordingMatch} from '../../lib/creator-identities.mjs';
import {findSingerProfile,singerAsArtist,singerRecordings,tracksForSinger} from '../../lib/creator-profiles';
import {artistJsonLd,artistMetadata} from '../../lib/seo';
import {directors,singers} from '../../content/creators/selections.mjs';
import type {CreatorProfiles,SingerProfile} from '../../lib/creator-profile-types';
import type {MusicArtistIndex,MusicTrack} from '../../lib/music-types';

const require=createRequire(import.meta.url);
require.extensions['.css']=module=>{module.exports={};};
const {SingerRecordings}=require('../../components/singer-recordings.tsx') as typeof import('../../components/singer-recordings');

const data=JSON.parse(readFileSync('public/data/creator-profiles.json','utf8')) as CreatorProfiles;
test('two editorial selections contain exactly 100 distinct verified people each',()=>{
  assert.equal(directors.length,100);assert.equal(singers.length,100);
  for(const list of [data.directors,data.singers]){
    assert.equal(list.length,100);assert.equal(new Set(list.map(p=>p.wikidataId)).size,100);
    for(const p of list){assert.match(p.wikidataId,/^Q\d+$/);if(p.imageUrl){assert.match(p.imageUrl,/^https:\/\//);assert.ok(p.imageCredit);}assert.ok(p.focusFa.length>45);assert.ok(p.biographyEn.length>40);assert.ok(p.sources.length>=2);assert.equal(new Set(p.sources.map(source=>source.url)).size,p.sources.length);}
  }
  assert.equal(new Set(data.directors.map(p=>p.id)).size,100);
  assert.equal(new Set(data.singers.map(p=>p.slug)).size,100);
});
test('all director links are real archive titles and directing credits are a subset',()=>{
  const map=JSON.parse(readFileSync('public/data/title-map.json','utf8'));
  for(const p of data.directors){
    const works=new Set(p.works.map(w=>w.imdbCode));assert.equal(works.size,p.works.length);
    for(const id of works) assert.ok(map[id],`${p.name}: ${id}`);
    for(const id of p.directedIds) assert.ok(works.has(id));
  }
  const nolan=data.directors.find(p=>p.name==='Christopher Nolan')!;
  assert.ok(nolan.directedIds.includes('tt1375666'));
  assert.ok(!nolan.directedIds.includes('tt30036660'),'An awards appearance is not a directed work');
});
test('all 100 singers have attributed recording references with real covers and release links',()=>{
  for(const profile of data.singers){
    assert.ok(profile.recordings.length>=1 && profile.recordings.length<=12,profile.name);
    const titles=new Set<string>();
    for(const recording of profile.recordings){
      assert.ok(recording.title.trim());assert.ok(!titles.has(recording.title));titles.add(recording.title);
      assert.match(recording.coverUrl,/^https:\/\//);assert.equal(new URL(recording.sourceUrl).hostname,'music.apple.com');
      assert.match(recording.artistId,/^\d+$/);
    }
  }
});
test('artist matching is exact, Unicode-aware and cannot absorb unrelated short-name artists',()=>{
  assert.equal(identityKey('Beyoncé'),identityKey('Beyonce'));
  assert.equal(identityKey('محمدرضا شجريان'),identityKey('محمدرضا شجریان'));
  const matches=matchingArtistSlugs([{name:'Ebi',slug:'ebi'},{name:'Ebi Be hboudi',slug:'ebi-behboudi'},{name:'Ebi Tribute',slug:'ebi-tribute'}],{name:'Ebi',nameFa:'ابی',aliases:[]});
  assert.deepEqual(matches,['ebi']);
});
test('recording matches require the whole title, not a shared word or substring',()=>{
  const tracks=[{id:'wrong',title:'House of the Rising Sun'},{id:'right',title:'Respect (Remastered)'}];
  assert.equal(findRecordingMatch({title:'Sun'},tracks),null);
  assert.equal(findRecordingMatch({title:'Respect'},tracks)?.id,'right');
});
test('singer profiles resolve canonical and legacy archive aliases',()=>{
  const p=data.singers.find(p=>p.name==='Googoosh')!;
  assert.equal(findSingerProfile(data,p.slug)?.wikidataId,p.wikidataId);
  assert.equal(findSingerProfile(data,'full-googoosh')?.wikidataId,p.wikidataId);
  assert.equal(findSingerProfile(data,'googoosh-tribute'),null);
});
test('dynamic matching deduplicates aliases and never retains deleted archive availability',()=>{
  const profile={name:'Example Singer',nameFa:'خواننده',slug:'example-singer',aliases:['old-name'],artistSlugs:['old-name'],recordings:[{title:'My Song',archiveTrackId:'removed'}]} as SingerProfile;
  const track={id:'current',title:'My Song',persianTitle:'My Song',sources:[{url:'https://example.org/music.mp3'}],artists:[{slug:'old-name'}],album:undefined} as MusicTrack;
  const index={artists:[{name:'Example Singer',slug:'old-name',aliases:[],trackIds:['current']}],tracks:[track],artistTrackIds:{'old-name':['current','current','removed']}} as unknown as MusicArtistIndex;
  assert.deepEqual(tracksForSinger(index,profile).map(t=>t.id),['current']);
  assert.equal(singerRecordings(profile,[])[0].archiveTrackId,null);
  assert.equal(singerRecordings(profile,[track])[0].archiveTrackId,'current');
});
test('missing recordings expose title/cover/source but no internal playback or download control',()=>{
  const html=renderToStaticMarkup(<SingerRecordings recordings={[{title:'Missing Song',album:'Album',coverUrl:'https://example.org/cover.jpg',sourceUrl:'https://music.apple.com/us/album/example/123?i=456',artistName:'Example',artistId:'123',releasedAt:null,archiveTrackId:null}]} />);
  assert.ok(html.includes('Missing Song')&&html.includes('cover.jpg'));
  assert.ok(html.includes('data-recording-availability="missing"'));
  assert.ok(!html.includes('href="/music/')&&!html.includes('<button')&&!html.includes('<audio'));
});
test('zero-track singer metadata makes no download promise; individuals and bands have different schema',()=>{
  const p=data.singers[0];const artist=singerAsArtist(p,[]);
  assert.ok(!String(artistMetadata(artist,0).title).includes('دانلود'));
  const person=artistJsonLd(artist,0,true)['@graph'].find(node=>'mainEntity' in node);
  const band=artistJsonLd(artist,0)['@graph'].find(node=>'mainEntity' in node);
  assert.ok(person && 'mainEntity' in person);assert.ok(band && 'mainEntity' in band);
  assert.equal(person.mainEntity['@type'],'Person');assert.equal(band.mainEntity['@type'],'MusicGroup');
});
