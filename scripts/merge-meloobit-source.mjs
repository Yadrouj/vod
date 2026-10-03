import { readFile, writeFile, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { mergeMeloobitTracks } from './meloobit-source.mjs';
import { buildArtists } from './music-catalog.mjs';

export function mergeMeloobitIndex(index, source) {
  const tracks = mergeMeloobitTracks(index.tracks, source.tracks).sort((a,b)=>String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')) || a.id.localeCompare(b.id));
  const profiles=new Map(index.artists.map(a=>[a.slug,a]));
  const artists=buildArtists(tracks).map(a=>{
    const old=profiles.get(a.slug);
    return old ? {...old,...a,sourceUrl:old.sourceUrl || a.sourceUrl,profileSourceUrl:old.profileSourceUrl || a.profileSourceUrl,
      profileImageUrl:old.profileImageUrl || a.profileImageUrl,bio:old.bio || a.bio,aliases:[...new Set([...(old.aliases ?? []),...(a.aliases ?? [])])]} : a;
  });
  const categoryCounts={};
  for(const t of tracks)for(const tag of new Set([t.category,...(t.moods ?? [])].filter(Boolean)))categoryCounts[tag]=(categoryCounts[tag] || 0)+1;
  return {...index,updatedAt:new Date().toISOString(),tracks,artists,categories:Object.keys(categoryCounts).sort((a,b)=>a.localeCompare(b,'fa')),categoryCounts};
}
async function main(){
  const file='public/data/music-index.json',sourceFile=`${process.env.MELOOBIT_STATE_DIR || '.media-cache/music'}/meloobit-source.json`;
  const index=JSON.parse(await readFile(file,'utf8')),source=JSON.parse(await readFile(sourceFile,'utf8'));
  const next=mergeMeloobitIndex(index,source);
  const temporary=`${file}.${process.pid}.tmp`;await writeFile(temporary,JSON.stringify(next));await rename(temporary,file);
  console.log(JSON.stringify({tracks:next.tracks.length,newTracks:next.tracks.length-index.tracks.length,meloobitTracks:next.tracks.filter(t=>t.sources.some(s=>s.provider==='meloobit')).length,artists:next.artists.length}));
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error);process.exitCode=1;});
