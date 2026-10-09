import test from 'node:test';
import assert from 'node:assert/strict';
import { contentRestriction, restrictionMessage, restrictionUrl } from '../../lib/content-restrictions.mjs';
import { restrictCatalogItem } from '../../lib/restricted-catalog';
import { buildSeasonSummaries, movieDownloadSources, parseSeasonEpisode } from '../../lib/downloads';
import type { VodItem } from '../../lib/types';
import { openPublicMedia, sendDeliveryFile } from '../telegram-file-delivery.mjs';

const source = 'https://media.example/Series/Paris.Has.Fallen/S01/Paris.Has.Fallen.S01E01.720p.mkv';
const item: VodItem = { id: 'source-123', imdbCode: 'tt33184638', title: 'Paris Has Fallen', type: 'tvSeries', year: 2024, imdbUrl: null,
 imdbRating: 6.4, imdbVotes: 100, groups: ['HardSub'], qualities: ['720p'], sourcePageUrl: 'https://example.test/paris-has-fallen/',
 links: [{ label: 'S01E01 / 720p', url: source, fileName: 'Paris.Has.Fallen.S01E01.720p.mkv', season: 1, episode: 1, quality: '720p', group: 'HardSub', release: 'WEB-DL', size: '500 MB', sourceUrl: source, sourceOriginalUrl: source, sourceBaseId: 'base', sourceRelativePath: 'path' }] };

test('the title, its aliases and old plain/encoded download links are restricted',()=>{
 for(const value of ['tt33184638', 'TT33184638', {imdbCode:'tt33184638'}, {itemId:'tt33184638'}, {title:'Paris Has Fallen · S01E03'},source,
  `/download/continue?url=${encodeURIComponent(source)}`,
  `/download/continue?u=${Buffer.from(source).toString('base64url')}`,
  {source:{url:source}}, {sources:[{url:source}]}, restrictionUrl()])assert.equal(contentRestriction(value),'tt33184638');
 for(const value of ['tt33184639','tt331846380','London Has Fallen', 'Paris', null, {title:'Breaking Bad',url:'https://example.test/other.mp4'}])assert.equal(contentRestriction(value),null);
 assert.match(restrictionMessage('en'),/complaint forwarded by Cloudflare/);assert.match(restrictionMessage('fa'),/Cloudflare/);
});

test('catalog restrictions preserve the page data, episode identities and version metadata, without original URLs',()=>{
 const restricted=restrictCatalogItem(item);
 assert.equal(restricted.title,item.title);assert.equal(restricted.imdbRating,item.imdbRating);assert.deepEqual(restricted.qualities,item.qualities);
 assert.deepEqual(buildSeasonSummaries(restricted.links),buildSeasonSummaries(item.links));
 assert.deepEqual(parseSeasonEpisode(restricted.links[0].url),{season:1,episode:1});
 const file=movieDownloadSources(restricted.links)[0];
 assert.equal(file.quality,'720p');assert.equal(file.group,'HardSub');assert.equal(file.size,'500 MB');assert.equal(file.sourceHost,'media.example');
 assert.equal(new URL(file.url).pathname,'/download/continue');assert.equal(new URL(file.url).searchParams.get('restricted'),'tt33184638');
 assert.doesNotMatch(JSON.stringify(restricted),/https:\/\/media\.example/);
 assert.equal(item.links[0].url,source);assert.equal(restrictCatalogItem({...item,imdbCode:'tt0903747',title:'Breaking Bad'}).title,'Breaking Bad');
 const allowed={...item,imdbCode:'tt0903747',title:'Breaking Bad',links:[]};assert.equal(restrictCatalogItem(allowed),allowed);
 // New scraper data is still subject to the same code-owned policy.
 assert.equal(new URL(restrictCatalogItem({...item,links:[{...item.links[0],url:'https://new-source.example/other.mkv'}]}).links[0].url).searchParams.get('restricted'),'tt33184638');
});

test('old Telegram deliveries are blocked before opening any source or uploading a file',async()=>{
 await assert.rejects(openPublicMedia(source,new AbortController().signal),/content_restricted/);
 let opened=false;
 await assert.rejects(sendDeliveryFile({sourceUrl:source,title:item.title},{telegram:'unused',maxBytes:100,openSource:async()=>{opened=true;throw new Error('must not open')},sendFetch:async()=>{throw new Error('must not send')}}),/content_restricted/);
 assert.equal(opened,false);
});
