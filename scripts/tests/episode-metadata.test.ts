import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,mkdir,writeFile,readFile,rm} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {createEpisodeMetadataLoader,episodeArtworkFallbackUrl,episodeImageFile,episodeImageType,episodeImageUrl,findEpisodeImageSource,isStorableEpisodeImage,parseEpisodeMetadata,readStoredEpisodeImage,storeEpisodeImage} from "../../lib/episode-metadata";
test("episode image identity remains tied to season and episode",()=>{
 const result=parseEpisodeMetadata([{season:1,number:2,name:"Episode two",image:{medium:"https://static.tvmaze.com/uploads/images/a.jpg"}},{season:2,number:2,name:"Another season",image:null},{season:1,number:null}]);
 assert.equal(result.length,2);assert.equal(result[0].episode,2);assert.equal(result[1].season,2);assert.equal(result[1].imageUrl,null);
});
test("upstream failures preserve saved episode pictures across loader restarts",async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),"sarvnema-episodes-"));
 try {
  await mkdir(path.join(root,"public/data/episode-metadata"),{recursive:true});
  const snapshot={checkedAt:"2020-01-01",episodes:[{season:1,episode:1,title:"Pilot",summary:null,imageUrl:"https://static.tvmaze.com/uploads/images/pilot.jpg"},{season:2,episode:1,title:"S2",summary:null,imageUrl:null}]};
  const file=path.join(root,"public/data/episode-metadata/tt0903747.json");await writeFile(file,JSON.stringify(snapshot));
  let calls=0;const offline=(async()=>{calls++;throw new Error("offline");}) as typeof fetch;
  const load=createEpisodeMetadataLoader(root,offline);
  const [one,two]=await Promise.all([load("tt0903747",1),load("tt0903747",2)]);
  assert.equal(one[0].imageUrl,episodeImageUrl("tt0903747",1,1));assert.equal(one[0].imageSource,"tvmaze");assert.equal(two[0].season,2);assert.equal(calls,1);
  assert.equal((await createEpisodeMetadataLoader(root,offline)("tt0903747",1))[0].title,"Pilot");
  assert.deepEqual(JSON.parse(await readFile(file,"utf8")),snapshot);
  assert.deepEqual(await load("../../bad",1),[]);
 } finally {await rm(root,{recursive:true,force:true});}
});
test("custom artwork overrides and series fallback are applied without changing episode identity",async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),"sarvnema-episode-artwork-"));
 try {
  await mkdir(path.join(root,"public/data/episode-metadata"),{recursive:true});
  await writeFile(path.join(root,"public/data/episode-metadata/tt1234567.json"),JSON.stringify({checkedAt:new Date().toISOString(),episodes:[{season:1,episode:1,title:"Pilot",summary:null,imageUrl:null},{season:1,episode:2,title:"Second",summary:null,imageUrl:"https://static.tvmaze.com/uploads/images/second.jpg"}]}));
  await writeFile(path.join(root,"public/data/episode-artwork-overrides.json"),JSON.stringify({tt1234567:{"1:1":{imageUrl:"https://example.com/custom.jpg",imagePosition:"50% 25%",imageFit:"contain"}}}));
  const load=createEpisodeMetadataLoader(root,((async()=>{throw new Error("offline");}) as typeof fetch));
  const episodes=await load("tt1234567",1,{fallbackImage:"https://example.com/series.jpg"});
  assert.equal(episodes[0].imageUrl,"https://example.com/custom.jpg");
  assert.equal(episodes[0].imageSource,"custom");
  assert.equal(episodes[0].imageFit,"contain");
  assert.equal(episodes[1].imageSource,"tvmaze");
  assert.equal(episodes[1].imageUrl,episodeImageUrl("tt1234567",1,2));
 } finally {await rm(root,{recursive:true,force:true});}
});
test("only trusted TVMaze and TMDB stills are mirrored into the image store",()=>{
 assert.equal(isStorableEpisodeImage("https://static.tvmaze.com/uploads/images/medium_landscape/1/2.jpg"),true);
 assert.equal(isStorableEpisodeImage("https://media.themoviedb.org/t/p/w454_and_h254_face/a.jpg"),true);
 assert.equal(isStorableEpisodeImage("https://image.tmdb.org/t/p/w500/a.jpg"),true);
 for (const url of ["http://static.tvmaze.com/a.jpg","https://example.com/a.jpg","https://user:pw@static.tvmaze.com/a.jpg","https://static.tvmaze.com:8443/a.jpg","https://static.tvmaze.com.evil.test/a.jpg","/api/episode-art/tt1/1/1","not a url",null]) assert.equal(isStorableEpisodeImage(url),false,String(url));
});
test("image store paths cannot escape the store or exceed episode ranges",()=>{
 assert.equal(episodeImageFile("/store","tt0903747",2,5),path.join("/store","tt0903747","2-5"));
 for (const [id,season,episode] of [["../etc",1,1],["tt1/../x",1,1],["tt1",1000,1],["tt1",1,-1],["tt1",1.5,1]] as const) assert.equal(episodeImageFile("/store",id,season,episode),null);
});
test("stills are stored once, validated by signature, and never fetched from other hosts",async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),"sarvnema-episode-store-"));
 try {
  const jpeg=new Uint8Array([0xff,0xd8,0xff,0xe0,1,2,3,4]);
  let calls=0;
  const serve=(body:Uint8Array|string,headers:Record<string,string>={})=>(async()=>{calls++;return new Response(typeof body==="string"?body:new Uint8Array(body),{status:200,headers});}) as typeof fetch;
  const file=path.join(root,"tt0903747","1-1");
  const url="https://static.tvmaze.com/uploads/images/a.jpg";
  const [first,second]=await Promise.all([storeEpisodeImage(url,file,serve(jpeg)),storeEpisodeImage(url,file,serve(jpeg))]);
  assert.equal(calls,1);assert.deepEqual(new Uint8Array(first!),jpeg);assert.deepEqual(new Uint8Array(second!),jpeg);
  assert.equal(episodeImageType((await readStoredEpisodeImage(file))!),"image/jpeg");
  const html=path.join(root,"tt0903747","1-2");
  assert.equal(await storeEpisodeImage(url,html,serve("<html>blocked</html>")),null);
  assert.equal(await readStoredEpisodeImage(html),null);
  assert.equal(await storeEpisodeImage(url,path.join(root,"tt0903747","1-3"),serve(jpeg,{"content-length":String(3*1024*1024)})),null);
  calls=0;
  assert.equal(await storeEpisodeImage("https://example.com/a.jpg",path.join(root,"tt0903747","1-4"),serve(jpeg)),null);
  assert.equal(calls,0);
 } finally {await rm(root,{recursive:true,force:true});}
});
test("the image route resolves only saved trusted-provider stills",async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),"sarvnema-episode-source-"));
 try {
  await mkdir(path.join(root,"public/data/episode-metadata"),{recursive:true});
  await writeFile(path.join(root,"public/data/episode-metadata/tt1234567.json"),JSON.stringify({checkedAt:new Date().toISOString(),episodes:[{season:1,episode:1,title:"One",summary:null,imageUrl:"https://static.tvmaze.com/uploads/images/one.jpg"},{season:1,episode:2,title:"Two",summary:null,imageUrl:null},{season:1,episode:3,title:"Three",summary:null,imageUrl:"/api/episode-art/tt1234567/1/3",imageSource:"fallback"}]}));
  assert.equal(await findEpisodeImageSource("tt1234567",1,1,root),"https://static.tvmaze.com/uploads/images/one.jpg");
  assert.equal(await findEpisodeImageSource("tt1234567",1,2,root),null);
  assert.equal(await findEpisodeImageSource("tt1234567",1,3,root),null);
  assert.equal(await findEpisodeImageSource("tt1234567",9,9,root),null);
  assert.equal(await findEpisodeImageSource("../tt1234567",1,1,root),null);
 } finally {await rm(root,{recursive:true,force:true});}
});
test("episodes without upstream stills receive distinct generated artwork",async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),"sarvnema-episode-fallback-"));
 try {
  await mkdir(path.join(root,"public/data/episode-metadata"),{recursive:true});
  await writeFile(path.join(root,"public/data/episode-metadata/tt7654321.json"),JSON.stringify({checkedAt:new Date().toISOString(),episodes:[{season:1,episode:1,title:"One",summary:null,imageUrl:null},{season:1,episode:2,title:"Two",summary:null,imageUrl:null}]}));
  const load=createEpisodeMetadataLoader(root,((async()=>{throw new Error("offline");}) as typeof fetch));
  const episodes=await load("tt7654321",1,{fallbackImage:"https://example.com/poster.jpg"});
  assert.deepEqual(episodes.map(episode=>episode.imageUrl),[episodeArtworkFallbackUrl("tt7654321",1,1),episodeArtworkFallbackUrl("tt7654321",1,2)]);
  assert.equal(new Set(episodes.map(episode=>episode.imageUrl)).size,2);
 } finally {await rm(root,{recursive:true,force:true});}
});
test("repeated upstream rows are reduced to one entry per episode",async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),"sarvnema-episode-dedupe-"));
 try {
  await mkdir(path.join(root,"public/data/episode-metadata"),{recursive:true});
  await writeFile(path.join(root,"public/data/episode-metadata/tt7654321.json"),JSON.stringify({checkedAt:new Date().toISOString(),episodes:[{season:1,episode:1,title:"One",summary:null,imageUrl:null},{season:1,episode:1,title:"One duplicate",summary:null,imageUrl:null},{season:1,episode:2,title:"Two",summary:null,imageUrl:null}]}));
  const load=createEpisodeMetadataLoader(root,((async()=>{throw new Error("offline");}) as typeof fetch));
  const episodes=await load("tt7654321",1);
  assert.deepEqual(episodes.map(episode=>episode.episode),[1,2]);
  assert.equal(new Set(episodes.map(episode=>episode.imageUrl)).size,2);
 } finally {await rm(root,{recursive:true,force:true});}
});
