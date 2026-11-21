import type {MusicTrack} from './music-types';
const videoSource=(url:string)=>/\.(?:mp4|mkv|webm|mov|m4v)(?:$|[?#])/i.test(url);
/** Imported kind tags are imperfect. Choose audio and video from actual sources. */
export function albumTracks(tracks:MusicTrack[],kind:'audio'|'video'){
 return tracks.flatMap(track=>{
  const sources=track.sources.filter(s=>s.available!==false&&s.playback!==false&&(kind==='video'?videoSource(s.url):!videoSource(s.url)));
  if(!sources.length||(kind==='audio'&&track.kind==='video'))return [];
  return [{...track,kind:kind==='video'?'video' as const:'track' as const,sources}];
 });
}
