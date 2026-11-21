import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const normal=s=>String(s||'').normalize('NFKC').replace(/[يى]/g,'ی').replace(/ك/g,'ک').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const decode=s=>String(s||'').replace(/&amp;/g,'&').replace(/&#0*39;/g,"'").replace(/&quot;/g,'"');
export function musicdelRecording(html){
 for(const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)){
  try{const page=JSON.parse(m[1]);if(page.audio?.['@type']==='MusicRecording'&&page.audio.audio?.contentUrl)return {page,recording:page.audio};}catch{}
 }
 return null;
}
export function recordingSources(html,primary){
 const stem=u=>decodeURIComponent(new URL(u).pathname).replace(/(?:[- ](?:128|64))?\.mp3$/i,'').replace(/\s+/g,' ');
 return [...new Set([primary,...html.matchAll(/https:\/\/dl\.musicdel\.ir\/[^"'<>\s]+\.mp3/gi)].map(x=>typeof x==='string'?x:x[0]))].filter(u=>{try{return stem(u)===stem(primary);}catch{return false;}});
}
async function reachable(url){
 try{const r=await fetch(url,{headers:{Range:'bytes=0-2047'},signal:AbortSignal.timeout(15000)});const type=r.headers.get('content-type')||'';await r.body?.cancel();return [200,206].includes(r.status)&&!type.includes('text/html');}catch{return false;}
}
async function main(){
 const archive=JSON.parse(await readFile('public/data/music-index.json','utf8')),observedAt=new Date().toISOString();
 const names=new Map(archive.artists.flatMap(a=>[a.name,...a.aliases||[]].map(name=>[normal(name),a])));
 const seeds=[
  ['543624','محمد معتمدی','fa'],['654158',null,'remix'],['652159',null,'fa'],['547305',null,'fa'],['651496',null,'remix'],['651476',null,'fa'],
  ['649296','وحید آرامشیان','remix'],['86724','مهدی جهانی','remix'],['650407',null,'tr'],['649286',null,'tr'],['649109',null,'tr'],['648804',null,'tr'],
 ];
 const tracks=[],artists=new Map(),newTrackIds=[],audit=[];
 await mkdir('.media-cache/musicdel',{recursive:true});
 async function add({id,title,artist,cover,sourceUrl,urls,publishedAt,category,moods=[]}){
  if(!title||!artist)return;
  const ref=names.get(normal(artist))||{name:artist,slug:artist==='الهه'?'elaheh':artist==='محمد معتمدی'?'mohammad-motamedi':artist.replace(/\s+/g,'-'),sourceUrl};
  const sources=[];
  for(const url of urls){if(!await reachable(url))continue;sources.push({url,label:sourceUrl.includes('musicdel.ir')?'موزیکدل · لینک ناشر':'سهند موزیک · لینک ناشر',kind:'stream',provider:sourceUrl.includes('musicdel.ir')?'musicdel':'sahand-music',quality:/[ -]128\.mp3$/i.test(decodeURIComponent(url))?'128 kbps':/[ -]64\.mp3$/i.test(decodeURIComponent(url))?'64 kbps':sourceUrl.includes('musicdel.ir')?'320 kbps':null,available:true,checkedAt:observedAt,sourcePageUrl:sourceUrl});}
  if(!sources.length){audit.push({id,state:'unavailable'});return;}
  const cleanTitle=t=>normal(t).replace(normal(ref.name),'').replace(/^دانلود(?:آهنگ|اهنگ|موزیک)?(?:جدید)?/u,'');
  const exact=archive.tracks.filter(t=>t.kind==='track'&&(t.artist?.slug===ref.slug||t.artists?.some(a=>a.slug===ref.slug))&&[t.title,t.persianTitle].some(s=>cleanTitle(s)===normal(title)));
  const media=archive.tracks.filter(t=>t.sources.some(s=>sources.some(next=>s.url===next.url)));
  const previous=media.length===1?media[0]:exact.length===1?exact[0]:null;
  const canonical=previous?.id||id;
  const track={id:canonical,...(previous&&previous.id!==id?{idAliases:[id]}:{}),kind:'track',title,persianTitle:title,artist:{slug:ref.slug,name:ref.name,sourceUrl:ref.sourceUrl||sourceUrl},artists:[{slug:ref.slug,name:ref.name,sourceUrl:ref.sourceUrl||sourceUrl}],coverUrl:cover,description:null,sourceUrl,publishedAt:publishedAt||null,addedAt:observedAt,category,moods,folder:{root:'Music',year:null,month:null,day:null},sources};
  tracks.push(track);if(!previous)newTrackIds.push(id);
  artists.set(ref.slug,{...ref,coverUrl:ref.coverUrl||cover,trackIds:[...new Set([...(ref.trackIds||[]),canonical])],categories:[...new Set([...(ref.categories||[]),category])]});
  audit.push({id,canonical,state:'verified',sources:sources.length});
 }
 for(const[id,artistHint,kind]of seeds){
  const url=`https://musicdel.ir/single-tracks/${id}/`;
  try{const html=await(await fetch(url,{signal:AbortSignal.timeout(20000)})).text();await writeFile(`.media-cache/musicdel/${id}.html`,html);
   const data=musicdelRecording(html);if(!data){audit.push({id,state:'no-public-primary-recording'});continue;}
   const {page,recording:r}=data;
   const artist=artistHint||r.keywords||r.byArtist?.name;
   if(!artist||/تمام اجراها|ناشناس|نامشخص/.test(artist)){audit.push({id,state:'artist-not-verified'});continue;}
   await add({id:`musicdel-${id}`,title:r.name,artist,cover:page.primaryImageOfPage,sourceUrl:url,urls:recordingSources(html,r.audio.contentUrl),publishedAt:page.datePublished,category:kind==='tr'?'موسیقی ترکی':kind==='remix'&&/remix|ریمیکس/i.test(r.name+' '+decodeURIComponent(r.audio.contentUrl))?'ریمیکس':'موسیقی فارسی',moods:kind==='tr'?['ترکی']:[]});
  }catch{audit.push({id,state:'fetch-failed'});}
 }
 const elahehUrl='https://sahand-music.ir/88772/22/08/2025/دانلود-آهنگ-خداحافظ-ای-جوانی-من-از-الهه/';
 const elaheh=await(await fetch(elahehUrl,{signal:AbortSignal.timeout(20000)})).text();
 const urls=[...new Set(elaheh.match(/https:\/\/xx\.sahand-music\.ir\/[^"'<>\s]+\.mp3/gi))];
 await add({id:'sahand-elaheh-khodahafez-javani',title:'خداحافظ ای جوانی من',artist:'الهه',cover:'https://sahand-music.ir/photos/2025/08/88772.webp',sourceUrl:elahehUrl,urls,publishedAt:null,category:'موسیقی قدیمی فارسی',moods:['نوستالژی']});
 const featured=['musicdel-543624','sahand-elaheh-khodahafez-javani'].map(id=>tracks.find(t=>t.id===id||t.idAliases?.includes(id))?.id).filter(Boolean);
 if(featured.length!==2)throw Error('Both requested recordings must be verified before publishing the bundle.');
 const bundle={observedAt,tracks,newTrackIds,artists:[...artists.values()],featuredTrackIds:featured};
 await writeFile('lib/data/musicdel-selections.json',JSON.stringify(bundle));await writeFile('.media-cache/musicdel/import-report.json',JSON.stringify(audit,null,2));
 console.log(JSON.stringify({verifiedTracks:tracks.length,featured,audit}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
