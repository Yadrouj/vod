import data from './data/musicdel-selections.json';
import type {MusicReleaseBundle} from './bundled-music-release';
import type {MusicTrack} from './music-types';
import type {MoodPlaylist} from './mood-playlists';
export const musicdelRelease=data as unknown as MusicReleaseBundle;
export const selectedPublisherTracks=data.tracks as unknown as MusicTrack[];
export const requestedMusicIds=data.featuredTrackIds;
export const requestedMusic= requestedMusicIds.flatMap(id=>selectedPublisherTracks.filter(t=>t.id===id));
export const publisherMusicCollections:MoodPlaylist[]=[['remixes','ریمیکس‌های تازهٔ موزیکدل','ریمیکس'],['turkish','انتخاب‌های ترکی موزیکدل','موسیقی ترکی']].map(([id,title,category])=>{
 const tracks=selectedPublisherTracks.filter(t=>t.category===category);
 return {id:'musicdel-'+id,title,scope:id==='turkish'?'turkish':'persian',mood:id,description:'انتخاب از لینک‌های عمومی ناشر؛ تازه‌اضافه‌شده به سرونما، نه الزاماً انتشار تازهٔ همهٔ اجراها.',trackIds:tracks.map(t=>t.id),covers:[...new Set(tracks.flatMap(t=>t.coverUrl?[t.coverUrl]:[]))].slice(0,4),artistCount:new Set(tracks.map(t=>t.artist.slug)).size,updatedAt:data.observedAt,selection:'publisher-curated',publisher:{name:'موزیکدل',url:'https://musicdel.ir/'}};
});
